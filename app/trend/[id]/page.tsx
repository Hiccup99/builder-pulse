import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MomentumBadge } from '@/app/components/momentum-badge'
import { PlatformLabel } from '@/app/components/signal-icons'
import { MetricBar } from '@/app/components/metric-bar'
import type { TrendDetail, PostSummary, Platform } from '@/lib/types'

async function getTrend(id: string): Promise<TrendDetail | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/trends/${id}`, {
      next: { revalidate: 30 },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.trend ?? null
  } catch {
    return null
  }
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return days === 1 ? '1 day ago' : `${days} days ago`
}

function PostRow({ post }: { post: PostSummary }) {
  const metric =
    post.platform === 'github'
      ? post.latest_stars > 0
        ? `${post.latest_stars.toLocaleString()} stars`
        : null
      : post.platform === 'hackernews'
      ? post.latest_score > 0
        ? `${post.latest_score} pts · ${post.latest_comments} comments`
        : null
      : post.platform === 'reddit'
      ? post.latest_upvotes > 0
        ? `${post.latest_upvotes.toLocaleString()} upvotes · ${post.latest_comments} comments`
        : null
      : null

  return (
    <a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-3 py-3 border-b border-[#f3f4f6] last:border-0 hover:bg-[#fafafa] -mx-4 px-4 rounded-lg transition-colors"
    >
      <div className="mt-0.5 shrink-0">
        <PlatformLabel platform={post.platform as Platform} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#111111] group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
          {post.title}
        </p>
        <div className="flex items-center gap-3 mt-1">
          {metric && (
            <span className="text-xs text-[#374151] font-medium">{metric}</span>
          )}
          {post.author && (
            <span className="text-xs text-[#9ca3af]">by {post.author}</span>
          )}
          {post.published_at && (
            <span className="text-xs text-[#9ca3af]">{timeAgo(post.published_at)}</span>
          )}
        </div>
      </div>
      <span className="shrink-0 text-[#d1d5db] group-hover:text-indigo-400 text-sm mt-0.5">↗</span>
    </a>
  )
}

function PlatformSection({
  platform,
  posts,
}: {
  platform: Platform
  posts: PostSummary[]
}) {
  if (posts.length === 0) return null

  const titles: Record<Platform, string> = {
    github: 'GitHub Repositories',
    hackernews: 'Hacker News Discussions',
    reddit: 'Reddit Threads',
    blog: 'Articles & Blogs',
    producthunt: 'Product Hunt Launches',
    npm: 'npm Packages',
  }

  return (
    <section className="bg-white border border-[#e5e7eb] rounded-xl p-5">
      <h2 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">
        {titles[platform]}
      </h2>
      <div>
        {posts.slice(0, 10).map((post) => (
          <PostRow key={post.id} post={post} />
        ))}
      </div>
    </section>
  )
}

export default async function TrendPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const trend = await getTrend(id)
  if (!trend) notFound()

  const github = trend.posts.filter((p) => p.platform === 'github')
  const hackernews = trend.posts.filter((p) => p.platform === 'hackernews')
  const reddit = trend.posts.filter((p) => p.platform === 'reddit')
  const blog = trend.posts.filter((p) => p.platform === 'blog')

  const totalStars = github.reduce((s, p) => s + p.latest_stars, 0)
  const totalComments = trend.posts.reduce((s, p) => s + p.latest_comments, 0)
  const topHN = [...hackernews].sort((a, b) => b.latest_score - a.latest_score)[0]

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-8">
        <Link
          href="/"
          className="text-xs text-[#6b7280] hover:text-[#111111] transition-colors mb-6 inline-block"
        >
          ← Back to trends
        </Link>

        <div className="flex items-start gap-3 mb-3">
          <h1 className="text-2xl font-bold text-[#111111] tracking-tight leading-tight flex-1">
            {trend.title}
          </h1>
          <MomentumBadge label={trend.momentum_label} />
        </div>

        {trend.description && (
          <p className="text-sm text-[#6b7280] leading-relaxed max-w-2xl">
            {trend.description}
          </p>
        )}

        <p className="text-xs text-[#9ca3af] mt-2">
          Last updated {timeAgo(trend.updated_at)}
        </p>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-4">
          <MetricBar
            label="Signals"
            value={trend.post_count}
            sub="across platforms"
          />
        </div>
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-4">
          <MetricBar
            label="Platforms"
            value={trend.platform_count}
            sub="detected"
          />
        </div>
        {totalStars > 0 && (
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-4">
            <MetricBar
              label="GitHub Stars"
              value={totalStars}
              sub="across repos"
            />
          </div>
        )}
        {topHN && (
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-4">
            <MetricBar
              label="Top HN Score"
              value={topHN.latest_score}
              sub={`${topHN.latest_comments} comments`}
            />
          </div>
        )}
        {totalComments > 0 && !topHN && (
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-4">
            <MetricBar
              label="Comments"
              value={totalComments}
              sub="total engagement"
            />
          </div>
        )}
      </div>

      {/* Platform sections */}
      <div className="flex flex-col gap-5">
        <PlatformSection platform="github" posts={github} />
        <PlatformSection platform="hackernews" posts={hackernews} />
        <PlatformSection platform="reddit" posts={reddit} />
        <PlatformSection platform="blog" posts={blog} />
      </div>
    </div>
  )
}
