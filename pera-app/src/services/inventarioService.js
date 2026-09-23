import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { obtenerProductoPorId, actualizarProducto } from './productosService';

// Bitácora local en memoria para modo sin conexión
let localMovimientos = [];

/**
 * Registra una entrada de inventario (compra de mercadería).
 * Actualiza el stock del producto e inserta el movimiento.
 * Actualiza el costo de referencia del producto con el nuevo costo unitario.
 */
export async function registrarEntrada({ productoId, cantidad, costoUnitario, proveedor = '' }) {
  const cantNum = parseInt(cantidad, 10);
  const costoNum = parseFloat(costoUnitario) || 0;

  if (!productoId) {
    throw new Error('Debes seleccionar un producto.');
  }
  if (isNaN(cantNum) || cantNum <= 0) {
    throw new Error('La cantidad debe ser mayor a 0.');
  }

  // 1. Intentar registrar en Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      // Intentar primero con la función RPC transaccional
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'registrar_entrada_inventario',
        {
          p_producto_id: productoId,
          p_cantidad: cantNum,
          p_costo_unitario: costoNum,
          p_proveedor: proveedor?.trim() || null,
        }
      );

      if (!rpcError && rpcData?.success) {
        return rpcData;
      }

      console.warn('RPC no disponible o falló, usando fallback directo a tablas:', rpcError?.message);

      // Fallback directo con consultas a tablas Supabase
      const { data: prodData, error: prodErr } = await supabase
        .from('productos')
        .select('stock, costo')
        .eq('id', productoId)
        .single();

      if (prodErr || !prodData) {
        throw new Error('Producto no encontrado en Supabase.');
      }

      const stockAnterior = parseInt(prodData.stock || 0, 10);
      const stockNuevo = stockAnterior + cantNum;

      // Insertar movimiento
      await supabase.from('movimientos_inventario').insert([
        {
          producto_id: productoId,
          tipo: 'compra',
          cantidad: cantNum,
          costo_unitario: costoNum,
          proveedor: proveedor?.trim() || null,
        },
      ]);

      // Actualizar producto con nuevo stock y nuevo costo de compra
      await supabase
        .from('productos')
        .update({
          stock: stockNuevo,
          costo: costoNum,
        })
        .eq('id', productoId);

      return {
        success: true,
        producto_id: productoId,
        cantidad_ingresada: cantNum,
        stock_anterior: stockAnterior,
        stock_nuevo: stockNuevo,
        costo_nuevo: costoNum,
      };
    } catch (e) {
      console.warn('Excepción registrando entrada en Supabase, aplicando respaldo local:', e);
    }
  }

  // 2. Respaldo local en memoria
  const prodLocal = await obtenerProductoPorId(productoId);
  const stockAnterior = parseInt(prodLocal?.stock || 0, 10);
  const stockNuevo = stockAnterior + cantNum;

  if (prodLocal) {
    await actualizarProducto(productoId, {
      ...prodLocal,
      stock: stockNuevo,
      costo: costoNum,
    });
  }

  const movLocal = {
    id: `mov_${Date.now()}`,
    producto_id: productoId,
    tipo: 'compra',
    cantidad: cantNum,
    costo_unitario: costoNum,
    proveedor: proveedor?.trim() || null,
    fecha: new Date().toISOString(),
  };

  localMovimientos.unshift(movLocal);

  return {
    success: true,
    producto_id: productoId,
    cantidad_ingresada: cantNum,
    stock_anterior: stockAnterior,
    stock_nuevo: stockNuevo,
    costo_nuevo: costoNum,
  };
}

/**
 * Obtiene el historial de movimientos de inventario
 */
export async function obtenerMovimientos(productoId = null) {
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase
        .from('movimientos_inventario')
        .select('*, productos(nombre, marca, foto_url)')
        .order('fecha', { ascending: false });

      if (productoId) {
        query = query.eq('producto_id', productoId);
      }

      const { data, error } = await query;
      if (!error && data) {
        return data;
      }
    } catch (e) {
      console.warn('Error obteniendo movimientos en Supabase:', e);
    }
  }

  if (productoId) {
    return localMovimientos.filter(m => m.producto_id === productoId);
  }
  return [...localMovimientos];
}
