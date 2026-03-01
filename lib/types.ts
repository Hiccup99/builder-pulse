export type Platform = 'github' | 'hackernews' | 'reddit' | 'blog' | 'producthunt' | 'npm'
export type PostType = 'repo' | 'discussion' | 'article' | 'product' | 'package'
export type MomentumLabel = 'new' | 'rising' | 'exploding'
export type Category = 'builder' | 'founder' | 'growth'
export type Layer = 'promising' | 'trending' | 'hall_of_fame'

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

export interface SectionItem extends PostSummary {
  github_momentum: number
  hn_heat: number
  reddit_buzz: number
  ph_momentum: number
  npm_traction: number
  is_early_breakout: boolean
  signal_label: string | null
  layer: Layer | null
  velocity: number
  reason: string
}

export interface Section {
  title: string
  type: string
  layer: Layer
  items: SectionItem[]
}

export interface DashboardResponse {
  category: Category
  sections: Section[]
  trending_topics: string[]
  emerging_topics: string[]
  last_updated: string
}

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

export interface TrendDetail extends TrendSummary {
  posts: PostSummary[]
}
