import { createServerClient } from '@/lib/supabase/server'

export interface HNHeatScore {
  postId: string
  hnScore: number
  comments: number
  ageHours: number
  score: number
}

export async function computeHNHeat(postIds: string[]): Promise<HNHeatScore[]> {
  if (postIds.length === 0) return []
  const supabase = createServerClient()

  const { data: posts } = await supabase
    .from('posts')
    .select('id, published_at')
    .in('id', postIds)

  const { data: metrics } = await supabase
    .from('metrics_history')
    .select('post_id, score, comments, collected_at')
    .in('post_id', postIds)
    .order('collected_at', { ascending: false })

  if (!metrics || !posts) return []

  const publishedMap = new Map<string, string>()
  for (const p of posts) {
    publishedMap.set(p.id, p.published_at ?? new Date().toISOString())
  }

  const latestMetric = new Map<string, { score: number; comments: number }>()
  for (const m of metrics) {
    if (!latestMetric.has(m.post_id)) {
      latestMetric.set(m.post_id, { score: m.score ?? 0, comments: m.comments ?? 0 })
    }
  }

  const results: HNHeatScore[] = []

  for (const postId of postIds) {
    const m = latestMetric.get(postId)
    if (!m) continue

    const publishedAt = publishedMap.get(postId) ?? new Date().toISOString()
    const ageHours = (Date.now() - new Date(publishedAt).getTime()) / 3_600_000
    const recencyBoost = Math.max(0, 24 - ageHours)

    // hn_heat = (score * 2) + (comments * 3) + recency_boost
    const score = (m.score * 2) + (m.comments * 3) + recencyBoost

    results.push({
      postId,
      hnScore: m.score,
      comments: m.comments,
      ageHours,
      score,
    })
  }

  return results
}
