-- ==============================================================
-- Belleza Pera — Sprint 5: POS Flujo de Venta Transaccional
-- ==============================================================

-- 1. Secuencia para folios correlativos (#0043, #0044, ...)
CREATE SEQUENCE IF NOT EXISTS public.secuencia_folio_ventas START WITH 43;

-- 2. Tabla de Ventas
CREATE TABLE IF NOT EXISTS public.ventas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folio TEXT NOT NULL UNIQUE,
    total NUMERIC(10, 2) NOT NULL DEFAULT 0,
    ganancia_bruta NUMERIC(10, 2) NOT NULL DEFAULT 0,
    metodo_pago TEXT NOT NULL CHECK (metodo_pago IN ('Efectivo', 'Tarjeta', 'Transferencia')),
    estado TEXT NOT NULL DEFAULT 'completada' CHECK (estado IN ('completada', 'cancelada')),
    cliente_nombre TEXT,
    fecha TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger para updated_at en ventas
DROP TRIGGER IF EXISTS update_ventas_updated_at ON public.ventas;
CREATE TRIGGER update_ventas_updated_at
    BEFORE UPDATE ON public.ventas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 3. Tabla de Items de Venta
CREATE TABLE IF NOT EXISTS public.venta_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('producto', 'servicio')),
    producto_id UUID REFERENCES public.productos(id) ON DELETE SET NULL,
    servicio_id UUID REFERENCES public.servicios(id) ON DELETE SET NULL,
    nombre TEXT NOT NULL,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10, 2) NOT NULL,
    costo_unitario NUMERIC(10, 2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(10, 2) NOT NULL
);

-- 4. Habilitar RLS y políticas
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venta_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo acceso a ventas" ON public.ventas;
CREATE POLICY "Permitir todo acceso a ventas"
ON public.ventas
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo acceso a venta_items" ON public.venta_items;
CREATE POLICY "Permitir todo acceso a venta_items"
ON public.venta_items
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 5. Procedimiento Atómico: procesar_venta
CREATE OR REPLACE FUNCTION public.procesar_venta(
    p_items JSONB,
    p_metodo_pago TEXT,
    p_cliente_nombre TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_venta_id UUID := gen_random_uuid();
    v_folio TEXT;
    v_total NUMERIC := 0;
    v_ganancia_bruta NUMERIC := 0;
    v_item RECORD;
    v_prod_stock INTEGER;
    v_prod_costo NUMERIC;
    v_prod_nombre TEXT;
    v_tipo TEXT;
    v_prod_id UUID;
    v_serv_id UUID;
    v_nombre TEXT;
    v_cantidad INTEGER;
    v_precio NUMERIC;
    v_costo NUMERIC;
    v_subtotal NUMERIC;
    v_item_ganancia NUMERIC;
BEGIN
    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'El carrito de venta no puede estar vacío';
    END IF;

    -- Generar folio consecutivo
    v_folio := '#' || LPAD(nextval('public.secuencia_folio_ventas')::TEXT, 4, '0');

    -- Registrar la cabecera de la venta primero (para satisfacer la FK venta_items_venta_id_fkey)
    INSERT INTO public.ventas (
        id,
        folio,
        total,
        ganancia_bruta,
        metodo_pago,
        estado,
        cliente_nombre,
        fecha
    ) VALUES (
        v_venta_id,
        v_folio,
        0,
        0,
        p_metodo_pago,
        'completada',
        p_cliente_nombre,
        now()
    );

    -- Iterar sobre cada item del carrito
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        tipo TEXT,
        id TEXT,
        nombre TEXT,
        cantidad INT,
        precio_unitario NUMERIC
    )
    LOOP
        v_tipo := LOWER(v_item.tipo);
        v_nombre := v_item.nombre;
        v_cantidad := v_item.cantidad;
        v_precio := v_item.precio_unitario;
        v_subtotal := v_precio * v_cantidad;

        IF v_cantidad <= 0 THEN
            RAISE EXCEPTION 'La cantidad para "%" debe ser mayor a 0', v_nombre;
        END IF;

        IF v_tipo = 'producto' THEN
            v_prod_id := v_item.id::UUID;
            v_serv_id := NULL;

            -- Bloquear fila del producto para evitar carreras
            SELECT stock, costo, nombre INTO v_prod_stock, v_prod_costo, v_prod_nombre
            FROM public.productos
            WHERE id = v_prod_id
            FOR UPDATE;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Producto "%" no encontrado en el catálogo', v_nombre;
            END IF;

            -- Validar stock disponible
            IF v_prod_stock < v_cantidad THEN
                RAISE EXCEPTION 'Stock insuficiente para "%": disponibles %, solicitados %',
                    v_prod_nombre, v_prod_stock, v_cantidad;
            END IF;

            -- Descontar inventario
            UPDATE public.productos
            SET stock = stock - v_cantidad,
                updated_at = now()
            WHERE id = v_prod_id;

            v_costo := v_prod_costo;
            v_item_ganancia := (v_precio - v_costo) * v_cantidad;

            -- Registrar movimiento de salida por venta
            INSERT INTO public.movimientos_inventario (
                producto_id,
                tipo,
                cantidad,
                costo_unitario,
                proveedor,
                fecha
            ) VALUES (
                v_prod_id,
                'venta',
                v_cantidad,
                v_costo,
                'Venta en POS ' || v_folio,
                now()
            );

        ELSIF v_tipo = 'servicio' THEN
            v_prod_id := NULL;
            -- Si es UUID válido de servicio, asignarlo
            BEGIN
                v_serv_id := v_item.id::UUID;
            EXCEPTION WHEN OTHERS THEN
                v_serv_id := NULL;
            END;

            -- Los servicios no descuentan inventario
            v_costo := 0;
            v_item_ganancia := v_precio * v_cantidad;
        ELSE
            RAISE EXCEPTION 'Tipo de item desconocido: %', v_tipo;
        END IF;

        v_total := v_total + v_subtotal;
        v_ganancia_bruta := v_ganancia_bruta + v_item_ganancia;

        -- Insertar item en la venta (ahora la cabecera ya existe)
        INSERT INTO public.venta_items (
            venta_id,
            tipo,
            producto_id,
            servicio_id,
            nombre,
            cantidad,
            precio_unitario,
            costo_unitario,
            subtotal
        ) VALUES (
            v_venta_id,
            v_tipo,
            v_prod_id,
            v_serv_id,
            v_nombre,
            v_cantidad,
            v_precio,
            v_costo,
            v_subtotal
        );
    END LOOP;

    -- Actualizar los totales calculados en la venta
    UPDATE public.ventas
    SET total = v_total,
        ganancia_bruta = v_ganancia_bruta
    WHERE id = v_venta_id;

    RETURN jsonb_build_object(
        'success', true,
        'venta_id', v_venta_id,
        'folio', v_folio,
        'total', v_total,
        'ganancia_bruta', v_ganancia_bruta,
        'metodo_pago', p_metodo_pago,
        'fecha', now()
    );
