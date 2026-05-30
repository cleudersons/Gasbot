-- 026 — Inbox do gerente (admin-agent)
-- Tabela onde o sistema registra TUDO que o agente gerente precisa saber:
-- cadastros novos, compras externas, eventuais bugs, anomalias, etc.
-- Painel /master/gerente vai listar esses eventos em ordem cronológica.

CREATE TABLE IF NOT EXISTS admin_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,                       -- 'novo_cadastro', 'nova_compra', 'bug', 'anomalia'...
  titulo TEXT NOT NULL,
  descricao TEXT,
  dados JSONB,                              -- payload livre com detalhes técnicos
  severidade TEXT NOT NULL DEFAULT 'info'   -- info | sucesso | aviso | critico
    CHECK (severidade IN ('info', 'sucesso', 'aviso', 'critico')),
  lida BOOLEAN NOT NULL DEFAULT false,
  agencia_id UUID REFERENCES agencias(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_eventos_lida_criado
  ON admin_eventos (lida, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_admin_eventos_tipo_criado
  ON admin_eventos (tipo, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_admin_eventos_agencia
  ON admin_eventos (agencia_id) WHERE agencia_id IS NOT NULL;
