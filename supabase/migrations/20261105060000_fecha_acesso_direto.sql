-- Quem está logada usa a plataforma, não o banco: só lê o que as telas mostram.

-- 1) Persona e base de conhecimento da IA: nenhuma tela lê; só as rotas de IA, pela service role
--    (que ignora o RLS). Antes, qualquer conta logada lia tudo direto pela API.
drop policy if exists "ai_config_select_all" on public.ai_config;
drop policy if exists "ai_knowledge_select_all" on public.ai_knowledge;

-- 2) Visitante sem login (anon) não usa nenhuma tabela, sequência nem função. O RLS já barrava os
--    dados; tirar os privilégios também esconde a estrutura do banco (a OpenAPI em /rest/v1/ e o
--    GraphQL só mostram o que o papel pode acessar).
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;

-- 3) O mesmo para o que for criado depois. Função nova também deixa de ser executável por todo
--    mundo (o padrão do Postgres é PUBLIC): dê `grant execute ... to authenticated` explicitamente.
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke all on functions from anon;
alter default privileges for role postgres in schema public revoke execute on functions from public;
