-- Quantos tokens de entrada vieram do cache de prompt (cobrados a ~10% do preço).
alter table public.ai_perguntas add column if not exists tokens_cache integer;
