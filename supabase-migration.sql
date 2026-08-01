-- ═══════════════════════════════════════════════════════════════
--  Энергетик · ОБНОВЛЕНИЕ базы (чаты-комнаты, ответы, профили/аватары)
--  Для тех, у кого база уже создана. Выполнить один раз:
--  Supabase → SQL Editor → New query → вставить всё → Run
-- ═══════════════════════════════════════════════════════════════

-- Чаты-комнаты
create table if not exists chats (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  icon text,
  is_general boolean default false,
  created_by text,
  created_at timestamptz default now()
);

-- Новые поля сообщений: к какому чату относится и ответ на какое сообщение
alter table messages add column if not exists chat_id uuid;
alter table messages add column if not exists reply_to uuid;

-- Профили участников (имя + аватар: эмодзи или фото)
create table if not exists members (
  id text primary key,
  name text,
  ava text,
  photo_id uuid,
  updated_at timestamptz default now()
);

-- Доступ (клубное приложение без входа)
alter table chats   enable row level security;
alter table members enable row level security;
drop policy if exists "open" on chats;   create policy "open" on chats   for all using (true) with check (true);
drop policy if exists "open" on members; create policy "open" on members for all using (true) with check (true);

-- Создать «Общий чат» и перенести в него все существующие сообщения
insert into chats (title, icon, is_general)
select 'Общий чат', '💬', true
where not exists (select 1 from chats where is_general = true);

update messages
set chat_id = (select id from chats where is_general = true limit 1)
where chat_id is null;

-- Realtime для новых таблиц
do $$
begin
  begin alter publication supabase_realtime add table chats;   exception when others then null; end;
  begin alter publication supabase_realtime add table members; exception when others then null; end;
end $$;
