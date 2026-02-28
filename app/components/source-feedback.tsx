'use client'

import { useState } from 'react'

const SUGGESTED_SOURCES = [
  'Hacker News',
  'GitHub Trending',
  'Reddit',
  'Dev.to',
  'Lobsters',
  'Product Hunt',
  'X / Twitter',
  'Discord communities',
  'Newsletters',
  'YouTube',
]

export function SourceFeedback({ className = '' }: { className?: string }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [custom, setCustom] = useState('')
  const [customList, setCustomList] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function toggle(source: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(source) ? next.delete(source) : next.add(source)
      return next
    })
  }

  function addCustom() {
    const trimmed = custom.trim()
    if (!trimmed || customList.includes(trimmed)) return
    setCustomList((prev) => [...prev, trimmed])
    setSelected((prev) => new Set([...prev, trimmed]))
    setCustom('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') addCustom()
  }

  async function submit() {
    if (selected.size === 0 || loading) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/feedback/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources: [...selected] }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Something went wrong. Try again.')
        return
      }

      setSubmitted(true)
    } catch {
      setError('Could not connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className={`bg-white border border-[#e5e7eb] rounded-xl p-6 text-center flex flex-col items-center justify-center ${className}`}>
        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-3">
          <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-medium text-[#111111] mb-1">Thanks for sharing!</p>
        <p className="text-xs text-[#6b7280]">
          We'll use this to prioritize which sources to add next.
        </p>
      </div>
    )
  }

  return (
    <div className={`bg-white border border-[#e5e7eb] rounded-xl p-6 flex flex-col ${className}`}>
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-[#111111] mb-1">
          Where do you track what's happening?
        </h2>
        <p className="text-xs text-[#6b7280]">
          Tell us which sources you check. We'll add them to Builder Pulse soon.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {[...SUGGESTED_SOURCES, ...customList].map((source) => {
          const active = selected.has(source)
          return (
            <button
              key={source}
              onClick={() => toggle(source)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                active
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-[#374151] border-[#e5e7eb] hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              {source}
            </button>
          )
        })}
      </div>

      <div className="flex gap-2 mb-5">
        <input
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add another source…"
          className="flex-1 text-xs px-3 py-2 border border-[#e5e7eb] rounded-lg bg-[#fafafa] text-[#111111] placeholder-[#9ca3af] focus:outline-none focus:border-indigo-300 focus:bg-white transition-colors"
        />
        <button
          onClick={addCustom}
          disabled={!custom.trim()}
          className="px-3 py-2 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Add
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-500 mb-3">{error}</p>
      )}

      <div className="mt-auto">
      <button
        onClick={submit}
        disabled={selected.size === 0 || loading}
        className="w-full py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Saving…' : (
          <>
            Share my sources
            {selected.size > 0 && (
              <span className="ml-1.5 opacity-75">({selected.size} selected)</span>
            )}
          </>
        )}
      </button>
      </div>
    </div>
  )
}
