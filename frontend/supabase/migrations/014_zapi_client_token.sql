-- Z-API: token de seguranca da conta (header Client-Token).
-- Necessario quando o usuario mantem 'Token de seguranca da conta' ATIVO
-- no painel Z-API (Seguranca > item 3).
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS zapi_client_token TEXT;
