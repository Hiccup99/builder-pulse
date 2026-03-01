import type { SectionItem } from '@/lib/types'
import { LayerBadge } from './layer-badge'

const PLATFORM_STYLES: Record<string, { strip: string; label: string; icon: string }> = {
  github: { strip: 'bg-[#24292e]', label: 'GitHub', icon: '◆' },
  hackernews: { strip: 'bg-[#ff6600]', label: 'Hacker News', icon: '▲' },
  reddit: { strip: 'bg-[#ff4500]', label: 'Reddit', icon: '●' },
  blog: { strip: 'bg-[#6366f1]', label: 'Blog', icon: '◇' },
  producthunt: { strip: 'bg-[#da552f]', label: 'Product Hunt', icon: '🐱' },
  npm: { strip: 'bg-[#cb3837]', label: 'npm', icon: '📦' },
}

function timeAgo(date: string | null): string {
  if (!date) return ''
  const diff = Date.now() - new Date(date).getTime()
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return days === 1 ? '1 day ago' : `${days} days ago`
}

function MetricPill({ value, label }: { value: number; label: string }) {
  if (value <= 0) return null
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[#6b7280]">
      <span className="font-semibold text-[#374151]">{value.toLocaleString()}</span>
      {label}
    </span>
  )
}

export function SignalCard({ item }: { item: SectionItem }) {
  const style = PLATFORM_STYLES[item.platform] ?? PLATFORM_STYLES.blog

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex overflow-hidden bg-white border border-[#e5e7eb] rounded-xl hover:border-indigo-200 hover:shadow-md transition-all duration-150"
    >
      <div className={`w-1 shrink-0 ${style.strip}`} />

      <div className="flex-1 p-4 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-sm font-semibold text-[#111111] leading-snug group-hover:text-indigo-600 transition-colors line-clamp-2 min-w-0">
            {item.title}
          </h3>
          <LayerBadge layer={item.layer} />
        </div>

        <p className="text-xs text-indigo-600/80 font-medium mb-2 line-clamp-1">
          {item.reason}
        </p>

        {item.description && (
          <p className="text-xs text-[#6b7280] leading-relaxed mb-3 line-clamp-2">
            {item.description}
          </p>
        )}

        {item.layer === 'promising' && item.velocity > 0 && (
          <div className="inline-flex items-center gap-1 mb-2 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
            ⚡ velocity {item.velocity.toFixed(1)}x
          </div>
        )}

        <div className="flex items-center justify-between mt-auto pt-2 border-t border-[#f3f4f6]">
          <div className="flex items-center gap-3">
            <MetricPill value={item.latest_stars} label="★" />
            <MetricPill value={item.latest_upvotes} label="↑" />
            <MetricPill value={item.latest_comments} label="💬" />
          </div>
          <div className="flex items-center gap-2 text-[10px] text-[#9ca3af]">
            <span>{style.label}</span>
            {item.published_at && (
              <>
                <span>·</span>
                <span>{timeAgo(item.published_at)}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </a>
  )
}
