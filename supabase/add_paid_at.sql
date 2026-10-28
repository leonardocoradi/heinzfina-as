-- Registra a data da última confirmação de pagamento de cada lançamento.
-- Pode ser executado com segurança no SQL Editor do Supabase.
alter table public.entries
add column if not exists paid_at text;
