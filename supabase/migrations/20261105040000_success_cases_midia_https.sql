-- O link de mídia de um caso de sucesso aparece para todas as alunas: só https.
-- Antes aceitava qualquer coisa (javascript:, http: de rastreio, etc.).
update public.success_cases set midia_url = null where midia_url is not null and midia_url !~* '^https://';
alter table public.success_cases
  add constraint success_cases_midia_https check (midia_url is null or midia_url ~* '^https://[^\s]+$');
