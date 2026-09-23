-- ==============================================================
-- Belleza Pera — Sprint 7: Gastos Fijos Mensuales y Ganancias
-- ==============================================================

-- 1. Tabla de Gastos Fijos Mensuales (un único monto capturable por mes)
CREATE TABLE IF NOT EXISTS public.gastos_fijos_mensuales (
    mes TEXT PRIMARY KEY, -- Formato 'YYYY-MM', ejemplo '2026-09'
    monto NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger para updated_at en gastos_fijos_mensuales
DROP TRIGGER IF EXISTS update_gastos_fijos_updated_at ON public.gastos_fijos_mensuales;
CREATE TRIGGER update_gastos_fijos_updated_at
    BEFORE UPDATE ON public.gastos_fijos_mensuales
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. Habilitar RLS y políticas
ALTER TABLE public.gastos_fijos_mensuales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo acceso a gastos_fijos_mensuales" ON public.gastos_fijos_mensuales;
CREATE POLICY "Permitir todo acceso a gastos_fijos_mensuales"
ON public.gastos_fijos_mensuales
FOR ALL
USING (true)
WITH CHECK (true);

-- 3. Sembrado inicial para el mes actual si no existe
INSERT INTO public.gastos_fijos_mensuales (mes, monto)
VALUES (to_char(now(), 'YYYY-MM'), 850.00)
ON CONFLICT (mes) DO NOTHING;
