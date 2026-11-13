-- Alunas do curso (2026-11-12). A página /checkout consulta esta lista quando a visitante diz
-- "já sou aluna": se o e-mail está aqui, mostra o checkout só da ferramenta. É só informativo:
-- qualquer pessoa pode comprar a ferramenta sozinha, nada é bloqueado por esta tabela.
-- Entra por import da admin (colar e-mails) e pelo webhook da Applyfy (produtos do curso).
create table if not exists public.alunas_curso (
  email text primary key check (email = lower(email) and char_length(email) between 3 and 254),
  origem text not null default 'importada' check (origem in ('importada', 'compra')),
  criado_em timestamptz not null default now()
);

alter table public.alunas_curso enable row level security;
revoke all on public.alunas_curso from anon, authenticated;
