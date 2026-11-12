-- Créditos por tipo (pedido da dona, 2026-11-12): em vez de um saldo só de 40 créditos por semana,
-- 15 perguntas e 7 roteiros por semana, e cada pedido gasta 1, do tamanho que for. Os limites ficam
-- em LIMITE_SEMANAL (src/lib/limite.ts).
-- As linhas do saldo antigo somam perguntas e roteiros e não dá para separar: elas saem, e a semana
-- em que isso entrar começa cheia para todas.
delete from public.creditos_semana;
alter table public.creditos_semana drop constraint creditos_semana_pkey;
alter table public.creditos_semana add column rota text not null check (rota in ('assistente', 'roteiro'));
alter table public.creditos_semana alter column gastos type integer using gastos::integer;
alter table public.creditos_semana add primary key (user_id, semana, rota);
