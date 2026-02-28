import OpenAI from 'openai'
import { createServerClient } from '@/lib/supabase/server'
import { computeMomentumForPosts } from '@/lib/scoring/momentum'
import { computeTopicScore } from '@/lib/scoring/ranking'

const SIMILARITY_THRESHOLD = 0.3

interface PostRow {
  id: string
  title: string
  description: string | null
  embedding: number[] | null
}

interface TopicPost {
  topic_id: string
  post_id: string
}

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

async function generateEmbedding(openai: OpenAI, text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000),
  })
  return res.data[0].embedding
}

async function generateTopicTitle(openai: OpenAI, titles: string[]): Promise<string> {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You generate concise topic titles (3-6 words) that describe what a group of developer content is about. Return only the title, no punctuation.',
      },
      {
        role: 'user',
        content: `These posts are all about the same topic:\n${titles.slice(0, 5).join('\n')}\n\nGenerate a short, clear topic title:`,
      },
    ],
    max_tokens: 20,
    temperature: 0.3,
  })
  return res.choices[0].message.content?.trim() ?? titles[0].slice(0, 60)
}

export async function runClusteringJob(): Promise<{ processed: number; topicsCreated: number; topicsUpdated: number }> {
  const supabase = createServerClient()
  const openai = getOpenAI()
  let processed = 0
  let topicsCreated = 0
  let topicsUpdated = 0

  // Step 1: Fetch posts without embeddings (process up to 100 per run to stay within time limits)
  const { data: unembedded } = await supabase
    .from('posts')
    .select('id, title, description')
    .is('embedding', null)
    .order('created_at', { ascending: false })
    .limit(100)

  if (!unembedded || unembedded.length === 0) {
    // Still recompute trend scores even if no new embeddings
    await recomputeAllTopicScores()
    return { processed: 0, topicsCreated: 0, topicsUpdated: 0 }
  }

  // Step 2: Generate embeddings in batches of 20
  const batchSize = 20
  for (let i = 0; i < unembedded.length; i += batchSize) {
    const batch = unembedded.slice(i, i + batchSize) as PostRow[]
    const inputs = batch.map((p) =>
      `${p.title} ${p.description ?? ''}`.trim()
    )

    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: inputs,
    })

    for (let j = 0; j < batch.length; j++) {
      const post = batch[j]
      const embedding = embeddingRes.data[j].embedding

      await supabase
        .from('posts')
        .update({ embedding })
        .eq('id', post.id)

      processed++
    }
  }

  // Step 3: For each newly embedded post, find or create a topic
  const { data: newlyEmbedded } = await supabase
    .from('posts')
    .select('id, title, description, embedding')
    .in('id', unembedded.map((p) => p.id))

  if (!newlyEmbedded) return { processed, topicsCreated, topicsUpdated }

  for (const post of newlyEmbedded as PostRow[]) {
    if (!post.embedding) continue

    // Check if already in a topic
    const { data: existingLink } = await supabase
      .from('topic_posts')
      .select('topic_id')
      .eq('post_id', post.id)
      .single()

    if (existingLink) continue

    // Find nearest neighbors via pgvector
    const { data: neighbors } = await supabase.rpc('find_similar_posts', {
      query_embedding: post.embedding,
      similarity_threshold: SIMILARITY_THRESHOLD,
      exclude_post_id: post.id,
      match_count: 10,
    })

    if (neighbors && neighbors.length > 0) {
      // Check if any neighbor is already in a topic
      const neighborIds = neighbors.map((n: { id: string }) => n.id)
      const { data: neighborTopics } = await supabase
        .from('topic_posts')
        .select('topic_id')
        .in('post_id', neighborIds)
        .limit(1)
        .single()

      if (neighborTopics) {
        // Add to existing topic
        await supabase.from('topic_posts').insert({
          topic_id: neighborTopics.topic_id,
          post_id: post.id,
        })
        topicsUpdated++
      } else {
        // Create new topic from this cluster
        const allTitles = [post.title, ...neighbors.map((n: { title: string }) => n.title)]
        const topicTitle = await generateTopicTitle(openai, allTitles)

        const { data: newTopic } = await supabase
          .from('topics')
          .insert({
            title: topicTitle,
            description: `Cluster of related ${post.title} discussions`,
            trend_score: 0,
            momentum_label: 'new',
            platform_count: 1,
            signals: [],
          })
          .select('id')
          .single()

        if (newTopic) {
          const postsToLink: TopicPost[] = [
            { topic_id: newTopic.id, post_id: post.id },
            ...neighborIds.map((nid: string) => ({ topic_id: newTopic.id, post_id: nid })),
          ]

          await supabase.from('topic_posts').upsert(postsToLink, {
            onConflict: 'topic_id,post_id',
            ignoreDuplicates: true,
          })

          topicsCreated++
        }
      }
    } else {
      // No neighbors — create a solo topic
      const { data: soloTopic } = await supabase
        .from('topics')
        .insert({
          title: post.title.slice(0, 100),
          description: post.description?.slice(0, 300) ?? '',
          trend_score: 0,
          momentum_label: 'new',
          platform_count: 1,
          signals: [],
        })
        .select('id')
        .single()

      if (soloTopic) {
        await supabase.from('topic_posts').insert({
          topic_id: soloTopic.id,
          post_id: post.id,
        })
        topicsCreated++
      }
    }
  }

  // Step 4: Recompute trend scores for all topics
  await recomputeAllTopicScores()

  return { processed, topicsCreated, topicsUpdated }
}

async function recomputeAllTopicScores() {
  const supabase = createServerClient()

  const { data: topicsWithPosts } = await supabase
    .from('topic_posts')
    .select('topic_id, post_id, topics(created_at)')

  if (!topicsWithPosts) return

  const topicMap = new Map<string, { postIds: string[]; createdAt: string }>()
  for (const row of topicsWithPosts) {
    const entry = topicMap.get(row.topic_id) ?? {
      postIds: [],
      createdAt: (row as { topics?: { created_at?: string } }).topics?.created_at ?? new Date().toISOString(),
    }
    entry.postIds.push(row.post_id)
    topicMap.set(row.topic_id, entry)
  }

  for (const [topicId, { postIds, createdAt }] of topicMap.entries()) {
    const postMomentums = await computeMomentumForPosts(postIds)
    const score = computeTopicScore({ topicId, postMomentums, createdAt })

    const uniquePlatforms = [...new Set(postMomentums.map((p) => p.platform))]

    await supabase
      .from('topics')
      .update({
        trend_score: score.trendScore,
        momentum_label: score.momentumLabel,
        platform_count: score.platformCount,
        signals: uniquePlatforms,
      })
      .eq('id', topicId)
  }
}
