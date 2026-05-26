-- 016 — Limite de entregadores por plano + pedidos multi-item + total
-- ----------------------------------------------------------------------
-- A) planos.limite_entregadores: básico = 2, pro = NULL (ilimitado).
--    NULL significa "sem limite" (igual semântica de limite_atendimentos).
-- B) pedidos.itens (JSONB): lista de {produto, quantidade, preco_unit, subtotal}
--    quando o cliente faz pedido com mais de um produto.
-- C) pedidos.valor_total (NUMERIC): soma final do pedido em reais.
--
-- Compat retroativa: pedidos antigos continuam funcionando com produto/quantidade
-- nas colunas atuais; itens/valor_total ficam NULL pra eles.
-- A coluna `limite_atendimentos` passa a representar "pedidos confirmados por mês"
-- (renomeação só semântica; nome técnico fica para não quebrar o que já existe).

ALTER TABLE planos
  ADD COLUMN IF NOT EXISTS limite_entregadores INT;

-- Seed: básico = 2, pro = NULL (já é o default da coluna nova)
UPDATE planos SET limite_entregadores = 2
  WHERE categoria = 'basico' AND limite_entregadores IS NULL;

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS itens       JSONB,
  ADD COLUMN IF NOT EXISTS valor_total NUMERIC(10,2);

-- Índice para a consulta "pedidos do mês" usada no enforcement do plano
CREATE INDEX IF NOT EXISTS idx_pedidos_agencia_criado
  ON pedidos (agencia_id, criado_em DESC);
