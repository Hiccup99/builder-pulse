import { createServerClient } from '@/lib/supabase/server'

const PH_API = 'https://api.producthunt.com/v2/api/graphql'

const POSTS_QUERY = `
  query GetPosts($postedAfter: DateTime!) {
    posts(order: VOTES, postedAfter: $postedAfter, first: 30) {
      edges {
        node {
          id
          name
          tagline
          url
          votesCount
          commentsCount
          createdAt
          website
          makers {
            name
          }
          topics(first: 5) {
            edges {
              node {
                name
              }
            }
          }
        }
      }
    }
  }
`

interface PHNode {
  id: string
  name: string
  tagline: string
  url: string
  votesCount: number
  commentsCount: number
  createdAt: string
  website: string | null
  makers: { name: string }[]
  topics: { edges: { node: { name: string } }[] }
}

export async function runProductHuntCollector(): Promise<{ upserted: number }> {
  const token = process.env.PRODUCTHUNT_TOKEN
  if (!token) {
    console.warn('[producthunt] PRODUCTHUNT_TOKEN not set, skipping')
    return { upserted: 0 }
  }

  const supabase = createServerClient()
  const twoDaysAgo = new Date(Date.now() - 48 * 3_600_000).toISOString()

  const res = await fetch(PH_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: POSTS_QUERY,
      variables: { postedAfter: twoDaysAgo },
    }),
  })

  if (!res.ok) {
    console.error('[producthunt] API error:', res.status, await res.text())
    return { upserted: 0 }
  }

  const json = await res.json()
  const edges: { node: PHNode }[] = json?.data?.posts?.edges ?? []

  let upserted = 0
  for (const { node } of edges) {
    const maker = node.makers?.[0]?.name ?? null
    const description = node.tagline
    const url = node.website ?? node.url

    const { data: post, error } = await supabase
      .from('posts')
      .upsert(
        {
          title: node.name,
          url,
          platform: 'producthunt',
          author: maker,
          description,
          published_at: node.createdAt,
          type: 'product' as const,
          external_id: `ph:${node.id}`,
        },
        { onConflict: 'external_id' }
      )
      .select('id')
      .single()

    if (error || !post) continue

    await supabase.from('metrics_history').insert({
      post_id: post.id,
      upvotes: node.votesCount,
      comments: node.commentsCount,
      stars: 0,
      score: node.votesCount,
    })

    upserted++
  }

  console.log(`[producthunt] upserted ${upserted} products`)
  return { upserted }
}
