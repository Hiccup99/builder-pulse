import { createServerClient } from '@/lib/supabase/server'

export interface PostMomentum {
  postId: string
  platform: string
  starVelocity: number
  commentVelocity: number
  upvoteVelocity: number
  momentumScore: number
  label: 'new' | 'rising' | 'exploding'
}

interface MetricSnapshot {
  stars: number
  comments: number
  upvotes: number
  score: number
  collected_at: string
}

function computeVelocity(current: number, previous: number, hoursDelta: number): number {
  if (hoursDelta <= 0) return 0
  return Math.max(0, (current - previous) / hoursDelta)
}

function getMomentumLabel(score: number): 'new' | 'rising' | 'exploding' {
  if (score > 100) return 'exploding'
  if (score > 30) return 'rising'
  return 'new'
}

export async function computeMomentumForPosts(postIds: string[]): Promise<PostMomentum[]> {
  const supabase = createServerClient()
  const results: PostMomentum[] = []

  if (postIds.length === 0) return results

  const { data: metrics } = await supabase
    .from('metrics_history')
    .select('post_id, stars, comments, upvotes, score, collected_at')
    .in('post_id', postIds)
    .order('collected_at', { ascending: false })

  if (!metrics) return results

  const byPost = new Map<string, MetricSnapshot[]>()
  for (const m of metrics) {
    const list = byPost.get(m.post_id) ?? []
    list.push(m)
    byPost.set(m.post_id, list)
  }

  const { data: posts } = await supabase
    .from('posts')
    .select('id, platform')
    .in('id', postIds)

  const platformMap = new Map<string, string>()
  for (const p of posts ?? []) {
    platformMap.set(p.id, p.platform)
  }

  for (const [postId, snapshots] of byPost.entries()) {
    if (snapshots.length < 1) continue

    const latest = snapshots[0]
    const previous = snapshots[1] ?? null

    let starVelocity = 0
    let commentVelocity = 0
    let upvoteVelocity = 0

    if (previous) {
      const latestTime = new Date(latest.collected_at).getTime()
      const prevTime = new Date(previous.collected_at).getTime()
      const hoursDelta = (latestTime - prevTime) / 3_600_000

      starVelocity = computeVelocity(latest.stars, previous.stars, hoursDelta)
      commentVelocity = computeVelocity(latest.comments, previous.comments, hoursDelta)
      upvoteVelocity = computeVelocity(latest.upvotes, previous.upvotes, hoursDelta)
    } else {
      // First snapshot: use absolute values scaled down as a baseline
      starVelocity = latest.stars / 24
      commentVelocity = latest.comments / 24
      upvoteVelocity = latest.upvotes / 24
    }

    const momentumScore =
      starVelocity * 0.5 + commentVelocity * 0.3 + upvoteVelocity * 0.2

    results.push({
      postId,
      platform: platformMap.get(postId) ?? 'unknown',
      starVelocity,
      commentVelocity,
      upvoteVelocity,
      momentumScore,
      label: getMomentumLabel(momentumScore),
    })
  }

  return results
}

export async function computeMomentumForAllRecentPosts(
  hoursBack = 48
): Promise<PostMomentum[]> {
  const supabase = createServerClient()
  const since = new Date(Date.now() - hoursBack * 3_600_000).toISOString()

  const { data: recentPosts } = await supabase
    .from('posts')
    .select('id')
    .gte('created_at', since)

  if (!recentPosts || recentPosts.length === 0) return []

  const ids = recentPosts.map((p) => p.id)
  return computeMomentumForPosts(ids)
}
