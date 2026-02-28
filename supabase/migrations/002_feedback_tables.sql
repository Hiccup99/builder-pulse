-- Source suggestions from users
create table source_suggestions (
  id uuid primary key default gen_random_uuid(),
  sources text[] not null,
  created_at timestamptz default now()
);

-- Support hearts (one per device, enforced on client via localStorage token)
create table support_hearts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now()
);

-- RLS: insert-only via service role (API route), no public reads needed
alter table source_suggestions enable row level security;
alter table support_hearts enable row level security;
