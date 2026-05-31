-- Suporte interno: sistema de tickets entre cliente e admin (Cleuderson).
-- Cliente abre ticket em /dashboard/suporte; admin responde em /master/suporte.
-- IA será adicionada depois (Fase 2) — por isso `ia_sugestao` já existe pra
-- a IA preencher uma resposta sugerida que o admin revisa antes de enviar.

CREATE TABLE IF NOT EXISTS tickets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id   UUID NOT NULL REFERENCES agencias(id) ON DELETE CASCADE,
  assunto      TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'aberto'
               CHECK (status IN ('aberto', 'respondido', 'fechado')),
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fechado_em   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS tickets_agencia_idx       ON tickets(agencia_id);
CREATE INDEX IF NOT EXISTS tickets_status_idx        ON tickets(status);
CREATE INDEX IF NOT EXISTS tickets_atualizado_em_idx ON tickets(atualizado_em DESC);

CREATE TABLE IF NOT EXISTS ticket_mensagens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  autor       TEXT NOT NULL CHECK (autor IN ('user', 'admin')),
  mensagem    TEXT NOT NULL,
  ia_sugestao BOOLEAN NOT NULL DEFAULT false,
  lida        BOOLEAN NOT NULL DEFAULT false,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ticket_mensagens_ticket_idx ON ticket_mensagens(ticket_id, criado_em);

-- Trigger: atualiza tickets.atualizado_em a cada mensagem nova
CREATE OR REPLACE FUNCTION ticket_mensagens_touch_ticket()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tickets SET atualizado_em = NEW.criado_em WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ticket_mensagens_touch_ticket_trg ON ticket_mensagens;
CREATE TRIGGER ticket_mensagens_touch_ticket_trg
  AFTER INSERT ON ticket_mensagens
  FOR EACH ROW EXECUTE FUNCTION ticket_mensagens_touch_ticket();
