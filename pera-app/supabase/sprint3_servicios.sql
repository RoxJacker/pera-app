-- ==============================================================
-- Belleza Pera — Sprint 3: Catálogo de Servicios
-- ==============================================================

-- 1. Crear tabla de servicios
CREATE TABLE IF NOT EXISTS public.servicios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    precio NUMERIC(10, 2) NOT NULL DEFAULT 0,
    duracion_min INTEGER NOT NULL DEFAULT 45,
    pedestal_color TEXT DEFAULT '#EBD9CC',
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Trigger para actualizar fecha de modificación
DROP TRIGGER IF EXISTS update_servicios_updated_at ON public.servicios;
CREATE TRIGGER update_servicios_updated_at
    BEFORE UPDATE ON public.servicios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 3. Habilitar RLS y políticas
ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo acceso a servicios" ON public.servicios;
CREATE POLICY "Permitir todo acceso a servicios"
ON public.servicios
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 4. Sembrado inicial de servicios del salón
INSERT INTO public.servicios (nombre, precio, duracion_min, pedestal_color)
VALUES
    ('Corte + peinado', 250.00, 60, '#EBD9CC'),
    ('Manicura completa', 180.00, 45, '#E4D9CB'),
    ('Coloración completa', 420.00, 90, '#D9C2AC'),
    ('Tratamiento capilar', 320.00, 60, '#F3DFD5')
ON CONFLICT DO NOTHING;
