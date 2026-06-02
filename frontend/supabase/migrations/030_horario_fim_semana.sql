-- Configuração de horário específico pra fim de semana (sábado e domingo).
-- Padrão 'mesmo': usa o horário regular pros dois dias.
-- 'fechado': bot não atende em sáb/dom (mesmo se atendimento_ativo=true).
-- 'customizado': usa fim_semana_inicio e fim_semana_fim como janela.

ALTER TABLE agencias
  ADD COLUMN IF NOT EXISTS fim_semana_modo TEXT NOT NULL DEFAULT 'mesmo'
    CHECK (fim_semana_modo IN ('mesmo', 'fechado', 'customizado'));

ALTER TABLE agencias
  ADD COLUMN IF NOT EXISTS fim_semana_inicio TIME;

ALTER TABLE agencias
  ADD COLUMN IF NOT EXISTS fim_semana_fim TIME;
