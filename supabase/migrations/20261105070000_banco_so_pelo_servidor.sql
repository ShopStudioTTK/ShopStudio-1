-- O navegador não fala mais com o banco. Toda leitura e escrita passa pelas rotas do servidor
-- (src/app/api), que conferem o token e se conectam direto ao Postgres (src/lib/db.ts).
-- A Data API (PostgREST) fica desligada: ninguém logado vê tabela, coluna ou estrutura.
-- Mesmo se ela for religada por engano, nada abaixo deixa a conta logada ver ou mexer em algo.

-- 1) Sem políticas: RLS ligado e nenhuma política = anon e authenticated não acessam nada.
do $$
declare p record;
begin
  for p in select schemaname, tablename, policyname from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

-- Vídeos do bucket: quem assina a URL agora é o servidor (service role).
drop policy if exists "studio_videos_select_authenticated" on storage.objects;

-- 2) Sem privilégios para a conta logada (o anon já não tinha), hoje e para o que for criado.
revoke all on all tables in schema public from authenticated;
revoke all on all sequences in schema public from authenticated;
revoke all on all functions in schema public from authenticated;
alter default privileges for role postgres in schema public revoke all on tables from authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from authenticated;
alter default privileges for role postgres in schema public revoke all on functions from authenticated;

-- 3) Resgate de código: a mesma regra (10 erros por hora), mas a aluna vem do servidor (token
--    conferido), não de auth.uid(). Só o servidor executa.
drop function if exists public.redeem_access_code(text);

create or replace function public.resgatar_codigo(p_user uuid, codigo_input text)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  v_code text := upper(trim(codigo_input));
  v_ativo boolean;
  v_limite integer;
  v_usos integer;
begin
  if p_user is null then
    return false;
  end if;

  if exists (select 1 from public.entitlements e where e.user_id = p_user) then
    return true;
  end if;

  if (select count(*) from public.access_code_tentativas t
      where t.user_id = p_user and t.created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Muitas tentativas erradas. Espere uma hora e tente de novo.' using errcode = 'P0001';
  end if;

  select c.ativo, c.limite_usos, c.usos into v_ativo, v_limite, v_usos
  from public.access_codes c where c.code = v_code
  for update;

  if not found or not v_ativo or (v_limite is not null and v_usos >= v_limite) then
    insert into public.access_code_tentativas (user_id) values (p_user);
    return false;
  end if;

  insert into public.entitlements (user_id, origem, codigo) values (p_user, 'codigo', v_code);
  update public.access_codes set usos = v_usos + 1 where code = v_code;
  return true;
end;
$$;

revoke all on function public.resgatar_codigo(uuid, text) from public, anon, authenticated;
