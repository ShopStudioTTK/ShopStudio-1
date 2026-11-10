-- Treinamento de roteiros: a expert registra como pensaria o roteiro de um produto (gatilho,
-- porquê e entonação de cada parte do 5×5). O gerador usa as parecidas como modelo e mostra os
-- cartões embaixo do roteiro. Sem user_id de aluna. Só o servidor escreve, em rotas com admin().

-- Gatilhos do gancho. A expert acrescenta novos pelo "+" na ficha.
create table public.gatilhos (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 40),
  rotulo text not null check (char_length(btrim(rotulo)) between 1 and 40),
  criado_em timestamptz not null default now()
);
alter table public.gatilhos enable row level security;
revoke all on public.gatilhos from anon, authenticated;

insert into public.gatilhos (slug, rotulo, criado_em) values
  ('curiosidade', 'Curiosidade', now()),
  ('fofoca', 'Fofoca', now() + interval '1 ms'),
  ('choque', 'Choque (quebra de padrão)', now() + interval '2 ms'),
  ('problema', 'Problema', now() + interval '3 ms'),
  ('transformacao', 'Transformação', now() + interval '4 ms'),
  ('prova-social', 'Prova social', now() + interval '5 ms');

-- ponytail: sem índice vetorial (busca sequencial); HNSW se passar de alguns milhares de fichas.
create table public.fichas_roteiro (
  id uuid primary key default gen_random_uuid(),
  produto text not null check (char_length(btrim(produto)) between 1 and 120),
  tipo text not null check (char_length(btrim(tipo)) between 1 and 120),
  -- um dos ids de FORMATOS (src/content/formatos.ts), conferido no servidor
  formato text not null check (char_length(formato) between 1 and 40),
  gancho text not null check (char_length(btrim(gancho)) between 1 and 500),
  -- restrict: gatilho com ficha não pode sumir
  gancho_gatilho text not null references public.gatilhos (slug),
  gancho_porque text not null check (char_length(btrim(gancho_porque)) between 1 and 500),
  gancho_entonacao text not null check (char_length(btrim(gancho_entonacao)) between 1 and 500),
  problema text not null check (char_length(btrim(problema)) between 1 and 500),
  problema_porque text check (char_length(problema_porque) <= 500),
  problema_entonacao text check (char_length(problema_entonacao) <= 500),
  solucao text not null check (char_length(btrim(solucao)) between 1 and 500),
  solucao_porque text check (char_length(solucao_porque) <= 500),
  solucao_entonacao text check (char_length(solucao_entonacao) <= 500),
  cta text not null check (char_length(btrim(cta)) between 1 and 500),
  cta_porque text check (char_length(cta_porque) <= 500),
  cta_entonacao text check (char_length(cta_entonacao) <= 500),
  -- só de "<produto> — <tipo>". 1536 = openai/text-embedding-3-small; trocar o modelo exige migrar a coluna.
  embedding extensions.vector(1536),
  criado_por uuid references auth.users (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index fichas_roteiro_jeito on public.fichas_roteiro (formato, gancho_gatilho, criado_em desc);
alter table public.fichas_roteiro enable row level security;
revoke all on public.fichas_roteiro from anon, authenticated;
