-- Histórico do assistente da aluna ("Conversas anteriores"). Separado da fila da expert (treinamento),
-- que a admin edita e descarta. Só o servidor escreve: no fim de cada resposta completa, acrescenta a
-- pergunta e a resposta, sempre com o user_id do token. `id` é o id que o navegador criou para a conversa.
create table public.conversas (
  user_id uuid not null references auth.users (id) on delete cascade,
  id uuid not null,
  -- a primeira pergunta, cortada
  titulo text not null check (char_length(titulo) between 1 and 120),
  -- [{ role: "user" | "assistant", content }], em ordem
  mensagens jsonb not null default '[]',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (user_id, id)
);
create index conversas_recentes on public.conversas (user_id, atualizado_em desc);
alter table public.conversas enable row level security;
-- Sem políticas e sem privilégios: anon e authenticated não veem nada (ver 20261105070000).
revoke all on public.conversas from anon, authenticated;
