-- Notificações da administração (2026-11-15). A admin publica; cada aluna vê só as publicadas
-- depois que a conta dela foi criada (quem chega depois não vê as antigas). O pop-up aparece uma vez
-- e a marca de vista fica no banco, para não voltar em outro aparelho. Só o servidor escreve.
create table public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(titulo) between 1 and 120),
  descricao text not null check (char_length(descricao) between 1 and 2000),
  link text check (link like 'https://%' and char_length(link) <= 2000),
  link_texto text check (link is not null and char_length(link_texto) between 1 and 60),
  criado_em timestamptz not null default now()
);
create index notificacoes_recentes on public.notificacoes (criado_em desc);

create table public.notificacoes_vistas (
  notificacao_id uuid not null references public.notificacoes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  vista_em timestamptz not null default now(),
  primary key (notificacao_id, user_id)
);

alter table public.notificacoes enable row level security;
alter table public.notificacoes_vistas enable row level security;
-- Sem políticas e sem privilégios: anon e authenticated não veem nada (ver 20261105070000).
revoke all on public.notificacoes from anon, authenticated;
revoke all on public.notificacoes_vistas from anon, authenticated;
