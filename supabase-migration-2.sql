-- ═══════════════════════════════════════════════════════════════
--  Энергетик · ОБНОВЛЕНИЕ 2: вход по имени+паролю, очистка пробегов
--  Supabase → SQL Editor → New query → вставить всё → Run
-- ═══════════════════════════════════════════════════════════════

-- 1) Логин: имя (уникальное) + хеш пароля
alter table members add column if not exists login text;
alter table members add column if not exists pass_hash text;
-- имя-логин должно быть уникальным (без учёта регистра)
create unique index if not exists members_login_uniq on members (lower(login));

-- 2) Стираем ТОЛЬКО пробеги (люди внесут заново). Чаты и сообщения не трогаем.
delete from runs;

-- Готово. Чат общий, «Барахолка» и остальные чаты остаются как есть.
