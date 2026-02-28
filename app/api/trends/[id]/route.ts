import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import type { TrendDetail, PostSummary } from '@/lib/types'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const supabase = createServerClient()

    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .select('id, title, description, trend_score, momentum_label, platform_count, signals, created_at, updated_at')
      .eq('id', id)
      .single()

    if (topicError || !topic) {
      return NextResponse.json({ error: 'Trend not found' }, { status: 404 })
    }

    // Fetch all posts for this topic with their latest metrics
    const { data: topicPosts } = await supabase
      .from('topic_posts')
      .select('post_id')
      .eq('topic_id', id)

    if (!topicPosts || topicPosts.length === 0) {
      const detail: TrendDetail = {
        id: topic.id,
        title: topic.title,
        description: topic.description,
        trend_score: topic.trend_score,
        momentum_label: topic.momentum_label ?? 'new',
        platform_count: topic.platform_count ?? 1,
        signals: topic.signals ?? [],
        post_count: 0,
        top_metric: '',
        created_at: topic.created_at,
        updated_at: topic.updated_at,
        posts: [],
      }
      return NextResponse.json({ trend: detail })
    }

    const postIds = topicPosts.map((tp) => tp.post_id)

    const { data: posts } = await supabase
      .from('posts')
      .select('id, title, url, platform, author, description, published_at, type')
      .in('id', postIds)
      .order('published_at', { ascending: false })

    // Fetch latest metrics for each post
    const { data: metrics } = await supabase
      .from('metrics_history')
      .select('post_id, stars, comments, upvotes, score, collected_at')
      .in('post_id', postIds)
      .order('collected_at', { ascending: false })

    const latestMetrics = new Map<
      string,
      { stars: number; comments: number; upvotes: number; score: number }
    >()
    for (const m of metrics ?? []) {
      if (!latestMetrics.has(m.post_id)) {
        latestMetrics.set(m.post_id, {
          stars: m.stars ?? 0,
          comments: m.comments ?? 0,
          upvotes: m.upvotes ?? 0,
          score: m.score ?? 0,
        })
      }
    }

    const enrichedPosts: PostSummary[] = (posts ?? []).map((p) => {
      const m = latestMetrics.get(p.id) ?? { stars: 0, comments: 0, upvotes: 0, score: 0 }
      return {
        id: p.id,
        title: p.title,
        url: p.url,
        platform: p.platform,
        author: p.author,
        description: p.description,
        published_at: p.published_at,
        type: p.type,
        latest_stars: m.stars,
        latest_comments: m.comments,
        latest_upvotes: m.upvotes,
        latest_score: m.score,
      }
    })

    // Compute top metric string
    const ghPosts = enrichedPosts.filter((p) => p.platform === 'github').sort((a, b) => b.latest_stars - a.latest_stars)
    const hnPosts = enrichedPosts.filter((p) => p.platform === 'hackernews').sort((a, b) => b.latest_score - a.latest_score)
    let topMetric = ''
    if (ghPosts.length > 0 && ghPosts[0].latest_stars > 0) {
      topMetric = `${ghPosts[0].latest_stars.toLocaleString()} stars`
    } else if (hnPosts.length > 0 && hnPosts[0].latest_score > 0) {
      topMetric = `${hnPosts[0].latest_score} points on HN`
    }

    const detail: TrendDetail = {
      id: topic.id,
      title: topic.title,
      description: topic.description,
      trend_score: topic.trend_score,
      momentum_label: topic.momentum_label ?? 'new',
      platform_count: topic.platform_count ?? 1,
      signals: topic.signals ?? [],
      post_count: enrichedPosts.length,
      top_metric: topMetric,
      created_at: topic.created_at,
      updated_at: topic.updated_at,
      posts: enrichedPosts,
    }

    return NextResponse.json(
      { trend: detail },
      { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=120' } }
    )
  } catch (err) {
    console.error('[/api/trends/[id]]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
