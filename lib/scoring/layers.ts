import { createServerClient } from '@/lib/supabase/server'
import type { Layer } from '@/lib/types'

// ── Tunable thresholds ──

const GITHUB_THRESHOLDS = {
  promising: { maxStars: 5000, minVelocity: 0.1 },
  trending: { minStars24h: 50, maxStars: 50000 },
  hallOfFame: { minStars: 50000 },
}

const HN_THRESHOLDS = {
  promising: { maxScore: 200, minComments: 20, maxAgeHours: 12 },
  trending: { minScore: 200, minComments: 100 },
  hallOfFame: { minScore: 500 },
}

const REDDIT_THRESHOLDS = {
  promising: { maxUpvotes: 500, minGrowthRate: 10 },
  trending: { minUpvotes: 500, minComments: 100 },
  hallOfFame: { minUpvotes: 5000 },
}

const PH_THRESHOLDS = {
  promising: { maxUpvotes: 200, maxAgeHours: 24 },
  trending: { minUpvotes: 200 },
  hallOfFame: { minUpvotes: 1000 },
}

const NPM_THRESHOLDS = {
  promising: { minGrowth: 0.5, maxWeekly: 100000 },
  trending: { minWeekly: 100000 },
  hallOfFame: { minWeekly: 1000000 },
}

interface PostForClassification {
  id: string
  platform: string
  github_momentum: number
  hn_heat: number
  reddit_buzz: number
  ph_momentum: number
  npm_traction: number
  is_early_breakout: boolean
  published_at: string | null
  latest_stars?: number
  latest_upvotes?: number
  latest_comments?: number
  latest_score?: number
  downloads_weekly?: number
  download_growth?: number
}

function ageInHours(published_at: string | null): number {
  if (!published_at) return 999
  return (Date.now() - new Date(published_at).getTime()) / 3_600_000
}

function classifyGitHub(p: PostForClassification): { layer: Layer; velocity: number } {
  const stars = p.latest_stars ?? 0
  const momentum = p.github_momentum
  const velocity = stars > 0 ? momentum / stars : 0

  if (stars >= GITHUB_THRESHOLDS.hallOfFame.minStars) {
    return { layer: 'hall_of_fame', velocity }
  }
  if (stars < GITHUB_THRESHOLDS.promising.maxStars && velocity > GITHUB_THRESHOLDS.promising.minVelocity) {
    return { layer: 'promising', velocity }
  }
  if (momentum >= GITHUB_THRESHOLDS.trending.minStars24h && stars < GITHUB_THRESHOLDS.trending.maxStars) {
    return { layer: 'trending', velocity }
  }
  return { layer: 'trending', velocity }
}

function classifyHN(p: PostForClassification): { layer: Layer; velocity: number } {
  const score = p.latest_score ?? 0
  const comments = p.latest_comments ?? 0
  const age = ageInHours(p.published_at)
  const velocity = age > 0 ? score / age : 0

  if (score >= HN_THRESHOLDS.hallOfFame.minScore) {
    return { layer: 'hall_of_fame', velocity }
  }
  if (score < HN_THRESHOLDS.promising.maxScore && comments > HN_THRESHOLDS.promising.minComments && age < HN_THRESHOLDS.promising.maxAgeHours) {
    return { layer: 'promising', velocity }
  }
  if (score >= HN_THRESHOLDS.trending.minScore || comments >= HN_THRESHOLDS.trending.minComments) {
    return { layer: 'trending', velocity }
  }
  return { layer: 'promising', velocity }
}

function classifyReddit(p: PostForClassification): { layer: Layer; velocity: number } {
  const upvotes = p.latest_upvotes ?? 0
  const comments = p.latest_comments ?? 0
  const age = ageInHours(p.published_at)
  const velocity = age > 0 ? upvotes / age : 0

  if (upvotes >= REDDIT_THRESHOLDS.hallOfFame.minUpvotes) {
    return { layer: 'hall_of_fame', velocity }
  }
  if (upvotes < REDDIT_THRESHOLDS.promising.maxUpvotes && velocity > REDDIT_THRESHOLDS.promising.minGrowthRate) {
    return { layer: 'promising', velocity }
  }
  if (upvotes >= REDDIT_THRESHOLDS.trending.minUpvotes || comments >= REDDIT_THRESHOLDS.trending.minComments) {
    return { layer: 'trending', velocity }
  }
  return { layer: 'promising', velocity }
}

