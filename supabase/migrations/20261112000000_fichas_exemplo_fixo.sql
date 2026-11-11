-- Fichas marcadas pela admin como "exemplo fixo de voz": entram em todo roteiro gerado (até 6),
-- além das fichas parecidas com o produto (pedido da dona, 2026-11-11).
alter table public.fichas_roteiro add column exemplo_fixo boolean not null default false;
