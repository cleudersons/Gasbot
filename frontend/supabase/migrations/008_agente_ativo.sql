-- ===================================================================
-- SutoGas — Chave de pausar/ativar o agente por agência
-- ===================================================================

ALTER TABLE agencias ADD COLUMN IF NOT EXISTS agente_ativo BOOLEAN NOT NULL DEFAULT TRUE;
