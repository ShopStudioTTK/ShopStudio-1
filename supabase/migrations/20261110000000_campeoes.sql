-- Vídeos campeões cadastrados pela administração (abas da tela de Campeões), iguais para todas as alunas.
-- Substitui a busca automática na Brave: os caches dela saem. Só URLs públicas do TikTok, sem user_id.
create table public.campeoes (
  id uuid primary key default gen_random_uuid(),
  nicho text not null,
  url text not null check (url ~ '^https://www\.tiktok\.com/@[A-Za-z0-9_.-]+/video/[0-9]+$'),
  titulo text not null default '' check (char_length(titulo) <= 120),
  criado_em timestamptz not null default now(),
  unique (nicho, url)
);
create index campeoes_nicho_idx on public.campeoes (nicho, criado_em desc);
alter table public.campeoes enable row level security;
-- Sem políticas e sem privilégios: anon e authenticated não veem nada (ver 20261105070000).
revoke all on public.campeoes from anon, authenticated;

drop table public.videos_cache;
drop table public.campeoes_cache;
