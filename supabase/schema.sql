-- ============================================================
-- Builder Pulse — complete database schema
-- Source of truth for all Supabase tables, policies, indexes,
-- and functions. Run this in a fresh Supabase project to get
-- a fully configured database.
--
-- Individual migration files in supabase/migrations/ document
-- the history of changes. This file reflects the current state.
-- ============================================================

-- Extensions
create extension if not exists vector;

-- ─────────────────────────────────────────────
-- Core content tables
-- ─────────────────────────────────────────────

-- Raw content collected from GitHub, Hacker News, Reddit, blogs
create table posts (
  id          uuid        primary key default gen_random_uuid(),
  title       text        not null,
  url         text        unique not null,
  platform    text        not null check (platform in ('github','hackernews','reddit','blog','producthunt','npm')),
  author      text,
  description text,
  published_at timestamptz,
  type        text        not null check (type in ('repo','discussion','article','product','package')),
  external_id text        unique,
  embedding   vector(1536),
  github_momentum float default 0,
  hn_heat     float       default 0,
  reddit_buzz float       default 0,
  is_early_breakout boolean default false,
  signal_label text,
  layer       text        check (layer in ('promising','trending','hall_of_fame')),
  velocity    float       default 0,
  ph_momentum float       default 0,
  npm_traction float      default 0,
  created_at  timestamptz default now()
);

-- Metrics snapshots appended each cron run (never updated, only inserted)
create table metrics_history (
  id           uuid        primary key default gen_random_uuid(),
  post_id      uuid        references posts(id) on delete cascade not null,
  stars        int         default 0,
  comments     int         default 0,
  upvotes      int         default 0,
  score        int         default 0,
  forks        int         default 0,
  contributors int         default 0,
  downloads_weekly int     default 0,
  download_growth float    default 0,
  collected_at timestamptz default now()
);

-- Clustered topics representing a momentum signal in the ecosystem
create table topics (
  id             uuid        primary key default gen_random_uuid(),
  title          text        not null,
  description    text,
  trend_score    float       default 0,
  momentum_label text        check (momentum_label in ('new','rising','exploding')),
  platform_count int         default 1,
  signals        jsonb       default '[]',
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- Many-to-many join: topics <-> posts
create table topic_posts (
  topic_id uuid references topics(id) on delete cascade,
  post_id  uuid references posts(id)  on delete cascade,
  primary key (topic_id, post_id)
);

-- ─────────────────────────────────────────────
-- User feedback tables
-- ─────────────────────────────────────────────

-- Sources users say they monitor (used to prioritise new integrations)
create table source_suggestions (
  id         uuid        primary key default gen_random_uuid(),
  sources    text[]      not null,
  created_at timestamptz default now()
);

-- One-per-device "support the initiative" hearts
create table support_hearts (
  id         uuid        primary key default gen_random_uuid(),
  created_at timestamptz default now()
);

-- General product feedback messages from users
create table feedback (
  id         uuid        primary key default gen_random_uuid(),
  message    text        not null check (char_length(message) between 1 and 1000),
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────

create index idx_posts_platform    on posts(platform);
create index idx_posts_embedding   on posts using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index idx_metrics_post_time on metrics_history(post_id, collected_at desc);
create index idx_topics_trend      on topics(trend_score desc);
create index idx_topics_updated    on topics(updated_at desc);
create index idx_posts_github_momentum on posts(github_momentum desc) where platform = 'github';
create index idx_posts_hn_heat     on posts(hn_heat desc) where platform = 'hackernews';
create index idx_posts_reddit_buzz on posts(reddit_buzz desc) where platform = 'reddit';
create index idx_posts_breakout    on posts(is_early_breakout) where is_early_breakout = true;
create index idx_posts_layer       on posts(layer) where layer is not null;
create index idx_posts_ph_momentum on posts(ph_momentum desc) where platform = 'producthunt';
create index idx_posts_npm_traction on posts(npm_traction desc) where platform = 'npm';

-- ─────────────────────────────────────────────
-- Row-level security
-- ─────────────────────────────────────────────

alter table posts              enable row level security;
alter table metrics_history    enable row level security;
alter table topics             enable row level security;
alter table topic_posts        enable row level security;
alter table source_suggestions enable row level security;
alter table support_hearts     enable row level security;
alter table feedback           enable row level security;

-- Public read: frontend uses anon key to query trends and posts
create policy "Public read topics"         on topics         for select using (true);
create policy "Public read posts"          on posts          for select using (true);
create policy "Public read topic_posts"    on topic_posts    for select using (true);
create policy "Public read metrics_history" on metrics_history for select using (true);

-- Feedback tables: no public reads (only service role can access)

-- ─────────────────────────────────────────────
-- Functions
-- ─────────────────────────────────────────────

-- pgvector nearest-neighbour search used by the clustering job
create or replace function find_similar_posts(
  query_embedding    vector(1536),
  similarity_threshold float,
  exclude_post_id    uuid,
  match_count        int
)
returns table (
  id         uuid,
  title      text,
  platform   text,
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

-- Auto-update topics.updated_at on any row update
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
