-- Banco de ganchos no banco de dados (antes em src/content/hooks-textos.ts), com os da comunidade
-- e as notas de 1 a 5. A admin edita e apaga qualquer gancho; a aluna registra os dela e dá nota.
-- Só o servidor escreve: o texto sai só por /api/ganchos, com autenticar().
create table public.ganchos (
  id uuid primary key default gen_random_uuid(),
  categoria text not null check (categoria in ('quebra', 'problema', 'curiosidade')),
  texto text not null check (char_length(btrim(texto)) between 5 and 200),
  -- false = banco do Studio; true = registrado por uma aluna
  comunidade boolean not null default false,
  -- quem registrou (só para o limite diário); nunca sai nas rotas
  user_id uuid references auth.users (id) on delete set null,
  criado_em timestamptz not null default now()
);
create index ganchos_user_idx on public.ganchos (user_id, criado_em) where user_id is not null;
alter table public.ganchos enable row level security;
-- Sem políticas e sem privilégios: anon e authenticated não veem nada (ver 20261105070000).
revoke all on public.ganchos from anon, authenticated;

create table public.gancho_notas (
  gancho_id uuid not null references public.ganchos (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  nota smallint not null check (nota between 1 and 5),
  atualizado_em timestamptz not null default now(),
  primary key (gancho_id, user_id)
);
alter table public.gancho_notas enable row level security;
revoke all on public.gancho_notas from anon, authenticated;

-- Os 60 ganchos que existiam, na mesma ordem.
insert into public.ganchos (categoria, texto, criado_em) values
  ('quebra', 'O dinheiro que eu já joguei fora com [PRODUTO]…', now() + interval '0 ms'),
  ('quebra', 'Vou falar uma coisa que muita gente não vai gostar…', now() + interval '1 ms'),
  ('quebra', 'Eu quase joguei isso no lixo. SÉRIO.', now() + interval '2 ms'),
  ('quebra', 'Acho que fiz a pior compra da minha vida…', now() + interval '3 ms'),
  ('quebra', 'Isso aqui é tão simples que chega a ser ridículo.', now() + interval '4 ms'),
  ('quebra', 'Quem inventou isso merece um prêmio.', now() + interval '5 ms'),
  ('quebra', 'Me recuso a continuar pagando caro por [PRODUTO].', now() + interval '6 ms'),
  ('quebra', 'Eu tinha CERTEZA que isso era propaganda enganosa.', now() + interval '7 ms'),
  ('quebra', 'Isso aqui tem preço de [VALOR], mas aparência de [VALOR MAIOR].', now() + interval '8 ms'),
  ('quebra', 'Você tá gastando dinheiro à toa com [PRODUTO].', now() + interval '9 ms'),
  ('quebra', 'Motivos pelos quais eu ODEIO [PRODUTO]…', now() + interval '10 ms'),
  ('quebra', 'Eu tô simplesmente CHOCADA com isso aqui.', now() + interval '11 ms'),
  ('quebra', 'Como ninguém pensou nisso antes?', now() + interval '12 ms'),
  ('quebra', 'Você provavelmente tá fazendo [AÇÃO] errado.', now() + interval '13 ms'),
  ('quebra', 'NÃO compra [PRODUTO] antes de ver isso.', now() + interval '14 ms'),
  ('quebra', 'Isso aqui não tinha o direito de ser TÃO bom.', now() + interval '15 ms'),
  ('quebra', 'A compra mais sem noção que eu já fiz…', now() + interval '16 ms'),
  ('quebra', 'Me julguem, mas eu prefiro isso aqui do que [ALTERNATIVA].', now() + interval '17 ms'),
  ('quebra', 'Eu paguei [VALOR] nisso aqui. E faria de novo.', now() + interval '18 ms'),
  ('quebra', 'Eu achei que não precisava disso. QUEBREI A CARA.', now() + interval '19 ms'),
  ('problema', 'Se você sofre com [PROBLEMA], esse vídeo é pra você.', now() + interval '20 ms'),
  ('problema', 'Cansada de [PROBLEMA]? Olha isso aqui.', now() + interval '21 ms'),
  ('problema', 'Só quem passa por [SITUAÇÃO] vai entender…', now() + interval '22 ms'),
  ('problema', 'Se você tem [PROBLEMA], precisa saber disso.', now() + interval '23 ms'),
  ('problema', 'Você também passa raiva com [SITUAÇÃO]?', now() + interval '24 ms'),
  ('problema', 'Se você ainda faz [AÇÃO] desse jeito, tá na hora de mudar.', now() + interval '25 ms'),
  ('problema', 'Odeia quando [SITUAÇÃO]? Então olha isso.', now() + interval '26 ms'),
  ('problema', 'Se você tem [PROBLEMA], presta atenção nisso aqui.', now() + interval '27 ms'),
  ('problema', 'Quem tem [PROBLEMA] sabe o quanto isso incomoda.', now() + interval '28 ms'),
  ('problema', 'Você também perde tempo tentando [AÇÃO]?', now() + interval '29 ms'),
  ('problema', 'O pior de [SITUAÇÃO] é ter que lidar com isso…', now() + interval '30 ms'),
  ('problema', 'Se você também não aguenta mais [PROBLEMA], olha isso.', now() + interval '31 ms'),
  ('problema', 'Quantas vezes você já passou por [SITUAÇÃO]?', now() + interval '32 ms'),
  ('problema', 'Se [PROBLEMA] te incomoda, você precisa ver isso.', now() + interval '33 ms'),
  ('problema', 'Você ainda sofre pra conseguir [RESULTADO]?', now() + interval '34 ms'),
  ('problema', 'Quem nunca passou raiva tentando [AÇÃO]?', now() + interval '35 ms'),
  ('problema', 'Se toda vez que você [AÇÃO] acontece isso, olha aqui.', now() + interval '36 ms'),
  ('problema', 'Ninguém merece ter que lidar com [PROBLEMA].', now() + interval '37 ms'),
  ('problema', 'Se você também tem dificuldade pra [AÇÃO], vem cá.', now() + interval '38 ms'),
  ('problema', 'Se você pudesse acabar com [PROBLEMA], acabaria?', now() + interval '39 ms'),
  ('curiosidade', 'Tá, agora eu entendi por que todo mundo tá comprando isso…', now() + interval '40 ms'),
  ('curiosidade', 'Eu não queria falar sobre isso, mas…', now() + interval '41 ms'),
  ('curiosidade', 'Como assim ninguém tá falando sobre isso aqui?', now() + interval '42 ms'),
  ('curiosidade', 'Não é à toa que isso aqui vive esgotado…', now() + interval '43 ms'),
  ('curiosidade', 'Eu achei que era besteira até descobrir isso.', now() + interval '44 ms'),
  ('curiosidade', 'Alguém me explica por que eu demorei tanto pra comprar isso?', now() + interval '45 ms'),
  ('curiosidade', 'Isso aqui parece MUITO mais caro do que realmente é.', now() + interval '46 ms'),
  ('curiosidade', 'Eu não sei quem inventou isso, mas obrigada.', now() + interval '47 ms'),
  ('curiosidade', 'Eu achei que todo mundo já sabia disso, mas aparentemente não…', now() + interval '48 ms'),
  ('curiosidade', 'Eu preciso mostrar uma coisa pra vocês…', now() + interval '49 ms'),
  ('curiosidade', 'Se você ainda compra [PRODUTO] desse jeito, olha isso.', now() + interval '50 ms'),
  ('curiosidade', 'Eu tava procurando uma coisa e encontrei outra MUITO melhor.', now() + interval '51 ms'),
  ('curiosidade', 'Agora eu entendi o motivo de tanto sucesso…', now() + interval '52 ms'),
  ('curiosidade', 'Eu achei que isso só existia na gringa.', now() + interval '53 ms'),
  ('curiosidade', 'Eu não dava nada por isso aqui, até testar.', now() + interval '54 ms'),
  ('curiosidade', 'Acho que encontrei a melhor compra do ano.', now() + interval '55 ms'),
  ('curiosidade', 'Não compra [PRODUTO] antes de ver isso aqui.', now() + interval '56 ms'),
  ('curiosidade', 'Eu tenho uma teoria sobre isso aqui…', now() + interval '57 ms'),
  ('curiosidade', 'O que ninguém te conta sobre [PRODUTO]…', now() + interval '58 ms'),
  ('curiosidade', 'Eu duvido você olhar isso aqui e não querer um também.', now() + interval '59 ms');
