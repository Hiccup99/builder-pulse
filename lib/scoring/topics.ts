import { createServerClient } from '@/lib/supabase/server'

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'its', 'was', 'are', 'be',
  'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
  'i', 'you', 'he', 'she', 'we', 'they', 'my', 'your', 'his', 'her',
  'our', 'their', 'what', 'which', 'who', 'whom', 'how', 'when', 'where',
  'why', 'not', 'no', 'if', 'then', 'else', 'so', 'as', 'up', 'out',
  'about', 'into', 'over', 'after', 'before', 'between', 'under', 'above',
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
  'such', 'than', 'too', 'very', 'just', 'also', 'now', 'new', 'like',
  'show', 'hn', 'ask', 'tell', 'via', 'using', 'use', 'get', 'got',
  'one', 'two', 'first', 'way', 'make', 'made', 'much', 'many', 'own',
  'here', 'there', 'only', 'still', 'even', 'back', 'any', 'well',
  'already', 'need', 'want', 'going', 'been', 'being', 'vs', 'yet',
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s+#.-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
}

function extractNgrams(tokens: string[], n: number): string[] {
  const ngrams: string[] = []
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n).join(' '))
  }
  return ngrams
}

function countPhrases(posts: { title: string }[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const post of posts) {
    const tokens = tokenize(post.title)
    const bigrams = extractNgrams(tokens, 2)
    const trigrams = extractNgrams(tokens, 3)
    const seen = new Set<string>()
    for (const phrase of [...bigrams, ...trigrams]) {
      if (seen.has(phrase)) continue
      seen.add(phrase)
      counts.set(phrase, (counts.get(phrase) ?? 0) + 1)
    }
  }
  return counts
}

function capitalize(phrase: string): string {
  return phrase.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export async function extractTrendingTopics(hoursBack = 48, limit = 10): Promise<string[]> {
  const supabase = createServerClient()
  const since = new Date(Date.now() - hoursBack * 3_600_000).toISOString()

  const { data: posts } = await supabase
    .from('posts')
    .select('title')
    .gte('created_at', since)
    .limit(500)

  if (!posts || posts.length === 0) return []

  const counts = countPhrases(posts)
  return [...counts.entries()]
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([phrase]) => capitalize(phrase))
}

export async function extractEmergingTopics(limit = 8): Promise<string[]> {
  const supabase = createServerClient()
  const now = Date.now()
  const recentSince = new Date(now - 24 * 3_600_000).toISOString()
  const previousSince = new Date(now - 48 * 3_600_000).toISOString()

  const [{ data: recentPosts }, { data: previousPosts }] = await Promise.all([
    supabase.from('posts').select('title').gte('created_at', recentSince).limit(500),
    supabase.from('posts').select('title').gte('created_at', previousSince).lt('created_at', recentSince).limit(500),
  ])

  if (!recentPosts || recentPosts.length === 0) return []

  const recentCounts = countPhrases(recentPosts)
  const previousCounts = previousPosts ? countPhrases(previousPosts) : new Map<string, number>()

  const emerging: [string, number][] = []
  for (const [phrase, recentCount] of recentCounts) {
    if (recentCount < 2) continue
    const prevCount = previousCounts.get(phrase) ?? 0
    const growth = prevCount === 0 ? recentCount * 2 : (recentCount - prevCount) / prevCount
    if (growth > 0) {
      emerging.push([phrase, growth])
    }
  }

  return emerging
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([phrase]) => capitalize(phrase))
}
