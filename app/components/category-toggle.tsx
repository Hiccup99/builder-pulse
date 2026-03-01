'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { Category } from '@/lib/types'

const CATEGORIES: { value: Category; label: string; description: string }[] = [
  { value: 'builder', label: 'Builder', description: 'Repos & tools' },
  { value: 'founder', label: 'Founder', description: 'Opportunities' },
  { value: 'growth', label: 'Growth', description: 'Virality & buzz' },
]

export function CategoryToggle() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const current = (searchParams.get('category') as Category) ?? 'builder'

  function handleSelect(category: Category) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('category', category)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex items-center gap-1 p-1 bg-[#f9fafb] border border-[#e5e7eb] rounded-lg w-fit mb-6">
      {CATEGORIES.map((cat) => {
        const active = current === cat.value
        return (
          <button
            key={cat.value}
            onClick={() => handleSelect(cat.value)}
            className={`relative px-4 py-2 rounded-md text-xs font-medium transition-all duration-150 ${
              active
                ? 'bg-white text-[#111111] shadow-sm border border-[#e5e7eb]'
                : 'text-[#6b7280] hover:text-[#111111]'
            }`}
          >
            <span className="block">{cat.label}</span>
            <span className={`block text-[10px] mt-0.5 ${active ? 'text-indigo-600' : 'text-[#9ca3af]'}`}>
              {cat.description}
            </span>
          </button>
        )
      })}
    </div>
  )
}
