-- ==============================================================
-- Belleza Pera — Sprint 2: Entradas de Inventario (Compras)
-- ==============================================================

-- 1. Tabla de Movimientos de Inventario
CREATE TABLE IF NOT EXISTS public.movimientos_inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL DEFAULT 'compra', -- 'compra', 'ajuste', 'devolucion'
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    costo_unitario NUMERIC(10, 2) NOT NULL DEFAULT 0,
    proveedor TEXT,
    fecha TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE public.movimientos_inventario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir todo acceso anónimo a movimientos"
ON public.movimientos_inventario
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 3. Función transaccional atómica para registrar entrada
-- Inserta el movimiento, suma el stock y actualiza el costo de referencia en una sola transacción
CREATE OR REPLACE FUNCTION public.registrar_entrada_inventario(
    p_producto_id UUID,
    p_cantidad INTEGER,
    p_costo_unitario NUMERIC,
    p_proveedor TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stock_anterior INTEGER;
    v_stock_nuevo INTEGER;
    v_costo_anterior NUMERIC;
    v_movimiento_id UUID;
    v_producto RECORD;
BEGIN
    -- Validaciones
    IF p_cantidad <= 0 THEN
        RAISE EXCEPTION 'La cantidad debe ser mayor a 0';
    END IF;

    -- Obtener producto y bloquear fila para evitar condiciones de carrera (FOR UPDATE)
    SELECT stock, costo INTO v_stock_anterior, v_costo_anterior
    FROM public.productos
    WHERE id = p_producto_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Producto con ID % no encontrado', p_producto_id;
    END IF;

    -- Calcular nuevo stock
    v_stock_nuevo := v_stock_anterior + p_cantidad;

    -- 1. Insertar el movimiento en la bitácora
    INSERT INTO public.movimientos_inventario (
        producto_id,
        tipo,
        cantidad,
        costo_unitario,
        proveedor,
        fecha
    ) VALUES (
        p_producto_id,
        'compra',
        p_cantidad,
        p_costo_unitario,
        p_proveedor,
        now()
    )
    RETURNING id INTO v_movimiento_id;

    -- 2. Actualizar stock y costo de referencia del producto
    UPDATE public.productos
    SET stock = v_stock_nuevo,
        costo = p_costo_unitario,
        updated_at = now()
    WHERE id = p_producto_id
    RETURNING * INTO v_producto;

    -- Retornar resultado estructurado
    RETURN jsonb_build_object(
        'success', true,
        'movimiento_id', v_movimiento_id,
        'producto_id', p_producto_id,
        'cantidad_ingresada', p_cantidad,
        'stock_anterior', v_stock_anterior,
        'stock_nuevo', v_stock_nuevo,
        'costo_anterior', v_costo_anterior,
        'costo_nuevo', p_costo_unitario
    );
END;
$$;
