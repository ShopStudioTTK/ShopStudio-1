create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nome text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create table if not exists public.chapter_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_slug text not null,
  completed_at timestamptz not null default now(),
  unique (user_id, chapter_slug)
);
alter table public.chapter_progress enable row level security;
create policy "chapter_progress_select_own" on public.chapter_progress for select using (auth.uid() = user_id);
create policy "chapter_progress_insert_own" on public.chapter_progress for insert with check (auth.uid() = user_id);
create policy "chapter_progress_update_own" on public.chapter_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "chapter_progress_delete_own" on public.chapter_progress for delete using (auth.uid() = user_id);

create table if not exists public.checklist_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_key text not null,
  done boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (user_id, item_key)
);
alter table public.checklist_progress enable row level security;
create policy "checklist_progress_select_own" on public.checklist_progress for select using (auth.uid() = user_id);
create policy "checklist_progress_insert_own" on public.checklist_progress for insert with check (auth.uid() = user_id);
create policy "checklist_progress_update_own" on public.checklist_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "checklist_progress_delete_own" on public.checklist_progress for delete using (auth.uid() = user_id);

create table if not exists public.saved_scripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  produto text not null,
  formato text,
  conteudo jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.saved_scripts enable row level security;
create policy "saved_scripts_select_own" on public.saved_scripts for select using (auth.uid() = user_id);
create policy "saved_scripts_insert_own" on public.saved_scripts for insert with check (auth.uid() = user_id);
create policy "saved_scripts_update_own" on public.saved_scripts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "saved_scripts_delete_own" on public.saved_scripts for delete using (auth.uid() = user_id);

create table if not exists public.success_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  aluna text not null,
  resultado text,
  texto text,
  midia_url text,
  midia_tipo text not null default 'imagem',
  destaque boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.success_cases enable row level security;
create policy "success_cases_select_authenticated" on public.success_cases for select to authenticated using (true);
create policy "success_cases_insert_own" on public.success_cases for insert to authenticated with check (auth.uid() = user_id);
create policy "success_cases_update_own" on public.success_cases for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "success_cases_delete_own" on public.success_cases for delete to authenticated using (auth.uid() = user_id);

create table if not exists public.ai_config (
  id text primary key default 'default',
  nome text not null default 'Shop Girl',
  tom text not null default 'amiga',
  persona text,
  evitar text,
  exemplos jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.ai_config enable row level security;
create policy "ai_config_select_all" on public.ai_config for select to authenticated using (true);

create table if not exists public.ai_knowledge (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  conteudo text not null,
  ordem integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.ai_knowledge enable row level security;
create policy "ai_knowledge_select_all" on public.ai_knowledge for select to authenticated using (true);

create table if not exists public.access_codes (
  code text primary key,
  ativo boolean not null default true,
  usos integer not null default 0,
  limite_usos integer,
  criado_em timestamptz not null default now()
);
-- sem política: só a service role acessa
alter table public.access_codes enable row level security;

create table if not exists public.entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  origem text not null default 'codigo',
  codigo text,
  criado_em timestamptz not null default now()
);
alter table public.entitlements enable row level security;
create policy "entitlements_select_own" on public.entitlements for select to authenticated using (auth.uid() = user_id);

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

  select c.ativo, c.limite_usos, c.usos into v_ativo, v_limite, v_usos
  from public.access_codes c where c.code = v_code;

  if not found or not v_ativo then
    return false;
  end if;

  if v_limite is not null and v_usos >= v_limite then
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

create table if not exists public.chapter_videos (
  id uuid primary key default gen_random_uuid(),
  chapter_slug text,
  titulo text not null,
  descricao text,
  url text not null,
  ordem integer not null default 0,
  updated_at timestamptz not null default now(),
  colecao text not null default 'capitulo'
);
alter table public.chapter_videos enable row level security;
create policy "chapter_videos_select_all" on public.chapter_videos for select to authenticated using (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'studio-videos',
  'studio-videos',
  true,
  52428800,
  array['video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do nothing;

create policy "studio_videos_public_read"
on storage.objects
for select
to public
using (bucket_id = 'studio-videos');

insert into public.ai_config (id, nome, tom, persona, evitar, exemplos)
values (
  'default',
  'Shop Girl',
  'amiga',
  $persona$Fala como a Ana Luiza fala no TikTok e no WhatsApp: descontraída, direta, com humor leve e zero formalidade. Usa “gnt”, “pq”, “agr”, “tipo”, “olha”, “amiga” com naturalidade — uma ou duas por resposta, nunca em toda frase. Pode alongar uma palavra para dar ênfase (“ameiiii”, “simplesmente não dá”). Começa pela resposta, sem introdução. Explica em 2 ou 3 frases curtas e fecha com um próximo passo prático. Quando a pessoa está perdida ou insegura, acalma em uma frase e entrega o passo a passo em bullets. Usa no máximo um emoji por resposta, e só quando combina com o clima. Fala em primeira pessoa do plural quando for algo do Shop Studio (“a gente testou”, “a gente ensina”).$persona$,
  $evitar$Não fala como professora formal: nada de “prezada”, “portanto”, “dessa forma”, “cara aluna”. Não escreve textão nem parágrafo longo. Não promete ganhos, valores ou prazos. Não inventa histórias pessoais da Ana, números de faturamento ou resultados que ela não disse. Não afirma ser a Ana Luiza em pessoa; fala no tom dela, como assistente do Shop Studio. Não responde sobre assuntos fora do TikTok Shop. Não manda a pessoa “estudar mais” sem dizer exatamente o que fazer.$evitar$,
  $json$[{"pergunta":"Não tenho 2 mil seguidores, dá pra começar?","resposta":"Dá, gnt. Os 2 mil liberam as ferramentas completas (vitrine, link no vídeo, amostras), não o começo do treino. Hoje você já pode escolher 3 produtos que tem em casa e gravar os primeiros vídeos. O capítulo 4 mostra o caminho inteiro."},{"pergunta":"Esse produto vende?","resposta":"Olha, não existe produto mágico. Se as avaliações são boas, tem vídeo de cliente real e a comissão passa de uns R$ 3, vale testar. Se só tiver vídeo feito por IA, eu pularia."},{"pergunta":"Tô com vergonha de gravar","resposta":"Normal, amiga. Todo mundo começa travada. Grava 2 vídeos sozinha no quarto, sem postar, só pra soltar a voz. No dia seguinte você posta um. A vergonha passa com prática, juro 🎀"}]$json$
);
