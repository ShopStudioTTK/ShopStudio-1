-- Compras da Applyfy já processadas pelo webhook (POST /api/webhook/applyfy), uma por transação.
-- Serve para o mesmo aviso, chegando duas vezes, não gerar outra senha temporária (o que
-- invalidaria a que a aluna acabou de receber por e-mail). Se a conta ou o e-mail falharem,
-- a rota apaga a linha e responde 500, para a Applyfy reenviar.
create table public.compras_applyfy (
  transaction_id text primary key,
  email text not null,
  criada_em timestamptz not null default now()
);
alter table public.compras_applyfy enable row level security;
-- Sem políticas e sem privilégios: anon e authenticated não veem nada (ver 20261105070000).
revoke all on public.compras_applyfy from anon, authenticated;
