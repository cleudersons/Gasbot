-- ===================================================================
-- SutoGas — auto-progressão de status (sistema atualiza por timeout)
-- ===================================================================

ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS status_auto BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS status_atualizado_em TIMESTAMPTZ;

-- Backfill: pedidos antigos ganham timestamp = criado_em (não temos histórico real)
UPDATE pedidos SET status_atualizado_em = criado_em WHERE status_atualizado_em IS NULL;
