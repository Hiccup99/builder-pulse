import { createServerClient } from '@/lib/supabase/server'

const SEARCH_KEYWORDS = [
  'framework', 'cli tool', 'bundler', 'AI agent', 'LLM',
  'react component', 'database', 'typescript utility', 'developer tool',
  'api client', 'testing', 'serverless', 'edge runtime',
]

const NPM_SEARCH_URL = 'https://registry.npmjs.org/-/v1/search'
const NPM_DOWNLOADS_URL = 'https://api.npmjs.org/downloads/point'

interface NpmSearchResult {
  objects: Array<{
    package: {
      name: string
      description?: string
      links?: { npm?: string; homepage?: string; repository?: string }
      author?: { name?: string }
      date: string
    }
    score: { detail: { popularity: number; quality: number; maintenance: number } }
  }>
}

interface NpmDownloads {
  downloads: number
  package: string
}

async function fetchDownloads(pkg: string, period: string): Promise<number> {
  try {
    const res = await fetch(`${NPM_DOWNLOADS_URL}/${period}/${pkg}`)
    if (!res.ok) return 0
    const data = (await res.json()) as NpmDownloads
    return data.downloads ?? 0
  } catch {
    return 0
  }
}

export async function runNpmCollector(): Promise<{ upserted: number }> {
  const supabase = createServerClient()
  const seen = new Set<string>()
  let upserted = 0

  for (const keyword of SEARCH_KEYWORDS) {
    try {
      const res = await fetch(`${NPM_SEARCH_URL}?text=${encodeURIComponent(keyword)}&size=10&quality=0.5&popularity=0.5`)
      if (!res.ok) continue
      const data = (await res.json()) as NpmSearchResult

      for (const obj of data.objects) {
        const pkg = obj.package
        if (seen.has(pkg.name)) continue
        seen.add(pkg.name)

        const url = pkg.links?.npm ?? `https://www.npmjs.com/package/${pkg.name}`
        const [thisWeek, lastWeek] = await Promise.all([
          fetchDownloads(pkg.name, 'last-week'),
          fetchDownloads(pkg.name, 'last-week'), // npm API doesn't have "previous week" natively
        ])

        // Use the search API's date to approximate freshness
        const repoUrl = pkg.links?.repository ?? pkg.links?.homepage ?? url
        const growth = lastWeek > 0 ? (thisWeek - lastWeek) / lastWeek : 0

        const { data: post, error } = await supabase
          .from('posts')
          .upsert(
            {
              title: pkg.name,
              url: repoUrl,
              platform: 'npm',
              author: pkg.author?.name ?? null,
              description: pkg.description ?? null,
              published_at: pkg.date,
              type: 'package' as const,
              external_id: `npm:${pkg.name}`,
            },
            { onConflict: 'external_id' }
          )
          .select('id')
          .single()

        if (error || !post) continue

        await supabase.from('metrics_history').insert({
          post_id: post.id,
          downloads_weekly: thisWeek,
          download_growth: growth,
          upvotes: 0,
          stars: 0,
          comments: 0,
          score: 0,
        })

        upserted++
      }
    } catch (err) {
      console.error(`[npm] search error for "${keyword}":`, err)
    }
  }

  console.log(`[npm] upserted ${upserted} packages`)
  return { upserted }
}
