-- Créditos avulsos (pedido da dona, 2026-11-12): além dos semanais grátis (creditos_semana), a aluna
-- vai poder comprar perguntas e roteiros. Cada compra é um lote por tipo, que vale 30 dias a partir da
-- compra e é gasto depois dos da semana (reservarChamada, em src/lib/api-auth.ts). Quem escreve é só o
-- servidor; a compra em si (plataforma de venda) ainda não existe.
create table public.creditos_comprados (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  rota text not null check (rota in ('assistente', 'roteiro')),
  quantidade integer not null check (quantidade > 0),
  gastos integer not null default 0 check (gastos >= 0 and gastos <= quantidade),
  comprado_em timestamptz not null default now(),
  vale_ate timestamptz not null
);
create index creditos_comprados_saldo on public.creditos_comprados (user_id, rota, vale_ate);
alter table public.creditos_comprados enable row level security;
