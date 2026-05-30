-- 025 — Unique constraint em demo_cliente_whatsapp + normaliza 9 BR
-- Garante que o mesmo número de teste não pode estar vinculado em 2 agências.
-- Antes desse índice, era possível haver colisão se o cliente digitasse um
-- número que outro cliente já tinha vinculado.

-- 1. Normaliza registros antigos no formato 12 dígitos (sem o 9 obrigatório
--    do celular brasileiro) para 13 dígitos. Evita colisão silenciosa entre
--    "5511955551111" e "551195555111" do mesmo aparelho.
UPDATE agencias
SET demo_cliente_whatsapp =
  SUBSTRING(demo_cliente_whatsapp FROM 1 FOR 4)
  || '9'
  || SUBSTRING(demo_cliente_whatsapp FROM 5)
WHERE demo_cliente_whatsapp IS NOT NULL
  AND demo_cliente_whatsapp LIKE '55%'
  AND LENGTH(demo_cliente_whatsapp) = 12;

-- 2. Índice único parcial (só onde o campo não é NULL).
CREATE UNIQUE INDEX IF NOT EXISTS idx_agencias_demo_cliente_whatsapp_uniq
ON agencias (demo_cliente_whatsapp)
WHERE demo_cliente_whatsapp IS NOT NULL;
