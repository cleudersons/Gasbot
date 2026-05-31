-- 027 — Status 'inadimplente' + datas de transição
--
-- status_conta passa a aceitar 'inadimplente' (além de trial/ativo/suspenso).
-- A coluna é TEXT livre (sem CHECK), só documentação.
--
-- Fluxo:
--   ativo --(cobrança falhou OU vencimento passou)--> inadimplente (inadimplente_desde=now())
--   inadimplente --(3 dias depois)--> suspenso (suspensa_em=now())
--   inadimplente/suspenso --(pagamento_confirmado)--> ativo (zera ambas datas)

ALTER TABLE agencias ADD COLUMN IF NOT EXISTS inadimplente_desde TIMESTAMPTZ;
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS suspensa_em TIMESTAMPTZ;

-- Índice pro job diário varrer rapidamente
CREATE INDEX IF NOT EXISTS idx_agencias_inadimplente_desde
  ON agencias (inadimplente_desde)
  WHERE inadimplente_desde IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agencias_vencimento_status
  ON agencias (status_conta, vencimento_plano)
  WHERE vencimento_plano IS NOT NULL;
