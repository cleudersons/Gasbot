-- 024 — Timestamp de última atualização da agência
-- Útil pra diagnosticar quando configs (horário, PIX, prompt, etc.) foram mudadas.

ALTER TABLE agencias
  ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ DEFAULT now();

-- Trigger atualiza o campo automaticamente em todo UPDATE.
CREATE OR REPLACE FUNCTION trg_agencias_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_agencias_atualizado_em ON agencias;
CREATE TRIGGER set_agencias_atualizado_em
  BEFORE UPDATE ON agencias
  FOR EACH ROW
  EXECUTE FUNCTION trg_agencias_atualizado_em();

-- Backfill: registros existentes recebem now() pra não ficarem NULL.
UPDATE agencias SET atualizado_em = COALESCE(atualizado_em, now());
