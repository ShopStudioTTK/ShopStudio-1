-- Separa assistente e gerador de roteiros: cada um tem o próprio limite diário e o próprio custo.
alter table public.ai_perguntas
  add column if not exists rota text not null default 'assistente'
  check (rota in ('assistente', 'roteiro'));

drop index if exists ai_perguntas_user_dia;
create index if not exists ai_perguntas_user_rota_dia on public.ai_perguntas (user_id, rota, created_at desc);
