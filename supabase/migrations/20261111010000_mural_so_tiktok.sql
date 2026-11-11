-- Mural: a mídia agora só pode ser vídeo do TikTok (o mesmo formato de `campeoes.url`).
-- `not valid`: vale para as linhas novas; as antigas (prints) ficam como estão e a tela as
-- mostra só com o texto, então nada se perde.
alter table public.success_cases
  add constraint success_cases_midia_tiktok
  check (midia_url is null or midia_url ~ '^https://www\.tiktok\.com/@[A-Za-z0-9_.-]+/video/[0-9]+$') not valid;
