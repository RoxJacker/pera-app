-- ==============================================================
-- Belleza Pera — Sprint 3 (Mejora): Ventas Históricas y Venta Única
-- ==============================================================
-- Este script permite:
-- 1. Registrar ventas de días, semanas o meses pasados (recuperar histórico).
-- 2. Soportar items de tipo 'unico' (artículos libres sin inventario previo).
-- ==============================================================

-- 1. Actualizar el CHECK constraint de tipo en venta_items
ALTER TABLE public.venta_items DROP CONSTRAINT IF EXISTS venta_items_tipo_check;
ALTER TABLE public.venta_items 
    ADD CONSTRAINT venta_items_tipo_check 
    CHECK (tipo IN ('producto', 'servicio', 'unico'));

-- 2. Eliminar la versión previa de procesar_venta para evitar conflictos de signatura
DROP FUNCTION IF EXISTS public.procesar_venta(JSONB, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.procesar_venta(JSONB, TEXT, TEXT, TIMESTAMPTZ);

-- 3. Nueva versión de procesar_venta con soporte de fecha histórica y tipo 'unico'
CREATE OR REPLACE FUNCTION public.procesar_venta(
    p_items JSONB,
    p_metodo_pago TEXT,
    p_cliente_nombre TEXT DEFAULT NULL,
    p_fecha TIMESTAMPTZ DEFAULT NULL
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
    v_fecha_venta TIMESTAMPTZ := COALESCE(p_fecha, now());
BEGIN
    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'El carrito de venta no puede estar vacío';
    END IF;

    -- Generar folio consecutivo
    v_folio := '#' || LPAD(nextval('public.secuencia_folio_ventas')::TEXT, 4, '0');

    -- Registrar la cabecera de la venta con la fecha indicada (o now())
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
        v_fecha_venta
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
            BEGIN
                v_prod_id := v_item.id::UUID;
            EXCEPTION WHEN OTHERS THEN
                v_prod_id := NULL;
            END;
            v_serv_id := NULL;

            IF v_prod_id IS NOT NULL THEN
                -- Bloquear fila del producto para evitar carreras
                SELECT stock, costo, nombre INTO v_prod_stock, v_prod_costo, v_prod_nombre
                FROM public.productos
                WHERE id = v_prod_id
                FOR UPDATE;

                IF FOUND THEN
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

                    v_costo := COALESCE(v_prod_costo, 0);
                    v_item_ganancia := (v_precio - v_costo) * v_cantidad;

                    -- Registrar movimiento de salida por venta en la fecha correspondiente
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
                        'Venta ' || v_folio,
                        v_fecha_venta
                    );
                ELSE
                    -- Si el producto fue eliminado o no existe por ID
                    v_costo := 0;
                    v_item_ganancia := v_precio * v_cantidad;
                END IF;
            ELSE
                v_costo := 0;
                v_item_ganancia := v_precio * v_cantidad;
            END IF;

        ELSIF v_tipo = 'servicio' THEN
            v_prod_id := NULL;
            BEGIN
                v_serv_id := v_item.id::UUID;
            EXCEPTION WHEN OTHERS THEN
                v_serv_id := NULL;
            END;

            v_costo := 0;
            v_item_ganancia := v_precio * v_cantidad;

        ELSIF v_tipo = 'unico' THEN
            -- Venta única de ocasión: no descuenta stock de producto
            v_prod_id := NULL;
            v_serv_id := NULL;
            v_costo := 0;
            v_item_ganancia := v_precio * v_cantidad;

        ELSE
            RAISE EXCEPTION 'Tipo de item desconocido: %', v_tipo;
        END IF;

        v_total := v_total + v_subtotal;
        v_ganancia_bruta := v_ganancia_bruta + v_item_ganancia;

        -- Insertar item en la venta
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
        'fecha', v_fecha_venta
    );
END;
$$;

