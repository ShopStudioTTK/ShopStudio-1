-- Data para a notificação aparecer (2026-11-15). Sem data, aparece na hora. A aluna vê a notificação
-- a partir dessa data, e só se a conta dela já existia nela (quem chega depois não vê).
alter table public.notificacoes add column aparece_em timestamptz not null default now();
update public.notificacoes set aparece_em = criado_em;
create index notificacoes_aparece_em on public.notificacoes (aparece_em desc);
drop index if exists public.notificacoes_recentes;

-- Correção: a regra do texto do link recusava notificação sem link (link nulo → "false and null" = false).
alter table public.notificacoes drop constraint notificacoes_check;
alter table public.notificacoes add constraint notificacoes_link_texto_check
  check (link_texto is null or (link is not null and char_length(link_texto) between 1 and 60));
