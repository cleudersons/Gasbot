-- Semana 10.6 — tabela de planos dinâmica + auditoria do slug pago
CREATE TABLE IF NOT EXISTS planos (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                 TEXT UNIQUE NOT NULL,
  nome                 TEXT NOT NULL,
  descricao            TEXT,
  categoria            TEXT NOT NULL CHECK (categoria IN ('basico','pro')),
  preco_normal         NUMERIC(10,2),
  limite_atendimentos  INT,
  duracao_dias         INT NOT NULL DEFAULT 30,
  fundador             BOOLEAN NOT NULL DEFAULT false,
  ativo                BOOLEAN NOT NULL DEFAULT true,
  criado_em            TIMESTAMPTZ DEFAULT now(),
  atualizado_em        TIMESTAMPTZ DEFAULT now()
);

INSERT INTO planos (slug, nome, categoria, preco_normal, limite_atendimentos, duracao_dias, fundador) VALUES
  ('sutogasbasico',          'Básico',          'basico', 247.00, 200,  30, false),
  ('sutogaspro',             'Pro',             'pro',    447.00, NULL, 30, false),
  ('sutogaspremiumfundador', 'Básico Fundador', 'basico', 123.50, 200,  30, true),
  ('sutogaspremiupro',       'Pro Fundador',    'pro',    223.50, NULL, 30, true)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE agencias ADD COLUMN IF NOT EXISTS plano_slug TEXT;
