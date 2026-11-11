-- A aba "Beleza" dos Campeões passa a se chamar "Beleza e autocuidado" (pedido da dona, 2026-11-11).
-- Só o rótulo muda: o slug `beleza` continua (é a chave dos vídeos em `campeoes` e da ordem fixa em
-- /api/nichos). Em produção, entra no `supabase db push`.
update public.nichos set rotulo = 'Beleza e autocuidado' where slug = 'beleza';
