-- Enable pgvector extension
create extension if not exists vector;

-- Posts: raw content from GitHub, HN, Reddit, blogs
create table posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text unique not null,
  platform text not null check (platform in ('github','hackernews','reddit','blog')),
  author text,
  description text,
  published_at timestamptz,
  type text not null check (type in ('repo','discussion','article')),
  external_id text unique,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- Metrics snapshots collected each cron run
create table metrics_history (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade not null,
  stars int default 0,
  comments int default 0,
  upvotes int default 0,
  score int default 0,
  collected_at timestamptz default now()
);

-- Clustered topics representing momentum signals
create table topics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  trend_score float default 0,
  momentum_label text check (momentum_label in ('new','rising','exploding')),
  platform_count int default 1,
  signals jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Many-to-many: topics <-> posts
create table topic_posts (
  topic_id uuid references topics(id) on delete cascade,
  post_id uuid references posts(id) on delete cascade,
  primary key (topic_id, post_id)
);

-- Indexes
create index idx_posts_platform on posts(platform);
create index idx_posts_embedding on posts using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index idx_metrics_post_time on metrics_history(post_id, collected_at desc);
create index idx_topics_trend on topics(trend_score desc);
create index idx_topics_updated on topics(updated_at desc);

-- RLS: allow public read on topics and topic_posts; writes via service role only
alter table topics enable row level security;
alter table posts enable row level security;
alter table metrics_history enable row level security;
alter table topic_posts enable row level security;

create policy "Public read topics" on topics for select using (true);
create policy "Public read posts" on posts for select using (true);
create policy "Public read topic_posts" on topic_posts for select using (true);
create policy "Public read metrics_history" on metrics_history for select using (true);

-- pgvector similarity search function
create or replace function find_similar_posts(
  query_embedding vector(1536),
  similarity_threshold float,
  exclude_post_id uuid,
  match_count int
)
returns table (
  id uuid,
  title text,
  platform text,
  similarity float
)
language sql stable
as $$
  select
    p.id,
    p.title,
    p.platform,
    1 - (p.embedding <=> query_embedding) as similarity
  from posts p
  where
    p.embedding is not null
    and p.id != exclude_post_id
    and 1 - (p.embedding <=> query_embedding) > similarity_threshold
  order by p.embedding <=> query_embedding
  limit match_count;
$$;

-- Function to update topics.updated_at automatically
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger topics_updated_at
  before update on topics
  for each row execute function update_updated_at();
