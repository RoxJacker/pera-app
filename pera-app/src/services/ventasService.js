import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockVentas } from '../constants/mockData';

// Contador local para folios en memoria
let localFolioCounter = 43;

// Almacén en memoria como respaldo
let localVentas = [
  ...mockVentas.map(v => ({
    id: v.id,
    folio: v.folio,
    total: v.total,
    ganancia_bruta: v.ganancia,
    metodo_pago: v.metodoPago,
    estado: 'completada',
    cliente_nombre: null,
    fecha: new Date().toISOString(),
    items: [
      {
        nombre: v.descripcion,
        cantidad: 1,
        precio_unitario: v.total,
        subtotal: v.total,
        tipo: 'producto',
      },
    ],
  })),
];

/**
 * Normaliza una venta obtenida de la base de datos
 */
function normalizarVenta(item) {
  return {
    id: item.id,
    folio: item.folio,
    total: parseFloat(item.total || 0),
    gananciaBruta: parseFloat(item.ganancia_bruta || 0),
    metodoPago: item.metodo_pago,
    estado: item.estado || 'completada',
    clienteNombre: item.cliente_nombre || null,
    fecha: item.fecha || item.created_at,
    items: (item.venta_items || item.items || []).map(it => ({
      id: it.id,
      nombre: it.nombre,
      tipo: it.tipo,
      cantidad: parseInt(it.cantidad, 10),
      precioUnitario: parseFloat(it.precio_unitario || it.precioUnitario || 0),
      subtotal: parseFloat(it.subtotal || 0),
      productoId: it.producto_id,
      servicioId: it.servicio_id,
    })),
  };
}

/**
 * Procesa una venta completa de forma atómica en Supabase
 * @param {Object} param0 
 *   items: Array<{ id, tipo: 'producto'|'servicio', nombre, cantidad, precioVenta }>
 *   metodoPago: 'Efectivo' | 'Tarjeta' | 'Transferencia'
 *   clienteNombre: string opcional
 */
export async function procesarVenta({ items, metodoPago = 'Efectivo', clienteNombre = null }) {
  if (!items || items.length === 0) {
    throw new Error('El carrito no contiene items');
  }

  // Estructura normalizada para el procedimiento almacenado
  const itemsPayload = items.map(it => ({
    tipo: it.tipo || 'producto',
    id: String(it.id),
    nombre: it.nombre,
    cantidad: parseInt(it.cantidad || 1, 10),
    precio_unitario: parseFloat(it.precioVenta ?? it.precio_venta ?? it.precio ?? 0),
  }));

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.rpc('procesar_venta', {
        p_items: itemsPayload,
        p_metodo_pago: metodoPago,
        p_cliente_nombre: clienteNombre ? clienteNombre.trim() : null,
      });

      if (error) {
        console.error('Error en procesar_venta RPC:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (err) {
      console.warn('Fallo ejecutando procesar_venta en Supabase:', err.message);
      throw err;
    }
  }

  // Fallback local en memoria
  const folioNum = localFolioCounter++;
  const folio = `#${String(folioNum).padStart(4, '0')}`;
  const total = itemsPayload.reduce((s, it) => s + it.precio_unitario * it.cantidad, 0);
  const ventaId = `v_${Date.now()}`;

  const nuevaVenta = {
    id: ventaId,
    folio,
    total,
    ganancia_bruta: total * 0.45, // estimación mock
    metodo_pago: metodoPago,
    estado: 'completada',
    cliente_nombre: clienteNombre,
    fecha: new Date().toISOString(),
    items: itemsPayload.map(it => ({
      nombre: it.nombre,
      tipo: it.tipo,
      cantidad: it.cantidad,
      precio_unitario: it.precio_unitario,
      subtotal: it.precio_unitario * it.cantidad,
      producto_id: it.tipo === 'producto' ? it.id : null,
      servicio_id: it.tipo === 'servicio' ? it.id : null,
    })),
  };

  localVentas.unshift(nuevaVenta);
  return {
    success: true,
    venta_id: ventaId,
    folio,
    total,
    ganancia_bruta: nuevaVenta.ganancia_bruta,
    metodo_pago: metodoPago,
  };
}

/**
 * Obtiene el historial de ventas con filtros de fecha y búsqueda
 * @param {Object} params
 *   filtroFecha: 'hoy' | 'semana' | 'mes' | 'todas'
 *   busqueda: string (folio, cliente o item)
 */
