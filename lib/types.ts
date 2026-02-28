export type Platform = 'github' | 'hackernews' | 'reddit' | 'blog'
export type PostType = 'repo' | 'discussion' | 'article'
export type MomentumLabel = 'new' | 'rising' | 'exploding'

export interface TrendSummary {
  id: string
  title: string
  description: string | null
  trend_score: number
  momentum_label: MomentumLabel
  platform_count: number
  signals: Platform[]
  post_count: number
  top_metric: string
  created_at: string
  updated_at: string
}

export interface PostSummary {
  id: string
  title: string
  url: string
  platform: Platform
  author: string | null
  description: string | null
  published_at: string | null
  type: PostType
  latest_stars: number
  latest_comments: number
  latest_upvotes: number
  latest_score: number
}

export interface TrendDetail extends TrendSummary {
  posts: PostSummary[]
}
