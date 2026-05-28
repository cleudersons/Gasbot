-- 020 — Perfil completo da agência
-- Campos adicionais editáveis em /dashboard/minha-conta.
-- Não bloqueiam recursos hoje; servem de gate pra features futuras
-- e disparam notificação "Complete seu perfil" (virtual) no sininho.

ALTER TABLE agencias
  ADD COLUMN IF NOT EXISTS nome_deposito   TEXT,
  ADD COLUMN IF NOT EXISTS cidade          TEXT,
  ADD COLUMN IF NOT EXISTS estado          TEXT,  -- UF, 2 letras
  ADD COLUMN IF NOT EXISTS cpf_cnpj        TEXT,
  ADD COLUMN IF NOT EXISTS tipo_documento  TEXT;  -- 'cpf' | 'cnpj'
