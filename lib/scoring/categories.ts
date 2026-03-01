import type { Category, Layer, Platform } from '@/lib/types'

export type { Category }

export interface SectionDef {
  title: string
  layer: Layer
  platforms: Platform[]
  sortField: string
  limit: number
}

const SECTIONS: Record<Category, SectionDef[]> = {
  builder: [
    { title: 'Promising Repos', layer: 'promising', platforms: ['github', 'npm'], sortField: 'velocity', limit: 8 },
    { title: 'Trending Dev Tools', layer: 'trending', platforms: ['github', 'npm', 'hackernews'], sortField: 'github_momentum', limit: 8 },
    { title: 'Builder Discussions', layer: 'trending', platforms: ['hackernews', 'reddit'], sortField: 'hn_heat', limit: 8 },
    { title: 'Hall of Fame Tools', layer: 'hall_of_fame', platforms: ['github', 'npm'], sortField: 'github_momentum', limit: 6 },
  ],
  founder: [
    { title: 'Promising Products', layer: 'promising', platforms: ['producthunt', 'github'], sortField: 'velocity', limit: 8 },
    { title: 'Trending Launches', layer: 'trending', platforms: ['producthunt', 'hackernews'], sortField: 'ph_momentum', limit: 8 },
    { title: 'Problems Developers Discuss', layer: 'trending', platforms: ['reddit', 'hackernews'], sortField: 'reddit_buzz', limit: 8 },
    { title: 'Hall of Fame Products', layer: 'hall_of_fame', platforms: ['producthunt', 'github'], sortField: 'ph_momentum', limit: 6 },
  ],
  growth: [
    { title: 'Exploding Conversations', layer: 'promising', platforms: ['reddit', 'hackernews'], sortField: 'velocity', limit: 8 },
    { title: 'Trending Launches', layer: 'trending', platforms: ['producthunt', 'reddit'], sortField: 'reddit_buzz', limit: 8 },
    { title: 'Communities Reacting', layer: 'trending', platforms: ['reddit'], sortField: 'reddit_buzz', limit: 6 },
    { title: 'Hall of Fame', layer: 'hall_of_fame', platforms: ['github', 'producthunt'], sortField: 'github_momentum', limit: 6 },
  ],
}

export function getCategorySections(category: Category): SectionDef[] {
  return SECTIONS[category]
}

export function isValidCategory(val: string | null): val is Category {
  return val === 'builder' || val === 'founder' || val === 'growth'
}
