import Link from 'next/link'
import { MomentumBadge } from './momentum-badge'
import { SignalIcons } from './signal-icons'
import type { TrendSummary } from '@/lib/types'

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

export function TrendCard({ trend }: { trend: TrendSummary }) {
  return (
    <Link
      href={`/trend/${trend.id}`}
      className="group block bg-white border border-[#e5e7eb] rounded-xl p-5 hover:border-indigo-200 hover:shadow-sm transition-all duration-150"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-[#111111] leading-snug group-hover:text-indigo-600 transition-colors line-clamp-2">
          {trend.title}
        </h3>
        <MomentumBadge label={trend.momentum_label} />
      </div>

      {trend.description && (
        <p className="text-xs text-[#6b7280] leading-relaxed mb-3 line-clamp-2">
          {trend.description}
        </p>
      )}

      <div className="flex items-center justify-between mt-4">
        <SignalIcons platforms={trend.signals} />
        <div className="flex items-center gap-3 text-xs text-[#6b7280]">
          {trend.top_metric && (
            <span className="font-medium text-[#374151]">{trend.top_metric}</span>
          )}
          <span>{timeAgo(trend.updated_at)}</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-[#f3f4f6] flex items-center justify-between">
        <span className="text-xs text-[#9ca3af]">
          {trend.post_count} signal{trend.post_count !== 1 ? 's' : ''} ·{' '}
          {trend.platform_count} platform{trend.platform_count !== 1 ? 's' : ''}
        </span>
        <span className="text-xs text-indigo-500 group-hover:text-indigo-600 font-medium">
          View trend →
        </span>
      </div>
    </Link>
  )
}
