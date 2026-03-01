import { createServerClient } from '@/lib/supabase/server'

export interface PHScore {
  postId: string
  score: number
}

export async function computePHMomentum(postIds: string[]): Promise<PHScore[]> {
  if (postIds.length === 0) return []
  const supabase = createServerClient()

  const { data: posts } = await supabase
    .from('posts')
    .select('id, published_at')
    .in('id', postIds)

  const { data: metrics } = await supabase
    .from('metrics_history')
    .select('post_id, upvotes, comments, collected_at')
    .in('post_id', postIds)
    .order('collected_at', { ascending: false })

  if (!metrics || !posts) return []

  const publishedMap = new Map<string, string | null>()
  for (const p of posts) publishedMap.set(p.id, p.published_at)

  const latest = new Map<string, { upvotes: number; comments: number }>()
  for (const m of metrics) {
    if (!latest.has(m.post_id)) {
      latest.set(m.post_id, { upvotes: m.upvotes ?? 0, comments: m.comments ?? 0 })
    }
  }

  return postIds.map((id) => {
    const m = latest.get(id)
    if (!m) return { postId: id, score: 0 }

    const published = publishedMap.get(id)
    const ageHours = published
      ? (Date.now() - new Date(published).getTime()) / 3_600_000
      : 48

    const recencyBoost = Math.max(0, 48 - ageHours)
    const score = (m.upvotes * 2) + (m.comments * 3) + recencyBoost

    return { postId: id, score: Math.round(score * 100) / 100 }
  })
}
