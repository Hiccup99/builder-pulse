'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'bp_hearted'

export function HeartButton() {
  const [hearted, setHearted] = useState(false)
  const [burst, setBurst] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setHearted(localStorage.getItem(STORAGE_KEY) === '1')
  }, [])

  async function handleClick() {
    if (hearted || loading) return

    setLoading(true)
    setBurst(true)
    setTimeout(() => setBurst(false), 400)

    try {
      await fetch('/api/feedback/heart', { method: 'POST' })
      localStorage.setItem(STORAGE_KEY, '1')
      setHearted(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={hearted || loading}
      title={hearted ? 'Thanks for the support!' : 'Support the initiative'}
      className={`flex items-center gap-2 transition-colors ${
        hearted
          ? 'cursor-default text-red-400'
          : 'text-[#9ca3af] hover:text-red-400 cursor-pointer'
      }`}
    >
      <svg
        className={`w-4 h-4 transition-transform duration-150 ${burst ? 'scale-125' : 'scale-100'} ${hearted ? 'fill-red-400 text-red-400' : 'fill-none'}`}
        stroke="currentColor"
        strokeWidth={1.8}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
      <span className="text-xs font-medium">
        {hearted ? 'Supported' : 'Support the initiative'}
      </span>
    </button>
  )
}
