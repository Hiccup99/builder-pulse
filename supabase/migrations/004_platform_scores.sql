-- Per-platform momentum scores on posts
alter table posts add column github_momentum float default 0;
alter table posts add column hn_heat float default 0;
alter table posts add column reddit_buzz float default 0;
alter table posts add column is_early_breakout boolean default false;
alter table posts add column signal_label text;

-- Richer GitHub metrics
alter table metrics_history add column forks int default 0;
alter table metrics_history add column contributors int default 0;

-- Indexes for platform score queries
create index idx_posts_github_momentum on posts(github_momentum desc) where platform = 'github';
create index idx_posts_hn_heat on posts(hn_heat desc) where platform = 'hackernews';
create index idx_posts_reddit_buzz on posts(reddit_buzz desc) where platform = 'reddit';
create index idx_posts_breakout on posts(is_early_breakout) where is_early_breakout = true;
