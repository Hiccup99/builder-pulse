import { Suspense } from 'react'
import { CategoryToggle } from './components/category-toggle'
import { TrendingTopicsBar } from './components/trending-topics-bar'
import { DashboardSection } from './components/dashboard-section'
import { SourceFeedback } from './components/source-feedback'
import { FeedbackForm } from './components/feedback-form'
import type { DashboardResponse, Category } from '@/lib/types'

async function getDashboard(category: Category): Promise<DashboardResponse | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/trends?category=${category}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function EmptyState() {
  return (
    <div className="text-center py-24">
      <div className="w-2 h-2 rounded-full bg-indigo-300 mx-auto mb-4 animate-pulse" />
      <p className="text-sm text-[#6b7280]">Collecting signals...</p>
      <p className="text-xs text-[#9ca3af] mt-1">
        Check back in a few minutes once collectors have run.
      </p>
    </div>
  )
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const params = await searchParams
  const category = (['builder', 'founder', 'growth'].includes(params.category ?? '')
    ? params.category
    : 'builder') as Category

  const dashboard = await getDashboard(category)
  const hasSections = dashboard && dashboard.sections.some((s) => s.items.length > 0)

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
          <span className="text-xs font-medium text-indigo-600 uppercase tracking-widest">
            Live
          </span>
        </div>
        <h1 className="text-2xl font-bold text-[#111111] tracking-tight mb-2">
          Builder Pulse
        </h1>
        <p className="text-sm text-[#6b7280] max-w-xl">
          What developers are paying attention to right now.
          Signals detected across GitHub, Hacker News, Reddit, Product Hunt, and npm.
        </p>
      </div>

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
        {dashboard?.last_updated && (
          <>
            <span className="text-xs text-indigo-400">·</span>
            <span className="text-xs text-indigo-500">
              Last updated {new Date(dashboard.last_updated).toLocaleString()}
            </span>
          </>
        )}
      </div>

      <Suspense fallback={null}>
        <CategoryToggle />
      </Suspense>

      {dashboard && (dashboard.trending_topics?.length > 0 || dashboard.emerging_topics?.length > 0) && (
        <TrendingTopicsBar
          topics={dashboard.trending_topics ?? []}
          emergingTopics={dashboard.emerging_topics ?? []}
        />
      )}

      {hasSections ? (
        dashboard.sections.map((section) => (
          <DashboardSection key={section.title} section={section} />
        ))
      ) : (
        <EmptyState />
      )}

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
