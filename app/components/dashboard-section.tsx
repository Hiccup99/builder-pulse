import { SignalCard } from './signal-card'
import type { Section } from '@/lib/types'

const LAYER_ICONS: Record<string, string> = {
  promising: '✦',
  trending: '🔥',
  hall_of_fame: '🏆',
}

const LAYER_BORDER: Record<string, string> = {
  promising: 'border-l-emerald-400',
  trending: 'border-l-amber-400',
  hall_of_fame: 'border-l-indigo-400',
}

export function DashboardSection({ section }: { section: Section }) {
  if (section.items.length === 0) return null

  const isHof = section.layer === 'hall_of_fame'
  const borderClass = LAYER_BORDER[section.layer] ?? ''

  return (
    <div className={`mb-10 pl-4 border-l-2 ${borderClass}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm">{LAYER_ICONS[section.layer] ?? '◇'}</span>
        <h2 className="text-base font-bold text-[#111111]">{section.title}</h2>
        <span className="text-xs text-[#9ca3af] font-medium">
          {section.items.length}
        </span>
      </div>
      <div className={`grid gap-3 ${isHof ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {section.items.map((item) => (
          <SignalCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}
