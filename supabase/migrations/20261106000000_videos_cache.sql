-- Vídeos do TikTok embaixo do roteiro, guardados por 3 dias e reaproveitados por termos parecidos
-- (similaridade de trigramas do pg_trgm >= 0,7), para não gastar 3 buscas da Brave toda vez.
-- Compartilhado entre as alunas de propósito, sem user_id: são URLs públicas do TikTok.
-- O termo fica normalizado (sem acento, sem plural, palavras em ordem) e nunca volta para a tela.
create extension if not exists pg_trgm with schema extensions;

create table public.videos_cache (
  termo text primary key,
  videos jsonb not null,
  criado_em timestamptz not null default now()
);
alter table public.videos_cache enable row level security;
-- Sem políticas e sem privilégios: anon e authenticated não veem nada (ver 20261105070000).
revoke all on public.videos_cache from anon, authenticated;
