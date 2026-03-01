import { createServerClient } from '@/lib/supabase/server'
import type { GitHubScore } from './github-momentum'

const VELOCITY_THRESHOLD = 0.2
const MAX_STARS_FOR_BREAKOUT = 5000

export async function detectBreakouts(ghScores: GitHubScore[]): Promise<number> {
  const supabase = createServerClient()
  let detected = 0

  for (const gh of ghScores) {
    if (gh.totalStars <= 0 || gh.totalStars > MAX_STARS_FOR_BREAKOUT) continue

    const velocity = gh.stars24h / gh.totalStars
    const isBreakout = velocity > VELOCITY_THRESHOLD

    if (isBreakout) {
      await supabase
        .from('posts')
        .update({
          is_early_breakout: true,
          signal_label: 'Early Breakout',
        })
        .eq('id', gh.postId)

      detected++
    }
  }

  return detected
}
