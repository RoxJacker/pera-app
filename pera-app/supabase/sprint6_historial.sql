-- ==============================================================
-- Belleza Pera — Sprint 6: Historial de Ventas e Índices
-- ==============================================================

-- 1. Índices de rendimiento para consultas y ordenamiento del historial de ventas
CREATE INDEX IF NOT EXISTS idx_ventas_fecha_desc ON public.ventas (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_ventas_folio ON public.ventas (folio);
CREATE INDEX IF NOT EXISTS idx_ventas_estado ON public.ventas (estado);
CREATE INDEX IF NOT EXISTS idx_ventas_cliente ON public.ventas (cliente_nombre);

-- 2. Índice para la relación de items con la venta
CREATE INDEX IF NOT EXISTS idx_venta_items_venta_id ON public.venta_items (venta_id);
CREATE INDEX IF NOT EXISTS idx_venta_items_producto_id ON public.venta_items (producto_id);
CREATE INDEX IF NOT EXISTS idx_venta_items_servicio_id ON public.venta_items (servicio_id);
