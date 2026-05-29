-- 023 — Modal de boas-vindas aparece só uma vez por agência
ALTER TABLE agencias
  ADD COLUMN IF NOT EXISTS viu_tutorial_inicial BOOLEAN DEFAULT false;
