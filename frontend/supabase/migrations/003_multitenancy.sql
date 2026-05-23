-- ===================================================================
-- SutoGas — Semana 7: Multi-tenancy + autenticação por agência
-- ===================================================================

-- 1) Tabela de usuários ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.usuarios (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  senha_hash  TEXT NOT NULL,                                  -- bcrypt
  nome        TEXT,
  agencia_id  UUID REFERENCES public.agencias(id) ON DELETE CASCADE,  -- null se for master
  is_master   BOOLEAN NOT NULL DEFAULT FALSE,
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS usuarios_agencia_idx ON public.usuarios(agencia_id);
CREATE INDEX IF NOT EXISTS usuarios_email_idx   ON public.usuarios(email);

-- Garantir consistência: usuário comum (não-master) precisa de agencia_id
ALTER TABLE public.usuarios
  DROP CONSTRAINT IF EXISTS usuarios_agencia_check;
ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_agencia_check
  CHECK (is_master = TRUE OR agencia_id IS NOT NULL);

-- 2) Roteamento do webhook — identificadores únicos por agência -----
-- Meta: phone_number_id  |  Z-API: zapi_instance_id
CREATE UNIQUE INDEX IF NOT EXISTS agencias_phone_number_id_uidx
  ON public.agencias(phone_number_id) WHERE phone_number_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS agencias_zapi_instance_uidx
  ON public.agencias(zapi_instance_id) WHERE zapi_instance_id IS NOT NULL;

-- 3) Trial via número demo — mapear cliente → agência trial ----------
-- O número demo é compartilhado, então a agência trial é identificada
-- pelo número do CLIENTE (remetente). Garantimos no nível do banco
-- que cada cliente só tenha 1 agência demo.
ALTER TABLE public.agencias
  ADD COLUMN IF NOT EXISTS demo_cliente_whatsapp TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS agencias_demo_cliente_uidx
  ON public.agencias(demo_cliente_whatsapp)
  WHERE demo_cliente_whatsapp IS NOT NULL;

-- 4) RLS — manter habilitado (políticas existentes da Semana 5) ------
-- service_role (backend + API routes do Next) continua bypassando RLS.

-- 5) Seeds iniciais --------------------------------------------------
-- Hashes bcrypt pré-calculados (cost 10):
--   admin@sutogas.com.br     → sutogas@master2024
--   deposito@teste.com.br    → deposito@2024
--
-- Geração: bcrypt.hashSync('sutogas@master2024', 10)
--          bcrypt.hashSync('deposito@2024', 10)

-- Master (não tem agencia_id)
INSERT INTO public.usuarios (email, senha_hash, nome, is_master)
VALUES (
  'admin@sutogas.com.br',
  '$2b$10$RLlYmPV5yt1wfvjL5oNJheeDF3VA7qpDaEOLnlOhS8m236Wz0xAoa',
  'Admin SutoGas',
  TRUE
)
ON CONFLICT (email) DO NOTHING;

-- Operador da agência de testes (DEFAULT_AGENCIA_ID)
INSERT INTO public.usuarios (email, senha_hash, nome, agencia_id, is_master)
VALUES (
  'deposito@teste.com.br',
  '$2b$10$5v..FGDbCyjqYcGbH4OobOlTGBnkU7cXRbsIhuhPTVvKUVbmR8VF.',
  'Depósito Teste',
  'd964cfc4-8590-4417-9a35-445b841d67c7',
  FALSE
)
ON CONFLICT (email) DO NOTHING;
