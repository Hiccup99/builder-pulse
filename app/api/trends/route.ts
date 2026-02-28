import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import type { TrendSummary } from '@/lib/types'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = createServerClient()

    const { data: topics, error } = await supabase
      .from('topics')
      .select('id, title, description, trend_score, momentum_label, platform_count, signals, created_at, updated_at')
      .order('trend_score', { ascending: false })
      .limit(20)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!topics || topics.length === 0) {
      return NextResponse.json({ trends: [] }, {
        headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' },
      })
    }

    const topicIds = topics.map((t) => t.id)

    // Count posts per topic
    const { data: counts } = await supabase
      .from('topic_posts')
      .select('topic_id')
      .in('topic_id', topicIds)

    const countMap = new Map<string, number>()
    for (const row of counts ?? []) {
      countMap.set(row.topic_id, (countMap.get(row.topic_id) ?? 0) + 1)
    }

    // Get top metric per topic (best starred GitHub repo or highest HN score)
    const { data: topMetrics } = await supabase
      .from('topic_posts')
      .select(`
        topic_id,
        posts(id, platform,
          metrics_history(stars, comments, upvotes, score, collected_at)
        )
      `)
      .in('topic_id', topicIds)

    const topMetricMap = new Map<string, string>()
    if (topMetrics) {
      for (const row of topMetrics) {
        const post = (row as { posts?: { platform?: string; metrics_history?: { stars?: number; comments?: number; upvotes?: number; score?: number }[] } }).posts
        if (!post?.metrics_history?.length) continue

        const latest = post.metrics_history[0]
        const platform = post.platform

        const existing = topMetricMap.get(row.topic_id)
        let metric = ''

        if (platform === 'github' && (latest.stars ?? 0) > 0) {
          metric = `+${latest.stars?.toLocaleString()} stars`
        } else if (platform === 'hackernews' && (latest.score ?? 0) > 0) {
          metric = `${latest.score} points`
        } else if (platform === 'reddit' && (latest.upvotes ?? 0) > 0) {
          metric = `${latest.upvotes?.toLocaleString()} upvotes`
        }

        if (metric && !existing) {
          topMetricMap.set(row.topic_id, metric)
        }
      }
    }

    const trends: TrendSummary[] = topics.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      trend_score: t.trend_score,
      momentum_label: t.momentum_label ?? 'new',
      platform_count: t.platform_count ?? 1,
      signals: t.signals ?? [],
      post_count: countMap.get(t.id) ?? 0,
      top_metric: topMetricMap.get(t.id) ?? '',
      created_at: t.created_at,
      updated_at: t.updated_at,
    }))

    return NextResponse.json(
      { trends },
      { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } }
    )
  } catch (err) {
    console.error('[/api/trends]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
