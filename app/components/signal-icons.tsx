import type { Platform } from '@/lib/types'

const PLATFORM_CONFIG: Record<Platform, { label: string; icon: string; color: string }> = {
  github: { label: 'GitHub', icon: 'GH', color: 'bg-gray-900 text-white' },
  hackernews: { label: 'HN', icon: 'HN', color: 'bg-orange-500 text-white' },
  reddit: { label: 'Reddit', icon: 'RE', color: 'bg-red-500 text-white' },
  blog: { label: 'Blog', icon: 'BL', color: 'bg-violet-500 text-white' },
  producthunt: { label: 'PH', icon: 'PH', color: 'bg-orange-600 text-white' },
  npm: { label: 'npm', icon: 'NP', color: 'bg-red-600 text-white' },
}

export function SignalIcons({ platforms }: { platforms: Platform[] }) {
  const unique = [...new Set(platforms)].filter((p) => PLATFORM_CONFIG[p])
  return (
    <div className="flex items-center gap-1.5">
      {unique.map((platform) => {
        const { icon, color, label } = PLATFORM_CONFIG[platform]
        return (
          <span
            key={platform}
            title={label}
            className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold tracking-tight ${color}`}
          >
            {icon}
          </span>
        )
      })}
    </div>
  )
}

export function PlatformLabel({ platform }: { platform: Platform }) {
  const cfg = PLATFORM_CONFIG[platform]
  if (!cfg) return null
  return (
    <span
      className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold ${cfg.color}`}
    >
      {cfg.label}
    </span>
  )
}
