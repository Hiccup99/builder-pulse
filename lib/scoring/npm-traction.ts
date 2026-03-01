import { createServerClient } from '@/lib/supabase/server'

export interface NpmScore {
  postId: string
  score: number
}

export async function computeNpmTraction(postIds: string[]): Promise<NpmScore[]> {
  if (postIds.length === 0) return []
  const supabase = createServerClient()

  const { data: metrics } = await supabase
    .from('metrics_history')
    .select('post_id, downloads_weekly, download_growth, collected_at')
    .in('post_id', postIds)
    .order('collected_at', { ascending: false })

  if (!metrics) return []

  const latest = new Map<string, { downloads_weekly: number; download_growth: number }>()
  for (const m of metrics) {
    if (!latest.has(m.post_id)) {
      latest.set(m.post_id, {
        downloads_weekly: m.downloads_weekly ?? 0,
        download_growth: m.download_growth ?? 0,
      })
    }
  }

  return postIds.map((id) => {
    const m = latest.get(id)
    if (!m) return { postId: id, score: 0 }
    const score = (m.downloads_weekly / 1000) + (m.download_growth * 50)
    return { postId: id, score: Math.round(score * 100) / 100 }
  })
}
