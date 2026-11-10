-- Abas da tela de Campeões, criadas pela administração (antes fixas em src/content/nichos.ts).
-- Sem user_id: são iguais para todas as alunas. Só o servidor escreve, em rotas com admin().
create table public.nichos (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 40),
  rotulo text not null check (char_length(btrim(rotulo)) between 1 and 40),
  criado_em timestamptz not null default now()
);
alter table public.nichos enable row level security;
-- Sem políticas e sem privilégios: anon e authenticated não veem nada (ver 20261105070000).
revoke all on public.nichos from anon, authenticated;

-- As 5 abas que existiam, na mesma ordem.
insert into public.nichos (slug, rotulo, criado_em) values
  ('moda-fitness', 'Moda fitness', now()),
  ('beleza', 'Beleza', now() + interval '1 ms'),
  ('maternidade', 'Maternidade', now() + interval '2 ms'),
  ('casa-e-cozinha', 'Casa e cozinha', now() + interval '3 ms'),
  ('moda-feminina', 'Moda feminina', now() + interval '4 ms');

-- Vídeo só em aba que existe; aba com vídeo não pode ser apagada (restrict).
alter table public.campeoes
  add constraint campeoes_nicho_fkey foreign key (nicho) references public.nichos (slug);
