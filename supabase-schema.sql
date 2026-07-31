-- ═══════════════════════════════════════════════════════════════
--  Энергетик · схема базы данных для Supabase
--  Открой Supabase → SQL Editor → New query → вставь всё это → Run
-- ═══════════════════════════════════════════════════════════════

create table if not exists runs (
  id uuid primary key default gen_random_uuid(),
  member_id text not null,
  name text not null,
  ava text,
  km numeric not null,
  note text,
  date date not null,
  created_at timestamptz default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  type text,
  place text,
  descr text,
  created_at timestamptz default now()
);

create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  data text not null,
  created_at timestamptz default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  member_id text not null,
  name text not null,
  ava text,
  text text,
  photo_id uuid,
  poll jsonb,
  created_at timestamptz default now()
);

create table if not exists reactions (
  message_id uuid not null,
  member_id text not null,
  emoji text not null,
  primary key (message_id, member_id, emoji)
);

create table if not exists votes (
  message_id uuid not null,
  member_id text not null,
  choice int not null,
  primary key (message_id, member_id)
);

-- ── Доступ (клубное приложение без входа: читают и пишут все) ──
alter table runs      enable row level security;
alter table events    enable row level security;
alter table photos    enable row level security;
alter table messages  enable row level security;
alter table reactions enable row level security;
alter table votes     enable row level security;

create policy "open" on runs      for all using (true) with check (true);
create policy "open" on events    for all using (true) with check (true);
create policy "open" on photos    for all using (true) with check (true);
create policy "open" on messages  for all using (true) with check (true);
create policy "open" on reactions for all using (true) with check (true);
create policy "open" on votes     for all using (true) with check (true);

-- ── Realtime (живой чат, таблица и календарь) ──
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table reactions;
alter publication supabase_realtime add table votes;
alter publication supabase_realtime add table runs;
alter publication supabase_realtime add table events;
