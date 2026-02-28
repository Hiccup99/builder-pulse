import { PostMomentum } from './momentum'

export interface TopicRankingInput {
  topicId: string
  postMomentums: PostMomentum[]
  createdAt: string
}

export interface TopicScore {
  topicId: string
  trendScore: number
  momentumLabel: 'new' | 'rising' | 'exploding'
  platformCount: number
  signals: string[]
}

export function computeTopicScore(input: TopicRankingInput): TopicScore {
  const { topicId, postMomentums, createdAt } = input

  if (postMomentums.length === 0) {
    return {
      topicId,
      trendScore: 0,
      momentumLabel: 'new',
      platformCount: 0,
      signals: [],
    }
  }

  const totalMomentum = postMomentums.reduce((sum, p) => sum + p.momentumScore, 0)

  const uniquePlatforms = [...new Set(postMomentums.map((p) => p.platform))]
  const platformDiversityBonus = 1 + 0.2 * uniquePlatforms.length

  const ageHours = (Date.now() - new Date(createdAt).getTime()) / 3_600_000
  const recencyFactor = ageHours < 6 ? 1.5 : ageHours < 24 ? 1.2 : ageHours < 72 ? 1.0 : 0.8

  const trendScore = totalMomentum * platformDiversityBonus * recencyFactor

  const maxMomentum = Math.max(...postMomentums.map((p) => p.momentumScore))
  const momentumLabel =
    maxMomentum > 100 ? 'exploding' : maxMomentum > 30 ? 'rising' : 'new'

  return {
    topicId,
    trendScore,
    momentumLabel,
    platformCount: uniquePlatforms.length,
    signals: uniquePlatforms,
  }
}
