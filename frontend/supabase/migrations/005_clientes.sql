-- ===================================================================
-- SutoGas — Clientes + lembretes flexíveis (preditivo)
-- ===================================================================

CREATE TABLE IF NOT EXISTS clientes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id          UUID NOT NULL REFERENCES agencias(id) ON DELETE CASCADE,
  whatsapp            TEXT NOT NULL,
  nome                TEXT,
  dias_recarga        INTEGER DEFAULT 30,
  total_pedidos       INTEGER DEFAULT 0,
  ultimo_pedido       TIMESTAMPTZ,
  produto_preferido   TEXT,
  endereco_preferido  TEXT,
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agencia_id, whatsapp)
);

CREATE INDEX IF NOT EXISTS clientes_agencia_idx ON clientes(agencia_id);
CREATE INDEX IF NOT EXISTS clientes_ultimo_idx  ON clientes(ultimo_pedido);

ALTER TABLE lembretes ADD COLUMN IF NOT EXISTS dias_escolhidos INTEGER DEFAULT 30;
