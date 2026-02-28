import { TrendCard } from './trend-card'
import type { TrendSummary } from '@/lib/types'

export function TrendGrid({ trends }: { trends: TrendSummary[] }) {
  if (trends.length === 0) {
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {trends.map((trend) => (
        <TrendCard key={trend.id} trend={trend} />
      ))}
    </div>
  )
}
