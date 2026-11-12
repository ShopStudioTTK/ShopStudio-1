-- A persona da IA (ai_config) tinha uma linha só e era lida em toda pergunta e todo roteiro. O mesmo
-- texto virou constante no código (src/lib/persona.ts), então a tabela sai (pedido da dona, 2026-11-12).
drop table if exists public.ai_config;
