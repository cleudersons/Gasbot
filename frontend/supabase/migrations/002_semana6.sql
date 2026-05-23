-- ===================================================================
-- SutoGas — Semana 6: Painel Master + Relatórios + Job automático
-- ===================================================================

ALTER TABLE agencias ADD COLUMN IF NOT EXISTS plano TEXT NOT NULL DEFAULT 'trial';
-- plano: 'trial' | 'basico' | 'pro'

ALTER TABLE agencias ADD COLUMN IF NOT EXISTS status_conta TEXT NOT NULL DEFAULT 'ativo';
-- status_conta: 'ativo' | 'suspenso' | 'trial'

ALTER TABLE agencias ADD COLUMN IF NOT EXISTS trial_inicio TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS trial_atendimentos INTEGER DEFAULT 0;
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS whatsapp_dono TEXT;
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS prompt_customizado TEXT;

ALTER TABLE agencias ADD COLUMN IF NOT EXISTS relatorio_frequencia TEXT DEFAULT 'diario';
-- relatorio_frequencia: 'diario' | 'semanal' | 'mensal' | 'todos'

ALTER TABLE agencias ADD COLUMN IF NOT EXISTS relatorio_ultimo_envio TIMESTAMPTZ;
