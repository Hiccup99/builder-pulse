import { createServerClient } from '@/lib/supabase/server'
import { computeGitHubMomentum } from './github-momentum'
import { computeHNHeat } from './hn-heat'
import { computeRedditBuzz } from './reddit-buzz'
import { computePHMomentum } from './ph-momentum'
import { computeNpmTraction } from './npm-traction'
import { detectBreakouts } from './breakout'
import { classifyAllRecentPosts } from './layers'

export interface PostMomentum {
  postId: string
  platform: string
  momentumScore: number
  label: 'new' | 'rising' | 'exploding'
}

function getMomentumLabel(score: number): 'new' | 'rising' | 'exploding' {
  if (score > 100) return 'exploding'
  if (score > 30) return 'rising'
  return 'new'
}

export async function computeAndStorePlatformScores(hoursBack = 48): Promise<number> {
  const supabase = createServerClient()
  const since = new Date(Date.now() - hoursBack * 3_600_000).toISOString()

  const { data: recentPosts } = await supabase
    .from('posts')
    .select('id, platform')
    .gte('created_at', since)

  if (!recentPosts || recentPosts.length === 0) return 0

  const byPlatform = (p: string) => recentPosts.filter((r) => r.platform === p).map((r) => r.id)

  const githubIds = byPlatform('github')
  const hnIds = byPlatform('hackernews')
  const redditIds = byPlatform('reddit')
  const phIds = byPlatform('producthunt')
  const npmIds = byPlatform('npm')

  const [ghScores, hnScores, rdScores, phScores, npmScores] = await Promise.all([
    computeGitHubMomentum(githubIds),
    computeHNHeat(hnIds),
    computeRedditBuzz(redditIds),
    computePHMomentum(phIds),
    computeNpmTraction(npmIds),
  ])

  for (const gh of ghScores) {
    const label = getMomentumLabel(gh.score)
    await supabase
      .from('posts')
      .update({
        github_momentum: gh.score,
        signal_label: label === 'exploding' ? 'Hot Repo' : label === 'rising' ? 'Gaining Traction' : null,
      })
      .eq('id', gh.postId)
  }

  for (const hn of hnScores) {
    const label = getMomentumLabel(hn.score)
    await supabase
      .from('posts')
      .update({
        hn_heat: hn.score,
        signal_label: label === 'exploding' ? 'Hot Discussion' : label === 'rising' ? 'Active Discussion' : null,
      })
      .eq('id', hn.postId)
  }

  for (const rd of rdScores) {
    const label = getMomentumLabel(rd.score)
    await supabase
      .from('posts')
      .update({
        reddit_buzz: rd.score,
        signal_label: label === 'exploding' ? 'Community Buzz' : label === 'rising' ? 'Gaining Buzz' : null,
      })
      .eq('id', rd.postId)
  }

  for (const ph of phScores) {
    const label = getMomentumLabel(ph.score)
    await supabase
      .from('posts')
      .update({
        ph_momentum: ph.score,
        signal_label: label === 'exploding' ? 'Hot Launch' : label === 'rising' ? 'Rising Product' : null,
      })
      .eq('id', ph.postId)
  }

  for (const npm of npmScores) {
    const label = getMomentumLabel(npm.score)
    await supabase
      .from('posts')
      .update({
        npm_traction: npm.score,
        signal_label: label === 'exploding' ? 'Exploding Package' : label === 'rising' ? 'Growing Package' : null,
      })
      .eq('id', npm.postId)
  }

  await detectBreakouts(ghScores)
  await classifyAllRecentPosts(hoursBack)

  return ghScores.length + hnScores.length + rdScores.length + phScores.length + npmScores.length
}

export async function computeMomentumForPosts(postIds: string[]): Promise<PostMomentum[]> {
  if (postIds.length === 0) return []
  const supabase = createServerClient()

  const { data: posts } = await supabase
    .from('posts')
    .select('id, platform, github_momentum, hn_heat, reddit_buzz, ph_momentum, npm_traction')
    .in('id', postIds)

  if (!posts) return []

  return posts.map((p) => {
    let score = 0
    switch (p.platform) {
      case 'github': score = p.github_momentum ?? 0; break
      case 'hackernews': score = p.hn_heat ?? 0; break
      case 'reddit': score = p.reddit_buzz ?? 0; break
      case 'producthunt': score = p.ph_momentum ?? 0; break
      case 'npm': score = p.npm_traction ?? 0; break
    }

    return {
      postId: p.id,
      platform: p.platform,
      momentumScore: score,
      label: getMomentumLabel(score),
    }
  })
}
