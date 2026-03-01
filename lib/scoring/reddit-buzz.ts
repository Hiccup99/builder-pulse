import { createServerClient } from '@/lib/supabase/server'

export interface RedditBuzzScore {
  postId: string
  upvotes: number
  comments: number
  growthRate: number
  subreddit: string
  score: number
}

const SUBREDDIT_MULTIPLIERS: Record<string, number> = {
  programming: 1.4,
  machinelearning: 1.3,
  startups: 1.2,
  sideproject: 1.1,
  webdev: 1.1,
  devops: 1.1,
  javascript: 1.0,
  rust: 1.0,
  golang: 1.0,
  localllama: 1.2,
  opensource: 1.1,
}

function extractSubreddit(url: string): string {
  const match = url.match(/reddit\.com\/r\/([^/]+)/)
  return match ? match[1].toLowerCase() : ''
}

export async function computeRedditBuzz(postIds: string[]): Promise<RedditBuzzScore[]> {
  if (postIds.length === 0) return []
  const supabase = createServerClient()

  const { data: posts } = await supabase
    .from('posts')
    .select('id, url')
    .in('id', postIds)

  const { data: metrics } = await supabase
    .from('metrics_history')
    .select('post_id, upvotes, comments, collected_at')
    .in('post_id', postIds)
    .order('collected_at', { ascending: false })

  if (!metrics || !posts) return []

  const urlMap = new Map<string, string>()
  for (const p of posts) urlMap.set(p.id, p.url)

  const byPost = new Map<string, { upvotes: number; comments: number; collected_at: string }[]>()
  for (const m of metrics) {
    const list = byPost.get(m.post_id) ?? []
    list.push({ upvotes: m.upvotes ?? 0, comments: m.comments ?? 0, collected_at: m.collected_at })
    byPost.set(m.post_id, list)
  }

  const results: RedditBuzzScore[] = []

  for (const postId of postIds) {
    const snapshots = byPost.get(postId)
    if (!snapshots || snapshots.length === 0) continue

    const latest = snapshots[0]
    const previous = snapshots[1] ?? null

    let growthRate = 0
    if (previous) {
      const hoursDelta = (new Date(latest.collected_at).getTime() - new Date(previous.collected_at).getTime()) / 3_600_000
      growthRate = hoursDelta > 0 ? Math.max(0, (latest.upvotes - previous.upvotes) / hoursDelta) : 0
    } else {
      growthRate = latest.upvotes / 24
    }

    const subreddit = extractSubreddit(urlMap.get(postId) ?? '')
    const multiplier = SUBREDDIT_MULTIPLIERS[subreddit] ?? 1.0

    // reddit_buzz = ((upvotes * 1.5) + (comments * 2) + (growth_rate * 3)) * subreddit_multiplier
    const score = ((latest.upvotes * 1.5) + (latest.comments * 2) + (growthRate * 3)) * multiplier

    results.push({
      postId,
      upvotes: latest.upvotes,
      comments: latest.comments,
      growthRate,
      subreddit,
      score,
    })
  }

  return results
}
