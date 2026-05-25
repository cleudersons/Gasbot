-- ===================================================================
-- SutoGas — memória persistente de pedido + acionar entregador
-- ===================================================================

ALTER TABLE agencias ADD COLUMN IF NOT EXISTS sla_minutos INTEGER NOT NULL DEFAULT 60;
ALTER TABLE pedidos  ADD COLUMN IF NOT EXISTS ultimo_contato_entregador TIMESTAMPTZ;
