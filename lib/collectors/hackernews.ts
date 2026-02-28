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

const TECH_KEYWORDS = [
  'api', 'sdk', 'framework', 'library', 'open source', 'github', 'typescript',
  'javascript', 'python', 'rust', 'go', 'wasm', 'ai', 'ml', 'llm', 'gpt',
  'database', 'postgres', 'redis', 'docker', 'kubernetes', 'cloud', 'serverless',
  'nextjs', 'react', 'devops', 'backend', 'frontend', 'deployment', 'model',
  'agent', 'cli', 'compiler', 'runtime', 'performance', 'security',
]

function isTechRelevant(title: string): boolean {
  const lower = title.toLowerCase()
  return TECH_KEYWORDS.some((kw) => lower.includes(kw))
}

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

export async function runHackerNewsCollector(): Promise<{ collected: number; errors: string[] }> {
  const supabase = createServerClient()
  const errors: string[] = []
  let collected = 0

  const ids = await fetchTopStoryIds()
  const items = await Promise.all(ids.map(fetchHNItem))

  const stories = items.filter(
    (item): item is HNItem =>
      item !== null &&
      item.type === 'story' &&
      !!item.title &&
      !!item.url &&
      isTechRelevant(item.title)
  )

  for (const story of stories) {
    try {
      const externalId = `hn-${story.id}`
      const url = story.url ?? `https://news.ycombinator.com/item?id=${story.id}`
      const publishedAt = story.time ? new Date(story.time * 1000).toISOString() : new Date().toISOString()

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

      const postId = post?.id ?? (await supabase
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
