import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const message = typeof body.message === 'string' ? body.message.trim() : ''

    if (!message || message.length < 1) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }
    if (message.length > 1000) {
      return NextResponse.json({ error: 'Message too long (max 1000 characters)' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { error } = await supabase.from('feedback').insert({ message })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
