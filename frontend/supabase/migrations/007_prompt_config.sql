-- ===================================================================
-- SutoGas — Configuração estruturada do prompt
-- ===================================================================

ALTER TABLE agencias ADD COLUMN IF NOT EXISTS prompt_config JSONB DEFAULT '{}'::jsonb;
