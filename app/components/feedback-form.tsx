'use client'

import { useState } from 'react'

const MAX = 1000

export function FeedbackForm({ className = '' }: { className?: string }) {
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!message.trim() || loading) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/feedback/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() }),
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
        <p className="text-sm font-medium text-[#111111] mb-1">Thank you!</p>
        <p className="text-xs text-[#6b7280]">
          Your feedback helps shape what Builder Pulse becomes.
        </p>
      </div>
    )
  }

  return (
    <div className={`bg-white border border-[#e5e7eb] rounded-xl p-6 flex flex-col ${className}`}>
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-[#111111]">Share your feedback</span>
          <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full ring-1 ring-inset ring-indigo-100">
            Early access
          </span>
        </div>
        <p className="text-xs text-[#6b7280]">
          Builder Pulse is in its early days. We'd love to know what you think,
          what's missing, or what you'd love to see next.
        </p>
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="What do you think? What's missing? What would make this more useful?"
        maxLength={MAX}
        className="w-full flex-1 min-h-[100px] text-xs px-3 py-2.5 border border-[#e5e7eb] rounded-lg bg-[#fafafa] text-[#111111] placeholder-[#9ca3af] focus:outline-none focus:border-indigo-300 focus:bg-white transition-colors resize-none mb-2"
      />

      <div className="flex items-center justify-between mb-4">
        <span className={`text-[10px] tabular-nums ${message.length > MAX * 0.9 ? 'text-amber-500' : 'text-[#9ca3af]'}`}>
          {message.length}/{MAX}
        </span>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>

      <button
        onClick={submit}
        disabled={!message.trim() || loading}
        className="w-full py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Sending…' : 'Send feedback'}
      </button>
    </div>
  )
}
