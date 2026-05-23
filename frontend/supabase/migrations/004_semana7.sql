-- ===================================================================
-- SutoGas — Semana 7: Horário + Agendamento + Distribuição + Lembretes
-- ===================================================================

-- Horário de atendimento na agência
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS horario_inicio TIME DEFAULT '08:00';
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS horario_fim    TIME DEFAULT '22:00';
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS atendimento_ativo BOOLEAN DEFAULT TRUE;
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Sao_Paulo';

-- Pedidos agendados
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS agendado_para TIMESTAMPTZ;
-- status novo aceito: 'agendado'

-- Distribuição de entregadores
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS distribuicao_modo TEXT DEFAULT 'todos';
-- distribuicao_modo: 'todos' | 'revezamento' | 'manual' | 'zonas'
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS distribuicao_ultimo_entregador UUID;

-- Zonas por entregador
CREATE TABLE IF NOT EXISTS entregador_zonas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entregador_id UUID NOT NULL REFERENCES entregadores(id) ON DELETE CASCADE,
  agencia_id    UUID NOT NULL REFERENCES agencias(id) ON DELETE CASCADE,
  zona          TEXT NOT NULL,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS entregador_zonas_agencia_idx ON entregador_zonas(agencia_id);
CREATE INDEX IF NOT EXISTS entregador_zonas_entregador_idx ON entregador_zonas(entregador_id);

-- Lembretes de recompra
CREATE TABLE IF NOT EXISTS lembretes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id       UUID NOT NULL REFERENCES agencias(id) ON DELETE CASCADE,
  cliente_whatsapp TEXT NOT NULL,
  pedido_id        UUID REFERENCES pedidos(id),
  enviar_em        TIMESTAMPTZ NOT NULL,
  enviado          BOOLEAN DEFAULT FALSE,
  enviado_em       TIMESTAMPTZ,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lembretes_envio_idx ON lembretes(enviar_em) WHERE enviado = FALSE;
CREATE INDEX IF NOT EXISTS lembretes_agencia_idx ON lembretes(agencia_id);
