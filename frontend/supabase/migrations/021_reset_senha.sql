-- 021 — Redefinição de senha
-- reset_token guarda HASH SHA-256 do token (nunca o token cru).
-- Token cru vai por email; ao receber de volta, hasheamos e comparamos.

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS reset_token            TEXT,
  ADD COLUMN IF NOT EXISTS reset_token_expira_em  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_usuarios_reset_token
  ON usuarios (reset_token) WHERE reset_token IS NOT NULL;
