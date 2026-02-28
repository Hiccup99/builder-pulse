import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/auth/cron'
import { runClusteringJob } from '@/lib/clustering/embeddings'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runClusteringJob()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[cluster]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
