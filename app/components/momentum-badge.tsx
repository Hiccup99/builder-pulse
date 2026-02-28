import type { MomentumLabel } from '@/lib/types'

const config: Record<MomentumLabel, { label: string; classes: string }> = {
  new: {
    label: 'New',
    classes: 'bg-blue-50 text-blue-700 ring-blue-100',
  },
  rising: {
    label: 'Rising ↑',
    classes: 'bg-amber-50 text-amber-700 ring-amber-100',
  },
  exploding: {
    label: 'Exploding ↑',
    classes: 'bg-red-50 text-red-700 ring-red-100',
  },
}

export function MomentumBadge({ label }: { label: MomentumLabel }) {
  const { label: text, classes } = config[label] ?? config.new
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${classes}`}
    >
      {text}
    </span>
  )
}
