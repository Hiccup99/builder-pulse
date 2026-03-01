import { createServerClient } from '@/lib/supabase/server'

export interface GitHubScore {
  postId: string
  stars24h: number
  forks24h: number
  totalStars: number
  score: number
}

export async function computeGitHubMomentum(postIds: string[]): Promise<GitHubScore[]> {
  if (postIds.length === 0) return []
  const supabase = createServerClient()

  const { data: metrics } = await supabase
    .from('metrics_history')
    .select('post_id, stars, forks, collected_at')
    .in('post_id', postIds)
    .order('collected_at', { ascending: false })

  if (!metrics) return []

  const byPost = new Map<string, { stars: number; forks: number; collected_at: string }[]>()
  for (const m of metrics) {
    const list = byPost.get(m.post_id) ?? []
    list.push({ stars: m.stars ?? 0, forks: m.forks ?? 0, collected_at: m.collected_at })
    byPost.set(m.post_id, list)
  }

  const results: GitHubScore[] = []

  for (const [postId, snapshots] of byPost.entries()) {
    const latest = snapshots[0]
    const previous = snapshots[1] ?? null

    let stars24h = 0
    let forks24h = 0

    if (previous) {
      stars24h = Math.max(0, latest.stars - previous.stars)
      forks24h = Math.max(0, latest.forks - previous.forks)
    } else {
      stars24h = latest.stars / 7
      forks24h = latest.forks / 7
    }

    // github_momentum = (stars_24h * 4) + (forks_24h * 3) + (stars_7d * 1.5)
    // Using forks as proxy for contributors since we don't fetch contributor count
    const stars7d = stars24h * 3.5
    const score = (stars24h * 4) + (forks24h * 3) + (forks24h * 5) + (stars7d * 1.5)

    results.push({ postId, stars24h, forks24h, totalStars: latest.stars, score })
  }

  return results
}
