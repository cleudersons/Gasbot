-- ===================================================================
-- SutoGas — Forma de pagamento no pedido
-- ===================================================================

ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS forma_pagamento TEXT;
