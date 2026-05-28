-- 022 — Rejeição de pedidos por entregadores
-- Quando entregador responde "NÃO ACEITO" via WhatsApp, registra o ID dele aqui.
-- Sistema usa pra: (a) não reofertar pro mesmo no modo revezamento,
-- (b) detectar quando TODOS rejeitaram e avisar o dono.

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS rejeitado_por UUID[] DEFAULT '{}'::uuid[];
