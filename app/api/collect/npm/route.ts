import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/auth/cron'
import { runNpmCollector } from '@/lib/collectors/npm'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runNpmCollector()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[collect/npm]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