END;
$$;

-- 6. Procedimiento Atómico: cancelar_venta
CREATE OR REPLACE FUNCTION public.cancelar_venta(p_venta_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_estado TEXT;
    v_folio TEXT;
    v_item RECORD;
BEGIN
    SELECT estado, folio INTO v_estado, v_folio
    FROM public.ventas
    WHERE id = p_venta_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Venta con ID % no encontrada', p_venta_id;
    END IF;

    IF v_estado = 'cancelada' THEN
        RAISE EXCEPTION 'La venta % ya fue cancelada anteriormente', v_folio;
    END IF;

    -- Regresar el stock de cada producto vendido
    FOR v_item IN
        SELECT producto_id, cantidad, costo_unitario, nombre
        FROM public.venta_items
        WHERE venta_id = p_venta_id AND tipo = 'producto' AND producto_id IS NOT NULL
    LOOP
        UPDATE public.productos
        SET stock = stock + v_item.cantidad,
            updated_at = now()
        WHERE id = v_item.producto_id;

        -- Registrar movimiento de reposición
        INSERT INTO public.movimientos_inventario (
            producto_id,
            tipo,
            cantidad,
            costo_unitario,
            proveedor,
            fecha
        ) VALUES (
            v_item.producto_id,
            'cancelacion_venta',
            v_item.cantidad,
            v_item.costo_unitario,
            'Cancelación de venta ' || v_folio,
            now()
        );
    END LOOP;

    -- Marcar la venta como cancelada
    UPDATE public.ventas
    SET estado = 'cancelada',
        updated_at = now()
    WHERE id = p_venta_id;

    RETURN jsonb_build_object(
        'success', true,
        'venta_id', p_venta_id,
        'folio', v_folio,
        'estado', 'cancelada'
    );
END;
$$;
