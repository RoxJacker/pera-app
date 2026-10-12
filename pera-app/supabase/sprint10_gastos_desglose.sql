-- ==============================================================
-- Belleza Pera — Sprint 10: Desglose de Gastos Fijos
-- Migra de un único monto mensual a ítems individuales
-- ==============================================================

-- 1. Nueva tabla de conceptos de gastos fijos
CREATE TABLE IF NOT EXISTS public.gastos_fijos_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mes         TEXT NOT NULL,           -- Formato 'YYYY-MM'
    concepto    TEXT NOT NULL,           -- Ej. 'Renta', 'Luz', 'Insumos generales'
    monto       NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. Índice por mes para consultas rápidas
CREATE INDEX IF NOT EXISTS gastos_fijos_items_mes_idx
    ON public.gastos_fijos_items (mes);

-- 3. Trigger de updated_at
DROP TRIGGER IF EXISTS update_gastos_fijos_items_updated_at ON public.gastos_fijos_items;
CREATE TRIGGER update_gastos_fijos_items_updated_at
    BEFORE UPDATE ON public.gastos_fijos_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Habilitar RLS
ALTER TABLE public.gastos_fijos_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo acceso a gastos_fijos_items" ON public.gastos_fijos_items;
CREATE POLICY "Permitir todo acceso a gastos_fijos_items"
ON public.gastos_fijos_items
FOR ALL
USING (true)
WITH CHECK (true);

-- 5. Datos de ejemplo para el mes actual
INSERT INTO public.gastos_fijos_items (mes, concepto, monto)
VALUES
  (to_char(now(), 'YYYY-MM'), 'Renta del local',   3500.00),
  (to_char(now(), 'YYYY-MM'), 'Electricidad',        320.00),
  (to_char(now(), 'YYYY-MM'), 'Agua',                 80.00),
  (to_char(now(), 'YYYY-MM'), 'Internet',            299.00),
  (to_char(now(), 'YYYY-MM'), 'Insumos generales',   651.00)
ON CONFLICT DO NOTHING;
