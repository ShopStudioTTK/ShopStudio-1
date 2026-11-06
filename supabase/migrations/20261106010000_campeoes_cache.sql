-- Vídeos campeões por nicho (abas da tela de Campeões), iguais para todas as alunas.
-- Renovados pela rota /api/campeoes quando têm mais de 1 dia. Só URLs públicas do TikTok, sem user_id.
create table public.campeoes_cache (
  nicho text primary key,
  videos jsonb not null,
  criado_em timestamptz not null default now()
);
alter table public.campeoes_cache enable row level security;
-- Sem políticas e sem privilégios: anon e authenticated não veem nada (ver 20261105070000).
revoke all on public.campeoes_cache from anon, authenticated;
