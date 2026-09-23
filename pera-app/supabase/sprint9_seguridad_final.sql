-- ============================================================
-- SPRINT 9: SEGURIDAD, POLÍTICAS RLS E ÍNDICES DE PRODUCCIÓN
-- Cosméticos y Belleza Pera
-- ============================================================

-- 1. Habilitar Row Level Security (RLS) en todas las tablas principales
ALTER TABLE IF EXISTS public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.movimientos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.venta_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.gastos_fijos_mensuales ENABLE ROW LEVEL SECURITY;

-- 2. Políticas de Acceso Completo (Producción / Sistema de Negocio)
-- Productos
DROP POLICY IF EXISTS "Permitir todo acceso a productos" ON public.productos;
CREATE POLICY "Permitir todo acceso a productos"
ON public.productos FOR ALL USING (true) WITH CHECK (true);

-- Servicios
DROP POLICY IF EXISTS "Permitir todo acceso a servicios" ON public.servicios;
CREATE POLICY "Permitir todo acceso a servicios"
ON public.servicios FOR ALL USING (true) WITH CHECK (true);

-- Movimientos de inventario
DROP POLICY IF EXISTS "Permitir todo acceso a movimientos_inventario" ON public.movimientos_inventario;
CREATE POLICY "Permitir todo acceso a movimientos_inventario"
ON public.movimientos_inventario FOR ALL USING (true) WITH CHECK (true);

-- Ventas
DROP POLICY IF EXISTS "Permitir todo acceso a ventas" ON public.ventas;
CREATE POLICY "Permitir todo acceso a ventas"
ON public.ventas FOR ALL USING (true) WITH CHECK (true);

-- Venta Items
DROP POLICY IF EXISTS "Permitir todo acceso a venta_items" ON public.venta_items;
CREATE POLICY "Permitir todo acceso a venta_items"
ON public.venta_items FOR ALL USING (true) WITH CHECK (true);

-- Citas
DROP POLICY IF EXISTS "Permitir todo acceso a citas" ON public.citas;
CREATE POLICY "Permitir todo acceso a citas"
ON public.citas FOR ALL USING (true) WITH CHECK (true);

-- Gastos Fijos Mensuales
DROP POLICY IF EXISTS "Permitir todo acceso a gastos_fijos_mensuales" ON public.gastos_fijos_mensuales;
CREATE POLICY "Permitir todo acceso a gastos_fijos_mensuales"
ON public.gastos_fijos_mensuales FOR ALL USING (true) WITH CHECK (true);

-- 3. Índices de Alto Rendimiento para Consultas Rápidas
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON public.productos (nombre);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON public.productos (categoria);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha_desc ON public.ventas (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_ventas_folio ON public.ventas (folio);
CREATE INDEX IF NOT EXISTS idx_ventas_cliente ON public.ventas (cliente_nombre);
CREATE INDEX IF NOT EXISTS idx_venta_items_venta_id ON public.venta_items (venta_id);
CREATE INDEX IF NOT EXISTS idx_citas_fecha ON public.citas (fecha);
CREATE INDEX IF NOT EXISTS idx_citas_estado ON public.citas (estado);

-- 4. Notificación de auditoría final
DO $$
BEGIN
  RAISE NOTICE 'Sprint 9: Seguridad, RLS e índices aplicados con éxito para Cosméticos y Belleza Pera.';
END $$;