export async function obtenerHistorialVentas({ filtroFecha = 'todas', busqueda = '' } = {}) {
  let ventas = [];

  // Calcular fecha de inicio según el filtro seleccionado
  const ahora = new Date();
  let fechaInicio = null;

  if (filtroFecha === 'hoy') {
    const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0);
    fechaInicio = inicioHoy.toISOString();
  } else if (filtroFecha === 'semana') {
    const diaSem = ahora.getDay();
    const diff = ahora.getDate() - diaSem + (diaSem === 0 ? -6 : 1);
    const inicioSemana = new Date(ahora.getFullYear(), ahora.getMonth(), diff, 0, 0, 0);
    fechaInicio = inicioSemana.toISOString();
  } else if (filtroFecha === 'mes') {
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0);
    fechaInicio = inicioMes.toISOString();
  }

  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase
        .from('ventas')
        .select(`
          *,
          venta_items (*)
        `)
        .order('fecha', { ascending: false });

      if (fechaInicio) {
        query = query.gte('fecha', fechaInicio);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('Error consultando historial en Supabase:', error);
      } else if (data) {
        ventas = data.map(normalizarVenta);
      }
    } catch (e) {
      console.warn('Fallo consultando historial en Supabase:', e);
    }
  }

  // Fallback si Supabase no está configurado o lista vacía sin Supabase
  if (ventas.length === 0 && (!isSupabaseConfigured || !supabase)) {
    ventas = localVentas.map(normalizarVenta);
    if (fechaInicio) {
      const inicioTs = new Date(fechaInicio).getTime();
      ventas = ventas.filter(v => new Date(v.fecha).getTime() >= inicioTs);
    }
  }

  // Filtrar por término de búsqueda (folio, cliente o producto/servicio)
  const q = busqueda ? busqueda.trim().toLowerCase() : '';
  if (q) {
    ventas = ventas.filter(v => {
      const folioMatch = (v.folio || '').toLowerCase().includes(q);
      const clienteMatch = (v.clienteNombre || '').toLowerCase().includes(q);
      const itemsMatch = (v.items || []).some(it => (it.nombre || '').toLowerCase().includes(q));
      return folioMatch || clienteMatch || itemsMatch;
    });
  }

  // Calcular métricas resumidas
  const totalVentas = ventas.length;
  const ventasCompletadas = ventas.filter(v => v.estado !== 'cancelada');
  const montoTotal = ventasCompletadas.reduce((sum, v) => sum + (v.total || 0), 0);
  const gananciaTotal = ventasCompletadas.reduce((sum, v) => sum + (v.gananciaBruta || 0), 0);

  return {
    ventas,
    metricas: {
      totalVentas,
      ventasCompletadasCount: ventasCompletadas.length,
      montoTotal,
      gananciaTotal,
    },
  };
}

/**
 * Obtiene el detalle de una venta por su ID junto con sus items
 */
export async function obtenerVentaPorId(id) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('ventas')
        .select(`
          *,
          venta_items (*)
        `)
        .eq('id', id)
        .single();

      if (!error && data) {
        return normalizarVenta(data);
      }
    } catch (e) {
      console.warn('Error obteniendo venta en Supabase:', e);
    }
  }

  const local = localVentas.find(v => String(v.id) === String(id));
  return local ? normalizarVenta(local) : null;
}

/**
 * Cancela una venta reciente revirtiendo el stock de productos
 */
export async function cancelarVenta(ventaId) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.rpc('cancelar_venta', {
        p_venta_id: ventaId,
      });

      if (error) {
        console.error('Error cancelando venta en Supabase:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (err) {
      console.warn('Fallo ejecutando cancelar_venta en Supabase:', err.message);
      throw err;
    }
  }

  // Fallback local
  const idx = localVentas.findIndex(v => String(v.id) === String(ventaId));
  if (idx !== -1) {
    localVentas[idx].estado = 'cancelada';
    return { success: true, venta_id: ventaId, estado: 'cancelada' };
  }

  throw new Error('Venta no encontrada');
}

/**
 * Genera el texto formateado del ticket para enviar por WhatsApp
 */
export function generarTextoTicketWhatsApp(venta) {
  const fechaStr = new Date(venta.fecha).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  let texto = `*Belleza Pera*\n`;
  texto += `Ticket: ${venta.folio}\n`;
  texto += `Fecha: ${fechaStr}\n`;
  if (venta.clienteNombre) {
    texto += `Cliente: ${venta.clienteNombre}\n`;
  }
  texto += `--------------------------------\n`;

  (venta.items || []).forEach(it => {
    texto += `${it.cantidad}x ${it.nombre} — $${it.subtotal.toFixed(2)}\n`;
  });

  texto += `--------------------------------\n`;
  texto += `*TOTAL: $${venta.total.toFixed(2)}*\n`;
  texto += `Método de pago: ${venta.metodoPago}\n\n`;
  texto += `¡Muchas gracias por tu preferencia!`;

  return texto;
}
