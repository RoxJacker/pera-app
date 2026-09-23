-- ==============================================================
-- Belleza Pera — Esquema Inicial de Base de Datos (Sprint 1)
-- ==============================================================

-- 1. Tabla de Productos
CREATE TABLE IF NOT EXISTS public.productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    marca TEXT,
    categoria TEXT,
    costo NUMERIC(10, 2) NOT NULL DEFAULT 0,
    precio_venta NUMERIC(10, 2) NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    stock_minimo INTEGER NOT NULL DEFAULT 3,
    foto_url TEXT,
    pedestal_color TEXT DEFAULT '#F7F1E8',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_productos_updated_at ON public.productos;
CREATE TRIGGER update_productos_updated_at
    BEFORE UPDATE ON public.productos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 3. Tabla de Configuración y Seguridad (PIN de la dueña)
CREATE TABLE IF NOT EXISTS public.configuracion (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar PIN inicial por defecto: '1234'
INSERT INTO public.configuracion (clave, valor)
VALUES ('pin_seguridad', '1234')
ON CONFLICT (clave) DO NOTHING;

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura/escritura anónima para desarrollo (o ajustables según sesión)
CREATE POLICY "Permitir todo acceso anónimo a productos"
ON public.productos
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Permitir lectura del pin configurado"
ON public.configuracion
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Permitir actualizar pin configurado"
ON public.configuracion
FOR UPDATE
TO anon, authenticated
USING (true);

-- 5. Bucket de Almacenamiento para Fotos
INSERT INTO storage.buckets (id, name, public)
VALUES ('productos-fotos', 'productos-fotos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Fotos públicas visibles por todos"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'productos-fotos');

CREATE POLICY "Subida de fotos permitida"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'productos-fotos');

CREATE POLICY "Actualización y borrado de fotos permitida"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'productos-fotos');

CREATE POLICY "Borrado de fotos permitida"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'productos-fotos');

-- 6. Datos de prueba iniciales (opcionales)
INSERT INTO public.productos (nombre, marca, categoria, costo, precio_venta, stock, stock_minimo, pedestal_color)
VALUES 
('Tinte Igora Royal 5.4', 'Schwarzkopf', 'Coloración', 95.00, 185.00, 12, 4, '#F5E3C4'),
('Polvo Decolorante 500g', 'BlondMe', 'Decoloración', 280.00, 420.00, 2, 3, '#F3DFD5'),
('Shampoo Reparador 1L', 'Olaplex Nº4', 'Cuidado', 350.00, 560.00, 8, 2, '#E7EBDC'),
('Crema Suavizante 250ml', 'L’Oréal Professionnel', 'Cuidado', 120.00, 210.00, 5, 2, '#E4D9CB'),
('Gel Moldeador Extra Fuerte', 'Tec Italy', 'Estilizado', 85.00, 150.00, 0, 3, '#F7F1E8')
ON CONFLICT DO NOTHING;

-- 7. Movimientos de Inventario (Sprint 2)
CREATE TABLE IF NOT EXISTS public.movimientos_inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL DEFAULT 'compra',
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    costo_unitario NUMERIC(10, 2) NOT NULL DEFAULT 0,
    proveedor TEXT,
    fecha TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.movimientos_inventario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir todo acceso anónimo a movimientos"
ON public.movimientos_inventario
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Función transaccional atómica para registrar compra/entrada
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
BEGIN
    IF p_cantidad <= 0 THEN
        RAISE EXCEPTION 'La cantidad debe ser mayor a 0';
    END IF;

    SELECT stock, costo INTO v_stock_anterior, v_costo_anterior
    FROM public.productos
    WHERE id = p_producto_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Producto con ID % no encontrado', p_producto_id;
    END IF;

    v_stock_nuevo := v_stock_anterior + p_cantidad;

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

    UPDATE public.productos
    SET stock = v_stock_nuevo,
        costo = p_costo_unitario,
        updated_at = now()
    WHERE id = p_producto_id;

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

-- ==============================================================
-- 8. Servicios del Salón (Sprint 3)
-- ==============================================================
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

DROP TRIGGER IF EXISTS update_servicios_updated_at ON public.servicios;
CREATE TRIGGER update_servicios_updated_at
    BEFORE UPDATE ON public.servicios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo acceso a servicios" ON public.servicios;
CREATE POLICY "Permitir todo acceso a servicios"
ON public.servicios
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

INSERT INTO public.servicios (nombre, precio, duracion_min, pedestal_color)
VALUES
    ('Corte + peinado', 250.00, 60, '#EBD9CC'),
    ('Manicura completa', 180.00, 45, '#E4D9CB'),
    ('Coloración completa', 420.00, 90, '#D9C2AC'),
    ('Tratamiento capilar', 320.00, 60, '#F3DFD5')
