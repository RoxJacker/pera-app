-- ==============================================================
-- Belleza Pera — Sprint 4: Agenda de Citas
-- ==============================================================

-- 1. Crear tabla de citas
CREATE TABLE IF NOT EXISTS public.citas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    servicio_id UUID REFERENCES public.servicios(id) ON DELETE SET NULL,
    cliente_nombre TEXT NOT NULL,
    cliente_telefono TEXT,
    fecha DATE NOT NULL,
    hora TEXT NOT NULL, -- ej. '10:00 am', '2:00 pm', '4:30 pm'
    duracion_min INTEGER NOT NULL DEFAULT 45,
    precio NUMERIC(10, 2) DEFAULT 0,
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmada', 'completada', 'cancelada')),
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Trigger para fecha de actualización
DROP TRIGGER IF EXISTS update_citas_updated_at ON public.citas;
CREATE TRIGGER update_citas_updated_at
    BEFORE UPDATE ON public.citas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 3. Habilitar RLS y políticas
ALTER TABLE public.citas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo acceso a citas" ON public.citas;
CREATE POLICY "Permitir todo acceso a citas"
ON public.citas
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 4. Sembrado de citas iniciales (Hoy, Mañana y próximos días)
-- Vinculando con los servicios existentes si están disponibles
DO $$
DECLARE
    v_corte_id UUID;
    v_manicura_id UUID;
    v_color_id UUID;
    v_trata_id UUID;
BEGIN
    SELECT id INTO v_corte_id FROM public.servicios WHERE nombre ILIKE '%corte%' LIMIT 1;
    SELECT id INTO v_manicura_id FROM public.servicios WHERE nombre ILIKE '%manicura%' LIMIT 1;
    SELECT id INTO v_color_id FROM public.servicios WHERE nombre ILIKE '%color%' LIMIT 1;
    SELECT id INTO v_trata_id FROM public.servicios WHERE nombre ILIKE '%tratamiento%' LIMIT 1;

    INSERT INTO public.citas (servicio_id, cliente_nombre, cliente_telefono, fecha, hora, duracion_min, precio, estado, notas)
    VALUES
        (v_corte_id, 'María López', '333-111-0000', CURRENT_DATE, '10:00 am', 60, 250.00, 'confirmada', 'Cliente frecuente'),
        (v_manicura_id, 'Sofía Ramírez', '333-555-4444', CURRENT_DATE, '12:30 pm', 45, 180.00, 'completada', 'Esmaltado en gel'),
        (v_color_id, 'Ana Ruiz', '333-222-1111', CURRENT_DATE + INTERVAL '1 day', '11:00 am', 90, 420.00, 'pendiente', 'Tinte rubio cenizo'),
        (v_manicura_id, 'Sandra Torres', '333-333-2222', CURRENT_DATE + INTERVAL '1 day', '2:00 pm', 45, 180.00, 'confirmada', 'Diseño floral'),
        (v_trata_id, 'Claudia Vega', '333-444-3333', CURRENT_DATE + INTERVAL '3 days', '9:30 am', 60, 320.00, 'pendiente', 'Primera vez en salón'),
        (v_corte_id, 'Lucía Méndez', '333-777-8888', CURRENT_DATE + INTERVAL '4 days', '4:30 pm', 60, 250.00, 'pendiente', 'Corte en capas')
    ON CONFLICT DO NOTHING;
END $$;
