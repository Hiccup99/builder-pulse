interface MetricBarProps {
  label: string
  value: number | string
  sub?: string
}

export function MetricBar({ label, value, sub }: MetricBarProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-[#9ca3af] uppercase tracking-wider">{label}</span>
      <span className="text-lg font-semibold text-[#111111] tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
      {sub && <span className="text-xs text-[#6b7280]">{sub}</span>}
    </div>
  )
}
