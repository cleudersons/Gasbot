-- 028 — Soft delete em agencias
-- Permite "excluir" agências de teste do painel master sem perder histórico
-- (pedidos/conversas continuam no banco). Todas as queries que listam
-- agências devem filtrar deletada_em IS NULL.

ALTER TABLE agencias ADD COLUMN IF NOT EXISTS deletada_em TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_agencias_deletada_em
  ON agencias (deletada_em)
  WHERE deletada_em IS NULL;
