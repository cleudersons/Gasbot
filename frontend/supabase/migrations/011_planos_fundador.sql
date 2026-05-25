-- Semana 9 — planos pagos, recorrência e Programa Fundador
-- Ref: sutogas-planejamento-completo.md seção 6

ALTER TABLE agencias ADD COLUMN IF NOT EXISTS vencimento_plano        TIMESTAMPTZ;
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS limite_atendimentos     INT;
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS programa_fundador       BOOLEAN DEFAULT false;
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS fundador_desconto_ate   TIMESTAMPTZ;
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS ultimo_pagamento_valor  NUMERIC(10,2);
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS ultimo_pagamento_asaas  TEXT;
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS recorrencia_ativa       BOOLEAN DEFAULT false;
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS proxima_cobranca        TIMESTAMPTZ;
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS indicacoes_enviadas     BOOLEAN DEFAULT false;
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS indicacao_1_nome        TEXT;
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS indicacao_1_whatsapp    TEXT;
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS indicacao_2_nome        TEXT;
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS indicacao_2_whatsapp    TEXT;

CREATE TABLE IF NOT EXISTS programa_fundador_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vagas_total     INT DEFAULT 50,
  vagas_usadas    INT DEFAULT 0,
  ativo           BOOLEAN DEFAULT true,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

INSERT INTO programa_fundador_config (vagas_total, vagas_usadas, ativo)
SELECT 50, 0, true
WHERE NOT EXISTS (SELECT 1 FROM programa_fundador_config);
