import { createServerClient } from '@/lib/supabase/server'

interface GitHubRepo {
  id: number
  full_name: string
  html_url: string
  description: string | null
  owner: { login: string }
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  pushed_at: string
  created_at: string
}

interface GitHubSearchResponse {
  items: GitHubRepo[]
}

async function fetchTrendingRepos(): Promise<GitHubRepo[]> {
  const yesterday = new Date(Date.now() - 86400 * 1000).toISOString().split('T')[0]
  const url = `https://api.github.com/search/repositories?q=stars:>100+pushed:>${yesterday}&sort=stars&order=desc&per_page=50`

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'BuilderPulse/1.0',
    },
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`)
  }

  const data: GitHubSearchResponse = await res.json()
  return data.items
}

export async function runGitHubCollector(): Promise<{ collected: number; errors: string[] }> {
  const supabase = createServerClient()
  const errors: string[] = []
  let collected = 0

  const repos = await fetchTrendingRepos()

  for (const repo of repos) {
    try {
      const externalId = `github-${repo.id}`

      const { data: post, error: upsertError } = await supabase
        .from('posts')
        .upsert(
          {
            title: repo.full_name,
            url: repo.html_url,
            platform: 'github',
            author: repo.owner.login,
            description: repo.description ?? '',
            published_at: repo.created_at,
            type: 'repo',
            external_id: externalId,
          },
          { onConflict: 'external_id', ignoreDuplicates: false }
        )
        .select('id')
        .single()

      if (upsertError) {
        // Try fetching by external_id if upsert fails
        const { data: existing } = await supabase
          .from('posts')
          .select('id')
          .eq('external_id', externalId)
          .single()

        if (!existing) {
          errors.push(`Failed to upsert repo ${repo.full_name}: ${upsertError.message}`)
          continue
        }

        await supabase.from('metrics_history').insert({
          post_id: existing.id,
          stars: repo.stargazers_count,
          comments: repo.open_issues_count,
          upvotes: repo.forks_count,
          score: repo.stargazers_count,
        })
      } else if (post) {
        await supabase.from('metrics_history').insert({
          post_id: post.id,
          stars: repo.stargazers_count,
          comments: repo.open_issues_count,
          upvotes: repo.forks_count,
          score: repo.stargazers_count,
        })
      }

      collected++
    } catch (err) {
      errors.push(`Error processing repo ${repo.full_name}: ${String(err)}`)
    }
  }

  return { collected, errors }
}
