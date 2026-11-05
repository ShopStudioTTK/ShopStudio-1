-- Limite de tentativas erradas de código de acesso: 10 por hora por aluna.
-- Antes, dava para chutar códigos sem limite (60 tentativas em 1 s no teste).
create table if not exists public.access_code_tentativas (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists access_code_tentativas_user on public.access_code_tentativas (user_id, created_at desc);
-- RLS ligado e nenhuma política: só a função abaixo (security definer) lê e grava.
alter table public.access_code_tentativas enable row level security;

create or replace function public.redeem_access_code(codigo_input text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(trim(codigo_input));
  v_ativo boolean;
  v_limite integer;
  v_usos integer;
begin
  if auth.uid() is null then
    return false;
  end if;

  if exists (select 1 from public.entitlements e where e.user_id = auth.uid()) then
    return true;
  end if;

  if (select count(*) from public.access_code_tentativas t
      where t.user_id = auth.uid() and t.created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Muitas tentativas erradas. Espere uma hora e tente de novo.' using errcode = 'P0001';
  end if;

  select c.ativo, c.limite_usos, c.usos into v_ativo, v_limite, v_usos
  from public.access_codes c where c.code = v_code;

  if not found or not v_ativo or (v_limite is not null and v_usos >= v_limite) then
    insert into public.access_code_tentativas (user_id) values (auth.uid());
    return false;
  end if;

  insert into public.entitlements (user_id, origem, codigo) values (auth.uid(), 'codigo', v_code);
  update public.access_codes set usos = v_usos + 1 where code = v_code;

  return true;
end;
$$;

revoke all on function public.redeem_access_code(text) from public;
revoke all on function public.redeem_access_code(text) from anon;
grant execute on function public.redeem_access_code(text) to authenticated;
