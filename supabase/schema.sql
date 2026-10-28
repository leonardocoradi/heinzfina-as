-- ============================================================
-- Família Heinz — Supabase Schema
-- Rode este script no SQL Editor do seu projeto:
--   https://adkcbljnfouvnzoeykin.supabase.co → SQL Editor → New query
-- ============================================================

-- Lançamentos (rendas e despesas)
-- amount/paid/total_amount são armazenados em CENTAVOS (inteiro).
create table if not exists public.entries (
  id                  text primary key,
  type                text not null check (type in ('income', 'expense')),
  scope               text not null check (scope in ('empresa', 'pessoal')),
  category_id         text not null,
  description         text not null default '',
  amount              bigint not null,
  paid                bigint not null default 0,
  date                text not null,
  fixed               boolean not null default false,
  installment_index   integer,
  installment_count   integer,
  total_amount        bigint,
  group_id            text,
  from_reserve        boolean not null default false,
  paid_upfront        boolean not null default false,
  paid_at             text,
  created_at          text not null default now()::text
);

create index if not exists entries_date_idx on public.entries (date);
create index if not exists entries_scope_idx on public.entries (scope);

-- Categorias
create table if not exists public.categories (
  id    text primary key,
  name  text not null,
  color text not null default '#34d399',
  icon  text not null default 'Tag'
);

-- Meta (por enquanto: reserva)
create table if not exists public.meta (
  id      integer primary key check (id = 1),
  reserve bigint not null default 0
);

-- ============================================================
-- Row Level Security
-- O app ainda não tem login, então liberamos acesso público
-- (anônimo) usando a publishable key. Assim que houver autenticação,
-- troque os policies para usar auth.uid() e restrinja o acesso.
-- ============================================================

alter table public.entries enable row level security;
alter table public.categories enable row level security;
alter table public.meta enable row level security;

drop policy if exists "entries_select" on public.entries;
create policy "entries_select" on public.entries for select using (true);

drop policy if exists "entries_insert" on public.entries;
create policy "entries_insert" on public.entries for insert with check (true);

drop policy if exists "entries_update" on public.entries;
create policy "entries_update" on public.entries for update using (true);

drop policy if exists "entries_delete" on public.entries;
create policy "entries_delete" on public.entries for delete using (true);

drop policy if exists "categories_select" on public.categories;
create policy "categories_select" on public.categories for select using (true);

drop policy if exists "categories_insert" on public.categories;
create policy "categories_insert" on public.categories for insert with check (true);

drop policy if exists "categories_update" on public.categories;
create policy "categories_update" on public.categories for update using (true);

drop policy if exists "categories_delete" on public.categories;
create policy "categories_delete" on public.categories for delete using (true);

drop policy if exists "meta_select" on public.meta;
create policy "meta_select" on public.meta for select using (true);

drop policy if exists "meta_insert" on public.meta;
create policy "meta_insert" on public.meta for insert with check (true);

drop policy if exists "meta_update" on public.meta;
create policy "meta_update" on public.meta for update using (true);

drop policy if exists "meta_delete" on public.meta;
create policy "meta_delete" on public.meta for delete using (true);
