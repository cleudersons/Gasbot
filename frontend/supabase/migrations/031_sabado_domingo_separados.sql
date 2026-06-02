-- Separar configuração de fim de semana em sábado e domingo, pra depósitos
-- que querem horários diferentes (ex: sábado abre meio-dia, domingo fechado).
-- Renomeia colunas fim_semana_* → sabado_* e adiciona domingo_*.

ALTER TABLE agencias RENAME COLUMN fim_semana_modo   TO sabado_modo;
ALTER TABLE agencias RENAME COLUMN fim_semana_inicio TO sabado_inicio;
ALTER TABLE agencias RENAME COLUMN fim_semana_fim    TO sabado_fim;

-- Renomeia a constraint pra refletir o novo nome (CHECK pega o nome novo
-- mas a constraint em si ainda tem o nome antigo)
ALTER TABLE agencias DROP CONSTRAINT IF EXISTS agencias_fim_semana_modo_check;
ALTER TABLE agencias ADD CONSTRAINT agencias_sabado_modo_check
  CHECK (sabado_modo IN ('mesmo', 'fechado', 'customizado'));

ALTER TABLE agencias
  ADD COLUMN IF NOT EXISTS domingo_modo TEXT NOT NULL DEFAULT 'mesmo'
    CHECK (domingo_modo IN ('mesmo', 'fechado', 'customizado'));

ALTER TABLE agencias ADD COLUMN IF NOT EXISTS domingo_inicio TIME;
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS domingo_fim    TIME;
