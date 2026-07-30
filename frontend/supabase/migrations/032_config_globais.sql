-- 032 — Configurações globais do SutoGas (linha única)
-- Primeiro uso: pausar o agente de IA no número demo/teste sem precisar
-- desativar agência por agência (o trial demo cria uma agência nova pra
-- cada WhatsApp que testa, então o toggle por agência não segura todas).

CREATE TABLE IF NOT EXISTS config_globais (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id = true), -- singleton
  agente_demo_pausado BOOLEAN NOT NULL DEFAULT false,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO config_globais (id) VALUES (true)
ON CONFLICT (id) DO NOTHING;
