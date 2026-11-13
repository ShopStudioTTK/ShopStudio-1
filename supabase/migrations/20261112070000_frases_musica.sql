-- Banco de frases da Música viral (sem fala), cadastrado pela admin (2026-11-12).
-- Cada linha é um exemplo da especialista: a frase na tela, o tipo da frase e a cena sugerida.
-- O gerador usa só estas linhas como exemplo quando a aluna escolhe a Música viral, sem misturar
-- com as fichas dos roteiros falados (`fichas_roteiro`).
create table public.frases_musica (
  id uuid primary key default gen_random_uuid(),
  categoria text not null check (char_length(btrim(categoria)) between 1 and 80),
  produto text not null check (char_length(btrim(produto)) between 1 and 120),
  frase text not null check (char_length(btrim(frase)) between 1 and 200),
  tipo text not null check (char_length(btrim(tipo)) between 1 and 60),
  cena text not null check (char_length(btrim(cena)) between 1 and 300),
  criado_por uuid references auth.users (id) on delete set null,
  criado_em timestamptz not null default now(),
  -- colar a mesma planilha de novo não duplica
  unique (produto, frase)
);
create index frases_musica_recentes on public.frases_musica (criado_em desc);
alter table public.frases_musica enable row level security;
-- Sem políticas e sem privilégios: anon e authenticated não veem nada (ver 20261105070000).
revoke all on public.frases_musica from anon, authenticated;