function classifyPH(p: PostForClassification): { layer: Layer; velocity: number } {
  const upvotes = p.latest_upvotes ?? 0
  const age = ageInHours(p.published_at)
  const velocity = age > 0 ? upvotes / age : 0

  if (upvotes >= PH_THRESHOLDS.hallOfFame.minUpvotes) {
    return { layer: 'hall_of_fame', velocity }
  }
  if (upvotes < PH_THRESHOLDS.promising.maxUpvotes && age < PH_THRESHOLDS.promising.maxAgeHours) {
    return { layer: 'promising', velocity }
  }
  if (upvotes >= PH_THRESHOLDS.trending.minUpvotes) {
    return { layer: 'trending', velocity }
  }
  return { layer: 'promising', velocity }
}

function classifyNpm(p: PostForClassification): { layer: Layer; velocity: number } {
  const weekly = p.downloads_weekly ?? 0
  const growth = p.download_growth ?? 0
  const velocity = growth

  if (weekly >= NPM_THRESHOLDS.hallOfFame.minWeekly) {
    return { layer: 'hall_of_fame', velocity }
  }
  if (growth > NPM_THRESHOLDS.promising.minGrowth && weekly < NPM_THRESHOLDS.promising.maxWeekly) {
    return { layer: 'promising', velocity }
  }
  if (weekly >= NPM_THRESHOLDS.trending.minWeekly) {
    return { layer: 'trending', velocity }
  }
  return { layer: 'promising', velocity }
}

function classifyPost(p: PostForClassification): { layer: Layer; velocity: number } {
  switch (p.platform) {
    case 'github': return classifyGitHub(p)
    case 'hackernews': return classifyHN(p)
    case 'reddit': return classifyReddit(p)
    case 'producthunt': return classifyPH(p)
    case 'npm': return classifyNpm(p)
    default: return { layer: 'trending', velocity: 0 }
  }
}

export async function classifyAllRecentPosts(hoursBack = 48): Promise<number> {
  const supabase = createServerClient()
  const since = new Date(Date.now() - hoursBack * 3_600_000).toISOString()

  const { data: posts } = await supabase
    .from('posts')
    .select('id, platform, github_momentum, hn_heat, reddit_buzz, ph_momentum, npm_traction, is_early_breakout, published_at')
    .gte('created_at', since)

  if (!posts || posts.length === 0) return 0

  const postIds = posts.map((p) => p.id)
  const { data: metrics } = await supabase
    .from('metrics_history')
    .select('post_id, stars, comments, upvotes, score, downloads_weekly, download_growth, collected_at')
    .in('post_id', postIds)
    .order('collected_at', { ascending: false })

  const latestMetrics = new Map<string, { stars: number; comments: number; upvotes: number; score: number; downloads_weekly: number; download_growth: number }>()
  for (const m of metrics ?? []) {
    if (!latestMetrics.has(m.post_id)) {
      latestMetrics.set(m.post_id, {
        stars: m.stars ?? 0,
        comments: m.comments ?? 0,
        upvotes: m.upvotes ?? 0,
        score: m.score ?? 0,
        downloads_weekly: m.downloads_weekly ?? 0,
        download_growth: m.download_growth ?? 0,
      })
    }
  }

  let classified = 0
  for (const post of posts) {
    const m = latestMetrics.get(post.id)
    const enriched: PostForClassification = {
      ...post,
      latest_stars: m?.stars,
      latest_upvotes: m?.upvotes,
      latest_comments: m?.comments,
      latest_score: m?.score,
      downloads_weekly: m?.downloads_weekly,
      download_growth: m?.download_growth,
    }
    const { layer, velocity } = classifyPost(enriched)

    await supabase
      .from('posts')
      .update({ layer, velocity })
      .eq('id', post.id)
    classified++
  }

  return classified
}
