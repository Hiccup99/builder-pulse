import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/auth/cron'
import { runProductHuntCollector } from '@/lib/collectors/producthunt'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runProductHuntCollector()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[collect/producthunt]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
