-- General product feedback from users
create table feedback (
  id         uuid        primary key default gen_random_uuid(),
  message    text        not null check (char_length(message) between 1 and 1000),
  created_at timestamptz default now()
);

alter table feedback enable row level security;
