-- 017 — Semana 11: notificações + feedback fundador
-- ----------------------------------------------------------------------
-- A) notificacoes: sininho do dashboard. Tabela genérica reutilizável
--    (não só pra campanha fundador). Cada registro pertence a uma agência.
-- B) fundador_feedback: respostas do formulário (logado OU link público).
--    origem='logado' tem agencia_id; origem='publico' usa token.
-- C) agencias ganha 4 colunas:
--    - viu_popup_fundador: popup de oferta só aparece uma vez.
--    - fundador_notificacao_enviada_em: job D+2 não duplica notificação.
--    - fundador_feedback_prazo: prazo de 15 dias pra responder.
--    - fundador_feedback_token: token único pro link público /f/<token>.

ALTER TABLE agencias
  ADD COLUMN IF NOT EXISTS viu_popup_fundador            BOOLEAN     DEFAULT false,
  ADD COLUMN IF NOT EXISTS fundador_notificacao_enviada_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fundador_feedback_prazo       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fundador_feedback_token       TEXT UNIQUE;

CREATE TABLE IF NOT EXISTS notificacoes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id  UUID NOT NULL REFERENCES agencias(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL,           -- 'feedback_fundador', 'sistema', ...
  titulo      TEXT NOT NULL,
  mensagem    TEXT,
  link        TEXT,                    -- rota interna do dashboard
  lida        BOOLEAN NOT NULL DEFAULT false,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_agencia_lida
  ON notificacoes (agencia_id, lida, criado_em DESC);

CREATE TABLE IF NOT EXISTS fundador_feedback (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id          UUID REFERENCES agencias(id) ON DELETE SET NULL,
  origem              TEXT NOT NULL CHECK (origem IN ('logado','publico')),
  token               TEXT,            -- preenchido quando origem='publico'
  satisfacao          INT CHECK (satisfacao BETWEEN 1 AND 5),
  sugestoes           TEXT,
  video_ja_enviado    BOOLEAN NOT NULL DEFAULT false,
  indicacao1_nome     TEXT,
  indicacao1_whatsapp TEXT,
  indicacao2_nome     TEXT,
  indicacao2_whatsapp TEXT,
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fundador_feedback_agencia
  ON fundador_feedback (agencia_id, criado_em DESC);

-- Gera token pra quem já é fundador e ainda não tem (idempotente)
UPDATE agencias
   SET fundador_feedback_token = encode(gen_random_bytes(16), 'hex')
 WHERE programa_fundador = true
   AND fundador_feedback_token IS NULL;
