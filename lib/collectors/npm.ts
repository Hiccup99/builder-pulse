import { createServerClient } from '@/lib/supabase/server'

// Fewer keywords, smaller result set per keyword — keeps total packages ~40-50
const SEARCH_KEYWORDS = [
  'framework', 'cli', 'bundler', 'AI agent', 'LLM',
  'typescript', 'testing', 'serverless', 'database',
]

const NPM_SEARCH_URL = 'https://registry.npmjs.org/-/v1/search'
const NPM_DOWNLOADS_URL = 'https://api.npmjs.org/downloads/point/last-week'

interface NpmSearchResult {
  objects: Array<{
    package: {
      name: string
      description?: string
      links?: { npm?: string; homepage?: string; repository?: string }
      author?: { name?: string }
      date: string
    }
  }>
}

interface NpmBulkDownloads {
  [pkg: string]: { downloads: number } | null
}

async function searchKeyword(keyword: string): Promise<NpmSearchResult['objects']> {
  try {
    const res = await fetch(
      `${NPM_SEARCH_URL}?text=${encodeURIComponent(keyword)}&size=5&quality=0.5&popularity=0.5`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return []
    const data = (await res.json()) as NpmSearchResult
    return data.objects ?? []
  } catch {
    return []
  }
}

async function fetchBulkDownloads(pkgNames: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  if (pkgNames.length === 0) return result

  // npm bulk endpoint accepts comma-separated names, max 128
  const chunks: string[][] = []
  for (let i = 0; i < pkgNames.length; i += 100) {
    chunks.push(pkgNames.slice(i, i + 100))
  }

  for (const chunk of chunks) {
    try {
      const res = await fetch(`${NPM_DOWNLOADS_URL}/${chunk.join(',')}`, {
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) continue
      const data = (await res.json()) as NpmBulkDownloads
      for (const [name, info] of Object.entries(data)) {
        result.set(name, info?.downloads ?? 0)
      }
    } catch {
      // skip chunk on error
    }
  }

  return result
}

export async function runNpmCollector(): Promise<{ upserted: number }> {
  const supabase = createServerClient()

  // 1. Run all keyword searches in parallel
  const results = await Promise.all(SEARCH_KEYWORDS.map(searchKeyword))

  // 2. Deduplicate packages
  const seen = new Set<string>()
  const packages: NpmSearchResult['objects'][number]['package'][] = []
  for (const objects of results) {
    for (const obj of objects) {
      if (!seen.has(obj.package.name)) {
        seen.add(obj.package.name)
        packages.push(obj.package)
      }
    }
  }

  if (packages.length === 0) return { upserted: 0 }

  // 3. Fetch all download counts in one bulk request
  const downloadMap = await fetchBulkDownloads(packages.map((p) => p.name))

  // 4. Batch upsert all posts
  const postRows = packages.map((pkg) => ({
    title: pkg.name,
    url: pkg.links?.repository ?? pkg.links?.homepage ?? pkg.links?.npm ?? `https://www.npmjs.com/package/${pkg.name}`,
    platform: 'npm' as const,
    author: pkg.author?.name ?? null,
    description: pkg.description ?? null,
    published_at: pkg.date,
    type: 'package' as const,
    external_id: `npm:${pkg.name}`,
  }))

  const { data: upsertedPosts, error } = await supabase
    .from('posts')
    .upsert(postRows, { onConflict: 'external_id' })
    .select('id, external_id')

  if (error || !upsertedPosts) {
    console.error('[npm] batch upsert error:', error)
    return { upserted: 0 }
  }

  // 5. Batch insert metrics
  const metricsRows = upsertedPosts.map((post) => {
    const pkgName = post.external_id?.replace('npm:', '') ?? ''
    const downloads = downloadMap.get(pkgName) ?? 0
    return {
      post_id: post.id,
      downloads_weekly: downloads,
      download_growth: 0,
      upvotes: 0,
      stars: 0,
      comments: 0,
      score: 0,
    }
  })

  if (metricsRows.length > 0) {
    const { error: metricsError } = await supabase.from('metrics_history').insert(metricsRows)
    if (metricsError) {
      console.error('[npm] metrics insert error:', metricsError)
    }
  }

  console.log(`[npm] upserted ${upsertedPosts.length} packages`)
  return { upserted: upsertedPosts.length }
}
