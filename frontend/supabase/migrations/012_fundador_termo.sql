-- Semana 10.5 — aceite do termo do Programa Premium Fundador
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS fundador_termo_aceito_em   TIMESTAMPTZ;
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS fundador_termo_aceito_ip   TEXT;
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS fundador_termo_user_agent  TEXT;
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS fundador_termo_oferta      TEXT;
