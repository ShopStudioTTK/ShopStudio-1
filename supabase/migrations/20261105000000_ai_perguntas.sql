-- Cada pergunta feita ao assistente: base do limite diário e do custo por cliente.
create table if not exists public.ai_perguntas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pergunta text not null,
  capitulo text,
  tokens_entrada integer,
  tokens_saida integer,
  custo_usd numeric(12, 6),
  created_at timestamptz not null default now()
);

create index if not exists ai_perguntas_user_dia on public.ai_perguntas (user_id, created_at desc);

alter table public.ai_perguntas enable row level security;

-- A aluna só lê as próprias (para o contador). Quem grava é o servidor, com a service role.
create policy "ai_perguntas_select_own" on public.ai_perguntas
  for select to authenticated using (auth.uid() = user_id);
