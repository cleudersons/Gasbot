-- 018 — Notificações manuais via painel master (broadcast por plano + fundador)
-- ----------------------------------------------------------------------
-- A) notificacoes ganha:
--    - categoria: tipo visual ('promocao','aviso','alerta','feedback_fundador','sistema')
--    - expira_em: notificação some do sininho após essa data (default: +30 dias)
--    - campanha_id: liga a notificação à campanha que a criou (pra cascade delete)
-- B) notificacao_campanhas: registro do broadcast criado pelo admin.
--    O fan-out (1 row por agência alvo) é feito no momento da criação.

ALTER TABLE notificacoes
  ADD COLUMN IF NOT EXISTS categoria   TEXT NOT NULL DEFAULT 'sistema',
  ADD COLUMN IF NOT EXISTS expira_em   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS campanha_id UUID;

DO $$ BEGIN
  ALTER TABLE notificacoes
    ADD CONSTRAINT notificacoes_categoria_chk
    CHECK (categoria IN ('promocao','aviso','alerta','feedback_fundador','sistema'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS notificacao_campanhas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria     TEXT NOT NULL CHECK (categoria IN ('promocao','aviso','alerta','sistema')),
  titulo        TEXT NOT NULL,
  mensagem      TEXT,
  link          TEXT,
  alvo_plano    TEXT,             -- 'basico','pro','trial' ou NULL = todos
  alvo_fundador TEXT NOT NULL DEFAULT 'todos'
    CHECK (alvo_fundador IN ('todos','fundador','nao_fundador')),
  expira_em     TIMESTAMPTZ NOT NULL,
  total_envios  INT NOT NULL DEFAULT 0,
  criada_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notificacao_campanhas_criada
  ON notificacao_campanhas (criada_em DESC);

DO $$ BEGIN
  ALTER TABLE notificacoes
    ADD CONSTRAINT notificacoes_campanha_fk
    FOREIGN KEY (campanha_id) REFERENCES notificacao_campanhas(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_notificacoes_campanha
  ON notificacoes (campanha_id);
