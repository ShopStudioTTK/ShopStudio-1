-- Treinamento da IA: a expert responde perguntas do jeito dela e o assistente usa essas respostas
-- (por embedding) como modelo de tom. Só admins mexem, sempre pelo servidor (admin() em api-auth.ts).
create extension if not exists vector with schema extensions;

-- Quem é admin. Editada só no painel do Supabase (service role).
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);

-- Uma conversa do assistente = um item na fila. O user_id existe só para o servidor pendurar a
-- pergunta na conversa certa (sempre o do token); nunca sai nas rotas de admin.
create table public.treinamento_conversas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  conversa_cliente uuid not null,
  criado_em timestamptz not null default now(),
  unique (user_id, conversa_cliente)
);

-- Sem user_id de aluna, de propósito. Apagar a conta da aluna não apaga o que a expert respondeu.
-- ponytail: sem índice vetorial (busca sequencial); HNSW se passar de alguns milhares de linhas.
create table public.treinamento (
  id uuid primary key default gen_random_uuid(),
  origem text not null check (origem in ('mapeada', 'aluna', 'admin')),
  status text not null default 'pendente' check (status in ('pendente', 'respondida', 'descartada')),
  conversa_id uuid references public.treinamento_conversas(id) on delete set null,
  ordem int,
  contexto text,
  pergunta text not null check (length(pergunta) between 1 and 1000),
  resposta_ia text,
  resposta text check (length(resposta) <= 4000),
  -- da pergunta (com o contexto). 1536 = openai/text-embedding-3-small; trocar o modelo exige migrar a coluna.
  embedding extensions.vector(1536),
  criado_em timestamptz not null default now(),
  respondido_por uuid references auth.users(id) on delete set null,
  respondido_em timestamptz,
  check (status <> 'respondida' or resposta is not null)
);
create index treinamento_status on public.treinamento (status, criado_em desc);
create index treinamento_conversa on public.treinamento (conversa_id, ordem);

alter table public.admins enable row level security;
alter table public.treinamento_conversas enable row level security;
alter table public.treinamento enable row level security;
-- Sem políticas e sem privilégios: anon e authenticated não veem nada (ver 20261105070000).
revoke all on public.admins, public.treinamento_conversas, public.treinamento from anon, authenticated;

-- Perguntas mapeadas a partir das aulas, do dossiê e dos capítulos, para a expert responder.
insert into public.treinamento (origem, pergunta) values
  ('mapeada', 'Como eu ativo minha conta de afiliada no TikTok Shop?'),
  ('mapeada', 'Preciso mesmo de 2 mil seguidores pra começar a vender?'),
  ('mapeada', 'Quantos vídeos eu tenho que postar por dia?'),
  ('mapeada', 'Como eu faço um gancho bom pros primeiros segundos?'),
  ('mapeada', 'Vale mais a pena nichar ou falar de vários produtos?'),
  ('mapeada', 'Como eu escolho um produto que vende?'),
  ('mapeada', 'Qual a diferença entre amostra grátis e amostra reembolsável?'),
  ('mapeada', 'Meu pedido de amostra foi recusado. E agora?'),
  ('mapeada', 'O produto do vídeo precisa ser igual ao do link?'),
  ('mapeada', 'Como coloco o link do produto no vídeo?'),
  ('mapeada', 'Quanto eu ganho de comissão por venda?'),
  ('mapeada', 'Como funcionam os níveis de criadora?'),
  ('mapeada', 'Posso usar música viral no vídeo com produto?'),
  ('mapeada', 'Quanto tempo deve ter um vídeo pra vender?'),
  ('mapeada', 'Como faço o 5x5 antes de gravar?'),
  ('mapeada', 'Tenho vergonha de aparecer. Dá pra vender sem mostrar o rosto?'),
  ('mapeada', 'Já postei vários vídeos e não vendi nada. O que eu tô fazendo de errado?'),
  ('mapeada', 'Vale a pena comprar seguidores pra chegar nos 2 mil?'),
  ('mapeada', 'Sou menor de idade, posso ser afiliada?'),
  ('mapeada', 'Posso usar uma conta antiga que eu tinha parada?'),
  ('mapeada', 'Live ajuda a crescer mais rápido?'),
  ('mapeada', 'Devo impulsionar meus vídeos com anúncio?'),
  ('mapeada', 'Qual o melhor horário pra postar?'),
  ('mapeada', 'Vejo outras meninas vendendo muito e eu não. Como não desanimar?'),
  ('mapeada', 'Penso em desistir. Vale a pena continuar?');
