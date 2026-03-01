import type { Layer } from '@/lib/types'

const LAYER_CONFIG: Record<Layer, { label: string; icon: string; classes: string }> = {
  promising: {
    label: 'Promising',
    icon: '✦',
    classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
  trending: {
    label: 'Trending',
    icon: '🔥',
    classes: 'bg-amber-50 text-amber-700 ring-amber-200',
  },
  hall_of_fame: {
    label: 'Hall of Fame',
    icon: '🏆',
    classes: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  },
}

export function LayerBadge({ layer }: { layer: Layer | null }) {
  if (!layer) return null
  const config = LAYER_CONFIG[layer]
  if (!config) return null

  return (
    <span
      className={`shrink-0 inline-flex items-center gap-1 whitespace-nowrap px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset ${config.classes}`}
    >
      <span>{config.icon}</span>
      {config.label}
    </span>
  )
}
