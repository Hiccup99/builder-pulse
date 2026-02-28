import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const sources: unknown = body.sources

    if (!Array.isArray(sources) || sources.length === 0) {
      return NextResponse.json({ error: 'sources must be a non-empty array' }, { status: 400 })
    }

    const cleaned = sources
      .filter((s): s is string => typeof s === 'string')
      .map((s) => s.trim().slice(0, 100))
      .filter(Boolean)
      .slice(0, 20)

    if (cleaned.length === 0) {
      return NextResponse.json({ error: 'No valid sources provided' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { error } = await supabase.from('source_suggestions').insert({ sources: cleaned })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
