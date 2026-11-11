-- Créditos semanais: 40 por semana (CREDITOS_POR_SEMANA em src/lib/limite.ts), sem acumular.
-- Uma linha por aluna por semana; `semana` é o domingo em que ela começou (0h de Brasília), então
-- a semana nova começa sem linha, com tudo disponível. Substitui os limites diários de
-- perguntas e roteiros. Admin não grava aqui. Só o servidor escreve (reservarChamada).
create table public.creditos_semana (
  user_id uuid not null references auth.users (id) on delete cascade,
  semana date not null check (extract(dow from semana) = 0),
  gastos numeric(4, 1) not null default 0 check (gastos >= 0),
  primary key (user_id, semana)
);
alter table public.creditos_semana enable row level security;
revoke all on public.creditos_semana from anon, authenticated;
