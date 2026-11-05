-- Contas criadas pelo servidor (webhook de compra) nascem com uma senha temporária.
-- Enquanto a linha existir, a aluna só consegue definir a senha nova (POST /api/senha).
-- A marca fica aqui, e não no app_metadata do usuário, porque os metadados viajam dentro do
-- JWT e aparecem no localStorage do navegador. Esta tabela só o servidor lê.
create table public.senhas_temporarias (
  user_id uuid primary key references auth.users(id) on delete cascade,
  criada_em timestamptz not null default now()
);
alter table public.senhas_temporarias enable row level security;
-- Sem políticas e sem privilégios: anon e authenticated não veem nada (ver 20261105070000).
revoke all on public.senhas_temporarias from anon, authenticated;
