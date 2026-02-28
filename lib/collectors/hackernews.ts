import { createServerClient } from '@/lib/supabase/server'

interface HNItem {
  id: number
  title?: string
  url?: string
  by?: string
  text?: string
  score?: number
  descendants?: number
  time?: number
  type?: string
}

// ─── Configurable signal lists ────────────────────────────────────────────────

const BUILDER_KEYWORDS = [
  // Prefixes / patterns
  'show hn',
  // Languages & runtimes
  'typescript', 'javascript', 'python', 'rust', 'golang', 'go ', 'wasm', 'webassembly',
  'c++', 'zig', 'elixir', 'swift', 'kotlin',
  // AI / ML
  'llm', 'gpt', 'ai ', 'ml ', 'machine learning', 'deep learning', 'embedding', 'vector',
  'diffusion', 'transformer', 'inference', 'fine-tun', 'rag', 'agent', 'copilot',
  // Infra & tooling
  'api', 'sdk', 'framework', 'library', 'open source', 'github', 'git ',
  'database', 'postgres', 'sqlite', 'redis', 'mysql', 'supabase', 'neon',
  'docker', 'kubernetes', 'k8s', 'wasm', 'serverless', 'edge function',
  'terraform', 'pulumi', 'infra', 'devops', 'ci/cd', 'monorepo',
  // Frontend / backend
  'react', 'next.js', 'nextjs', 'svelte', 'vue', 'astro', 'remix',
  'graphql', 'rest api', 'grpc', 'websocket', 'backend', 'frontend',
  'full stack', 'fullstack',
  // Dev tooling
  'compiler', 'runtime', 'cli ', 'debugger', 'linter', 'formatter', 'bundler',
  'vite', 'webpack', 'esbuild', 'rollup',
  // General builder terms
  'developer', 'open-source', 'self-hosted', 'self hosted', 'deployment',
  'performance', 'benchmark', 'latency', 'throughput',
]

// Posts whose title contains any of these are always excluded
const EXCLUDE_KEYWORDS = [
  'israel', 'iran', 'ukraine', 'russia', 'gaza', 'hamas', 'hezbollah',
  'trump', 'biden', 'harris', 'musk', 'election', 'congress', 'senate',
  'nato', 'war ', 'geopolit', 'sanctions',
  'stock market', 'stock price', 's&p', 'nasdaq', 'dow jones',
  'hedge fund', 'ipo ', 'quarterly earnings', 'wall street',
  'climate change', 'global warming',
  'covid', 'pandemic', 'vaccine',
  'celebrity', 'oscar', 'grammy', 'nba ', 'nfl ', 'soccer', 'football',
]

// Posts from these domains are always excluded (news / media sites)
const BLOCKED_DOMAINS = [
  'nytimes.com', 'cnn.com', 'bbc.com', 'bbc.co.uk', 'reuters.com',
  'foxnews.com', 'aljazeera.com', 'theguardian.com', 'washingtonpost.com',
  'politico.com', 'thehill.com', 'bloomberg.com', 'businessinsider.com',
  'cnbc.com', 'wsj.com', 'ft.com', 'economist.com', 'apnews.com',
  'usatoday.com', 'nbcnews.com', 'abcnews.go.com', 'cbsnews.com',
]

// Posts from these domains or with these title patterns get a score boost
const BOOST_DOMAINS = ['github.com', 'github.io']
const BOOST_TITLE_PREFIXES = ['show hn:', 'ask hn:', 'tell hn:']

// ─── Scoring ──────────────────────────────────────────────────────────────────

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

interface ScoredItem {
  item: HNItem
  relevanceScore: number
}

function scoreItem(item: HNItem): ScoredItem | null {
  const title = item.title ?? ''
  const url = item.url ?? ''
  const lower = title.toLowerCase()
  const domain = getDomain(url)

  // Hard exclusions: blocked domains
  if (BLOCKED_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))) {
    return null
  }

  // Hard exclusions: explicit non-builder keywords
  if (EXCLUDE_KEYWORDS.some((kw) => lower.includes(kw))) {
    return null
  }

  // Must have at least one builder keyword to qualify
  const hasBuilderKeyword = BUILDER_KEYWORDS.some((kw) => lower.includes(kw))
  if (!hasBuilderKeyword) {
    return null
  }

  let score = 1

  // Boost for Show HN / Ask HN / Tell HN
  if (BOOST_TITLE_PREFIXES.some((prefix) => lower.startsWith(prefix))) {
    score += 3
  }

  // Boost for GitHub URL
  if (BOOST_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))) {
    score += 2
  }

  // Bonus per extra builder keyword matched (rewards specificity)
  const matchCount = BUILDER_KEYWORDS.filter((kw) => lower.includes(kw)).length
  score += Math.min(matchCount - 1, 3)

  return { item, relevanceScore: score }
}

// ─── Fetching ─────────────────────────────────────────────────────────────────

async function fetchHNItem(id: number): Promise<HNItem | null> {
  try {
    const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
      next: { revalidate: 0 },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

async function fetchTopStoryIds(): Promise<number[]> {
  const [topRes, newRes] = await Promise.all([
    fetch('https://hacker-news.firebaseio.com/v0/topstories.json'),
    fetch('https://hacker-news.firebaseio.com/v0/newstories.json'),
  ])
  const top: number[] = await topRes.json()
  const news: number[] = await newRes.json()
  const combined = [...new Set([...top.slice(0, 100), ...news.slice(0, 50)])]
  return combined.slice(0, 120)
}

// ─── Collector ────────────────────────────────────────────────────────────────

export async function runHackerNewsCollector(): Promise<{ collected: number; errors: string[] }> {
  const supabase = createServerClient()
  const errors: string[] = []
  let collected = 0

  const ids = await fetchTopStoryIds()
  const rawItems = await Promise.all(ids.map(fetchHNItem))

  // Score and filter; keep only builder-relevant stories, sorted by relevance desc
  const stories = rawItems
    .filter((item): item is HNItem =>
      item !== null && item.type === 'story' && !!item.title && !!item.url
    )
    .map(scoreItem)
    .filter((scored): scored is ScoredItem => scored !== null)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .map((s) => s.item)

  for (const story of stories) {
    try {
      const externalId = `hn-${story.id}`
      const url = story.url ?? `https://news.ycombinator.com/item?id=${story.id}`
      const publishedAt = story.time
        ? new Date(story.time * 1000).toISOString()
        : new Date().toISOString()

      const { data: post, error: upsertError } = await supabase
        .from('posts')
        .upsert(
          {
            title: story.title!,
            url,
            platform: 'hackernews',
            author: story.by ?? null,
            description: story.text ?? '',
            published_at: publishedAt,
            type: 'discussion',
            external_id: externalId,
          },
          { onConflict: 'external_id', ignoreDuplicates: false }
        )
        .select('id')
        .single()

      const postId =
        post?.id ??
        (await supabase
          .from('posts')
          .select('id')
          .eq('external_id', externalId)
          .single()
          .then((r) => r.data?.id))

      if (upsertError && !postId) {
        errors.push(`Failed to upsert HN story ${story.id}: ${upsertError.message}`)
        continue
      }

      if (postId) {
        await supabase.from('metrics_history').insert({
          post_id: postId,
          stars: 0,
          comments: story.descendants ?? 0,
          upvotes: story.score ?? 0,
          score: story.score ?? 0,
        })
      }

      collected++
    } catch (err) {
      errors.push(`Error processing HN story ${story.id}: ${String(err)}`)
    }
  }

  return { collected, errors }
}
