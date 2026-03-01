-- Discovery layers + new data sources (Product Hunt, npm)

-- Layer classification
alter table posts add column layer text check (layer in ('promising','trending','hall_of_fame'));
alter table posts add column velocity float default 0;

-- New platform scores
alter table posts add column ph_momentum float default 0;
alter table posts add column npm_traction float default 0;

-- Expand platform constraint
alter table posts drop constraint posts_platform_check;
alter table posts add constraint posts_platform_check check (platform in ('github','hackernews','reddit','blog','producthunt','npm'));

-- Expand type constraint
alter table posts drop constraint posts_type_check;
alter table posts add constraint posts_type_check check (type in ('repo','discussion','article','product','package'));

-- npm metrics columns
alter table metrics_history add column downloads_weekly int default 0;
alter table metrics_history add column download_growth float default 0;

-- Indexes
create index idx_posts_layer on posts(layer) where layer is not null;
create index idx_posts_ph_momentum on posts(ph_momentum desc) where platform = 'producthunt';
create index idx_posts_npm_traction on posts(npm_traction desc) where platform = 'npm';
