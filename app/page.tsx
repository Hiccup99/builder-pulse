import { TrendGrid } from './components/trend-grid'
import { SourceFeedback } from './components/source-feedback'
import { FeedbackForm } from './components/feedback-form'
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
      {/* Hero */}
      <div className="mb-6">
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

      {/* Refresh cadence banner */}
      <div className="flex items-center gap-2.5 bg-[#f5f3ff] border border-[#ede9fe] rounded-lg px-4 py-2.5 mb-8 w-fit">
        <svg
          className="w-3.5 h-3.5 text-indigo-500 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"
          />
        </svg>
        <span className="text-xs text-indigo-700 font-medium">
          Signals are refreshed every 24 hours
        </span>
        <span className="text-xs text-indigo-400">·</span>
        <span className="text-xs text-indigo-500">
          More sources coming soon
        </span>
      </div>

      <TrendGrid trends={trends} />

      {/* Feedback widgets */}
      <div className="mt-16 flex flex-col sm:flex-row gap-5 w-full items-stretch">
        <div className="sm:w-[40%] flex flex-col">
          <SourceFeedback className="flex-1" />
        </div>
        <div className="sm:w-[60%] flex flex-col">
          <FeedbackForm className="flex-1" />
        </div>
      </div>
    </div>
  )
}
