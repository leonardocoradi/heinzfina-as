-- Registra quem quitou a despesa. Rode uma vez no SQL Editor do Supabase.
alter table public.entries
  add column if not exists payment_payer text check (payment_payer in ('self', 'client')),
  add column if not exists client_name text;
