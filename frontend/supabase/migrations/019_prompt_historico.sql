-- 019 — Histórico de versões do prompt (backup + restauração)
-- ----------------------------------------------------------------------
-- Salva snapshot do prompt a cada save em /dashboard/configuracoes.
-- Limite: 5 versões mais recentes por agência (mantido pela API no save).
-- O cliente pode deletar versões manualmente (pra manter < 5) e renomear.

CREATE TABLE IF NOT EXISTS prompt_historico (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id    UUID NOT NULL REFERENCES agencias(id) ON DELETE CASCADE,
  nome          TEXT,            -- rótulo editável; null = mostra a data
  prompt_texto  TEXT NOT NULL,   -- string final usada pela IA
  prompt_config JSONB,           -- snapshot do formulário (modo form)
  modo          TEXT,            -- 'form' | 'livre'
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prompt_historico_agencia_criado
  ON prompt_historico (agencia_id, criado_em DESC);
