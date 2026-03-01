import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCategorySections, isValidCategory } from '@/lib/scoring/categories'
import { extractTrendingTopics, extractEmergingTopics } from '@/lib/scoring/topics'
import type { SectionItem, Section, DashboardResponse, Platform, PostType, Layer } from '@/lib/types'

export const runtime = 'nodejs'

function buildReason(item: {
  platform: string
  is_early_breakout: boolean
  layer: string | null
  velocity: number
  stars: number
  comments: number
  upvotes: number
  score: number
  github_momentum: number
  hn_heat: number
  reddit_buzz: number
  ph_momentum: number
  npm_traction: number
  downloads_weekly: number
  published_at: string | null
}): string {
  if (item.is_early_breakout) {
    return `Early Breakout — ${item.stars.toLocaleString()} stars, rapid growth`
  }

  const layerTag = item.layer === 'promising' ? '✦ Promising' : item.layer === 'hall_of_fame' ? '🏆 Hall of Fame' : ''
  const prefix = layerTag ? `${layerTag} · ` : ''

  if (item.platform === 'github') {
    const vel = item.velocity > 0 ? ` · velocity ${item.velocity.toFixed(1)}x` : ''
    return `${prefix}${item.stars.toLocaleString()} stars${vel}`
  }
  if (item.platform === 'hackernews') {
    const ageH = item.published_at
      ? Math.round((Date.now() - new Date(item.published_at).getTime()) / 3_600_000)
      : 0
    const timeStr = ageH < 1 ? 'just now' : ageH < 24 ? `${ageH}h` : `${Math.round(ageH / 24)}d`
    return `${prefix}${item.score} pts · ${item.comments} comments · ${timeStr}`
  }
  if (item.platform === 'reddit') {
    return `${prefix}${item.upvotes.toLocaleString()} upvotes · ${item.comments} comments`
  }
  if (item.platform === 'producthunt') {
    return `${prefix}${item.upvotes.toLocaleString()} upvotes · ${item.comments} comments`
  }
  if (item.platform === 'npm') {
    const dl = item.downloads_weekly >= 1000
      ? `${(item.downloads_weekly / 1000).toFixed(0)}k`
      : item.downloads_weekly.toString()
    return `${prefix}${dl} downloads/week`
  }
  return prefix || ''
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const categoryParam = req.nextUrl.searchParams.get('category')
    const category = isValidCategory(categoryParam) ? categoryParam : 'builder'

    const sectionDefs = getCategorySections(category)
    const since = new Date(Date.now() - 48 * 3_600_000).toISOString()

    const sections: Section[] = []

    for (const def of sectionDefs) {
      let query = supabase
        .from('posts')
        .select('id, title, url, platform, author, description, published_at, type, github_momentum, hn_heat, reddit_buzz, ph_momentum, npm_traction, is_early_breakout, signal_label, layer, velocity')
        .gte('created_at', since)
        .eq('layer', def.layer)
        .in('platform', def.platforms)
        .order(def.sortField, { ascending: false })
        .limit(def.limit)

      const { data: posts } = await query

      if (!posts || posts.length === 0) continue

      const postIds = posts.map((p) => p.id)
      const { data: metrics } = await supabase
        .from('metrics_history')
        .select('post_id, stars, comments, upvotes, score, forks, downloads_weekly, download_growth, collected_at')
        .in('post_id', postIds)
        .order('collected_at', { ascending: false })

      const latestMetrics = new Map<string, { stars: number; comments: number; upvotes: number; score: number; downloads_weekly: number }>()
      for (const m of metrics ?? []) {
        if (!latestMetrics.has(m.post_id)) {
          latestMetrics.set(m.post_id, {
            stars: m.stars ?? 0,
            comments: m.comments ?? 0,
            upvotes: m.upvotes ?? 0,
            score: m.score ?? 0,
            downloads_weekly: m.downloads_weekly ?? 0,
          })
        }
      }

      const items: SectionItem[] = posts.map((p) => {
        const m = latestMetrics.get(p.id) ?? { stars: 0, comments: 0, upvotes: 0, score: 0, downloads_weekly: 0 }
        return {
          id: p.id,
          title: p.title,
          url: p.url,
          platform: p.platform as Platform,
          author: p.author,
          description: p.description,
          published_at: p.published_at,
          type: p.type as PostType,
          latest_stars: m.stars,
          latest_comments: m.comments,
          latest_upvotes: m.upvotes,
          latest_score: m.score,
          github_momentum: p.github_momentum ?? 0,
          hn_heat: p.hn_heat ?? 0,
          reddit_buzz: p.reddit_buzz ?? 0,
          ph_momentum: p.ph_momentum ?? 0,
          npm_traction: p.npm_traction ?? 0,
          is_early_breakout: p.is_early_breakout ?? false,
          signal_label: p.signal_label,
          layer: (p.layer as Layer) ?? null,
          velocity: p.velocity ?? 0,
          reason: buildReason({
            platform: p.platform,
            is_early_breakout: p.is_early_breakout ?? false,
            layer: p.layer,
            velocity: p.velocity ?? 0,
            stars: m.stars,
            comments: m.comments,
            upvotes: m.upvotes,
            score: m.score,
            github_momentum: p.github_momentum ?? 0,
            hn_heat: p.hn_heat ?? 0,
            reddit_buzz: p.reddit_buzz ?? 0,
            ph_momentum: p.ph_momentum ?? 0,
            npm_traction: p.npm_traction ?? 0,
            downloads_weekly: m.downloads_weekly,
            published_at: p.published_at,
          }),
        }
      })

      sections.push({ title: def.title, type: def.platforms.join('+'), layer: def.layer, items })
    }

    const [trending_topics, emerging_topics] = await Promise.all([
      extractTrendingTopics(48, 10),
      extractEmergingTopics(8),
    ])

    const { data: latestPost } = await supabase
      .from('metrics_history')
      .select('collected_at')
      .order('collected_at', { ascending: false })
      .limit(1)
      .single()

    const response: DashboardResponse = {
      category,
      sections,
      trending_topics,
      emerging_topics,
      last_updated: latestPost?.collected_at ?? new Date().toISOString(),
    }

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' },
    })
  } catch (err) {
    console.error('[/api/trends]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
