-- Plano publico (aparece em /dashboard/planos) ou oculto (so via checkout direto + webhook)
ALTER TABLE planos ADD COLUMN IF NOT EXISTS publico BOOLEAN NOT NULL DEFAULT true;
