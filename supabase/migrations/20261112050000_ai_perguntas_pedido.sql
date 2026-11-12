-- Pedido de IA que a aluna retoma depois do F5 (GET /api/pedidos): o navegador cria o id (`pedido`),
-- e o servidor, que termina o trabalho mesmo sem ela na página, guarda a resposta (`resultado`,
-- { status, corpo }, o que a rota teria devolvido). Busca sempre por user_id + pedido.
alter table public.ai_perguntas
  add column if not exists pedido uuid,
  add column if not exists resultado jsonb;

create unique index if not exists ai_perguntas_user_pedido on public.ai_perguntas (user_id, pedido);
