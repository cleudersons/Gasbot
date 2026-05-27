-- 020 — Horário de expediente do entregador + lembrete de reabertura da janela
-- ----------------------------------------------------------------------
-- A janela de 24h da Meta Cloud API fecha se o entregador não interagir.
-- Para reabrir, o bot manda uma mensagem 10 min antes do expediente
-- começar pedindo "to pronto" — o entregador responde e a janela reabre.

ALTER TABLE entregadores
  ADD COLUMN IF NOT EXISTS expediente_inicio TIME,
  ADD COLUMN IF NOT EXISTS expediente_fim    TIME,
  ADD COLUMN IF NOT EXISTS lembrete_inicio_enviado_em TIMESTAMPTZ;
