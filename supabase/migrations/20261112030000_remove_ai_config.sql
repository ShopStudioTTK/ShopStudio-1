-- A persona da IA (ai_config, uma linha só) era lida em toda pergunta e todo roteiro. No assistente
-- o preset da OpenRouter já manda na voz; no roteiro, a voz da Ana fica nas regras do prompt e nas
-- fichas de exemplo fixo. Sai do código e do banco (pedido da dona, 2026-11-12).
drop table if exists public.ai_config;
