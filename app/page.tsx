import { TrendGrid } from './components/trend-grid'
import { SourceFeedback } from './components/source-feedback'
import type { TrendSummary } from '@/lib/types'

async function getTrends(): Promise<TrendSummary[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/trends`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.trends ?? []
  } catch {
    return []
  }
}

export default async function HomePage() {
  const trends = await getTrends()

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
          <span className="text-xs font-medium text-indigo-600 uppercase tracking-widest">
            Live
          </span>
        </div>
        <h1 className="text-2xl font-bold text-[#111111] tracking-tight mb-2">
          Trending in the Builder Ecosystem
        </h1>
        <p className="text-sm text-[#6b7280] max-w-xl">
          Tools, repos, and discussions gaining traction among developers right now.
          Signals detected across GitHub, Hacker News, and Reddit.
        </p>
      </div>

      <TrendGrid trends={trends} />

      <div className="mt-16 max-w-lg">
        <SourceFeedback />
      </div>
    </div>
  )
}
