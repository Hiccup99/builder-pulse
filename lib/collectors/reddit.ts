import { createServerClient } from '@/lib/supabase/server'

interface RedditPost {
  data: {
    id: string
    title: string
    url: string
    permalink: string
    author: string
    selftext: string
    ups: number
    num_comments: number
    created_utc: number
    subreddit: string
  }
}

interface RedditListing {
  data: {
    children: RedditPost[]
  }
}

const SUBREDDITS = [
  'programming',
  'webdev',
  'javascript',
  'devops',
  'MachineLearning',
  'rust',
  'golang',
  'LocalLLaMA',
  'opensource',
  'startups',
  'SideProject',
]

async function fetchSubreddit(sub: string): Promise<RedditPost['data'][]> {
  const url = `https://www.reddit.com/r/${sub}/hot.json?limit=25`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'BuilderPulse/1.0 (signal detection bot; contact@builderpulse.dev)',
    },
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    throw new Error(`Reddit API error for r/${sub}: ${res.status}`)
  }

  const listing: RedditListing = await res.json()
  return listing.data.children.map((c) => c.data)
}

export async function runRedditCollector(): Promise<{ collected: number; errors: string[] }> {
  const supabase = createServerClient()
  const errors: string[] = []
  let collected = 0

  for (const sub of SUBREDDITS) {
    let posts: RedditPost['data'][] = []

    try {
      posts = await fetchSubreddit(sub)
    } catch (err) {
      errors.push(`Failed to fetch r/${sub}: ${String(err)}`)
      continue
    }

    for (const post of posts) {
      try {
        const externalId = `reddit-${post.id}`
        const url = `https://reddit.com${post.permalink}`
        const publishedAt = new Date(post.created_utc * 1000).toISOString()

        const { data: upserted, error: upsertError } = await supabase
          .from('posts')
          .upsert(
            {
              title: post.title,
              url,
              platform: 'reddit',
              author: post.author,
              description: post.selftext?.slice(0, 500) ?? '',
              published_at: publishedAt,
              type: 'discussion',
              external_id: externalId,
            },
            { onConflict: 'external_id', ignoreDuplicates: false }
          )
          .select('id')
          .single()

        const postId = upserted?.id ?? (await supabase
          .from('posts')
          .select('id')
          .eq('external_id', externalId)
          .single()
          .then((r) => r.data?.id))

        if (upsertError && !postId) {
          errors.push(`Failed to upsert Reddit post ${post.id}: ${upsertError.message}`)
          continue
        }

        if (postId) {
          await supabase.from('metrics_history').insert({
            post_id: postId,
            stars: 0,
            comments: post.num_comments,
            upvotes: post.ups,
            score: post.ups,
          })
        }

        collected++
      } catch (err) {
        errors.push(`Error processing Reddit post ${post.id}: ${String(err)}`)
      }
    }
  }

  return { collected, errors }
}