ON CONFLICT DO NOTHING;

-- ==============================================================
-- 9. Agenda de Citas (Sprint 4)
-- ==============================================================
CREATE TABLE IF NOT EXISTS public.citas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    servicio_id UUID REFERENCES public.servicios(id) ON DELETE SET NULL,
    cliente_nombre TEXT NOT NULL,
    cliente_telefono TEXT,
    fecha DATE NOT NULL,
    hora TEXT NOT NULL,
    duracion_min INTEGER NOT NULL DEFAULT 45,
    precio NUMERIC(10, 2) DEFAULT 0,
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmada', 'completada', 'cancelada')),
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

DROP TRIGGER IF EXISTS update_citas_updated_at ON public.citas;
CREATE TRIGGER update_citas_updated_at
    BEFORE UPDATE ON public.citas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.citas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo acceso a citas" ON public.citas;
CREATE POLICY "Permitir todo acceso a citas"
ON public.citas
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- ==============================================================
-- 10. Flujo de Ventas Transaccional (Sprint 5)
-- ==============================================================
CREATE SEQUENCE IF NOT EXISTS public.secuencia_folio_ventas START WITH 43;

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

DROP TRIGGER IF EXISTS update_ventas_updated_at ON public.ventas;
CREATE TRIGGER update_ventas_updated_at
    BEFORE UPDATE ON public.ventas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

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

    v_folio := '#' || LPAD(nextval('public.secuencia_folio_ventas')::TEXT, 4, '0');

    -- Insertar cabecera de la venta primero para satisfacer la FK en venta_items
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

            SELECT stock, costo, nombre INTO v_prod_stock, v_prod_costo, v_prod_nombre
            FROM public.productos
            WHERE id = v_prod_id
            FOR UPDATE;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Producto "%" no encontrado en el catálogo', v_nombre;
            END IF;

            IF v_prod_stock < v_cantidad THEN
                RAISE EXCEPTION 'Stock insuficiente para "%": disponibles %, solicitados %',
                    v_prod_nombre, v_prod_stock, v_cantidad;
            END IF;

            UPDATE public.productos
            SET stock = stock - v_cantidad,
                updated_at = now()
            WHERE id = v_prod_id;

            v_costo := v_prod_costo;
            v_item_ganancia := (v_precio - v_costo) * v_cantidad;

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
            BEGIN
                v_serv_id := v_item.id::UUID;
            EXCEPTION WHEN OTHERS THEN
                v_serv_id := NULL;
            END;

            v_costo := 0;
            v_item_ganancia := v_precio * v_cantidad;
        ELSE
            RAISE EXCEPTION 'Tipo de item desconocido: %', v_tipo;
        END IF;

        v_total := v_total + v_subtotal;
        v_ganancia_bruta := v_ganancia_bruta + v_item_ganancia;

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

    -- Actualizar totales en la venta
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

    FOR v_item IN
        SELECT producto_id, cantidad, costo_unitario, nombre
        FROM public.venta_items
        WHERE venta_id = p_venta_id AND tipo = 'producto' AND producto_id IS NOT NULL
    LOOP
        UPDATE public.productos
        SET stock = stock + v_item.cantidad,
            updated_at = now()
        WHERE id = v_item.producto_id;

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

-- Sprint 6: Índices para optimizar el Historial de Ventas
CREATE INDEX IF NOT EXISTS idx_ventas_fecha_desc ON public.ventas (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_ventas_folio ON public.ventas (folio);
CREATE INDEX IF NOT EXISTS idx_ventas_estado ON public.ventas (estado);
CREATE INDEX IF NOT EXISTS idx_ventas_cliente ON public.ventas (cliente_nombre);
CREATE INDEX IF NOT EXISTS idx_venta_items_venta_id ON public.venta_items (venta_id);
CREATE INDEX IF NOT EXISTS idx_venta_items_producto_id ON public.venta_items (producto_id);
CREATE INDEX IF NOT EXISTS idx_venta_items_servicio_id ON public.venta_items (servicio_id);

-- ==============================================================
-- Sprint 7: Gastos Fijos Mensuales
-- ==============================================================
CREATE TABLE IF NOT EXISTS public.gastos_fijos_mensuales (
    mes TEXT PRIMARY KEY,
    monto NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

DROP TRIGGER IF EXISTS update_gastos_fijos_updated_at ON public.gastos_fijos_mensuales;
CREATE TRIGGER update_gastos_fijos_updated_at
    BEFORE UPDATE ON public.gastos_fijos_mensuales
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.gastos_fijos_mensuales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo acceso a gastos_fijos_mensuales" ON public.gastos_fijos_mensuales;
CREATE POLICY "Permitir todo acceso a gastos_fijos_mensuales"
ON public.gastos_fijos_mensuales
FOR ALL
USING (true)
WITH CHECK (true);



