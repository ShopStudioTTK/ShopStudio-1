-- TikTok da aluna (Minha conta). O mural liga o nome dela a esse perfil. Fica em `profiles`, e não
-- nos metadados do login, que viajam no JWT. O banco só aceita o link limpo do perfil.
alter table public.profiles
  add column tiktok text check (tiktok is null or tiktok ~ '^https://www\.tiktok\.com/@[A-Za-z0-9_.]{2,24}$');
