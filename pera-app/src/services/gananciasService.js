import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockGanancias } from '../constants/mockData';

// ─── Gastos fijos en memoria (fallback sin Supabase) ─────────────────────────
const localGastosItems = {};

/**
 * Retorna la clave del mes en formato 'YYYY-MM'
 */
export function obtenerMesClave(fecha = new Date()) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Retorna el nombre del mes en español (ej. 'Octubre 2026')
 */
export function obtenerNombreMes(mesClave = obtenerMesClave()) {
  const [year, month] = mesClave.split('-').map(Number);
  const fecha = new Date(year, month - 1, 1);
  const mesNombre = fecha.toLocaleDateString('es-MX', { month: 'long' });
  return `${mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1)} ${year}`;
}

// ─── CRUD de ítems de gastos fijos ───────────────────────────────────────────

/**
 * Obtiene todos los ítems de gastos fijos para el mes indicado
 * @param {string} mesClave - Formato 'YYYY-MM'
 * @returns {Promise<Array<{id,concepto,monto}>>}
 */
export async function obtenerGastosItems(mesClave = obtenerMesClave()) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('gastos_fijos_items')
        .select('*')
        .eq('mes', mesClave)
        .order('created_at', { ascending: true });

      if (!error && data) return data;
    } catch (e) {
      console.warn('Error obteniendo ítems de gastos fijos:', e);
    }
  }

  // Fallback local
  return localGastosItems[mesClave] ?? getDefaultItems(mesClave);
}

/**
 * Agrega un nuevo ítem de gasto fijo
 * @param {string} mesClave
 * @param {string} concepto
 * @param {number} monto
 */
export async function agregarGastoItem(mesClave, concepto, monto) {
  const montoNum = parseFloat(monto || 0);
  const newItem = {
    id: `local-${Date.now()}`,
    mes: mesClave,
    concepto: concepto.trim(),
    monto: montoNum,
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('gastos_fijos_items')
        .insert({ mes: mesClave, concepto: concepto.trim(), monto: montoNum })
        .select()
        .single();
      if (!error && data) return data;
      if (error) throw new Error(error.message);
    } catch (e) {
      console.warn('Error agregando ítem de gasto:', e);
      throw e;
    }
  }

  // Fallback local
  if (!localGastosItems[mesClave]) localGastosItems[mesClave] = [];
  localGastosItems[mesClave].push(newItem);
  return newItem;
}

/**
 * Actualiza concepto y/o monto de un ítem existente
 * @param {string} id - UUID del ítem
 * @param {string} concepto
 * @param {number} monto
 */
export async function actualizarGastoItem(id, concepto, monto) {
  const montoNum = parseFloat(monto || 0);

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('gastos_fijos_items')
        .update({ concepto: concepto.trim(), monto: montoNum, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data;
      if (error) throw new Error(error.message);
    } catch (e) {
      console.warn('Error actualizando ítem de gasto:', e);
      throw e;
    }
  }

  // Fallback local
  for (const mes of Object.keys(localGastosItems)) {
    const idx = localGastosItems[mes].findIndex((i) => i.id === id);
    if (idx !== -1) {
      localGastosItems[mes][idx] = { ...localGastosItems[mes][idx], concepto, monto: montoNum };
      return localGastosItems[mes][idx];
    }
  }
}

/**
 * Elimina un ítem de gasto fijo por ID
 * @param {string} id - UUID del ítem
 */
export async function eliminarGastoItem(id) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('gastos_fijos_items')
        .delete()
        .eq('id', id);
      if (error) throw new Error(error.message);
      return true;
    } catch (e) {
      console.warn('Error eliminando ítem de gasto:', e);
      throw e;
    }
  }

  // Fallback local
  for (const mes of Object.keys(localGastosItems)) {
    const idx = localGastosItems[mes].findIndex((i) => i.id === id);
    if (idx !== -1) {
      localGastosItems[mes].splice(idx, 1);
      return true;
    }
  }
}

// ─── Resumen mensual de ganancias ────────────────────────────────────────────

/**
 * Obtiene el resumen de ganancias del mes especificado
 * @param {string} mesClave - Formato 'YYYY-MM'
 */
export async function obtenerResumenGananciasMes(mesClave = obtenerMesClave()) {
  const [year, month] = mesClave.split('-').map(Number);
  const inicioMes = new Date(year, month - 1, 1, 0, 0, 0);
  const finMes = new Date(year, month, 0, 23, 59, 59);

  let gananciaBruta = 0;
  let porProductos = 0;
  let porServicios = 0;
  let gastosItems = [];

  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Ventas del mes
      const { data: ventas, error: ventasError } = await supabase
        .from('ventas')
        .select(`*, venta_items (*)`)
        .neq('estado', 'cancelada')
        .gte('fecha', inicioMes.toISOString())
        .lte('fecha', finMes.toISOString());

      if (!ventasError && ventas) {
        ventas.forEach((v) => {
          gananciaBruta += parseFloat(v.ganancia_bruta || 0);
          (v.venta_items || []).forEach((it) => {
            const qty = parseInt(it.cantidad || 1, 10);
            const precio = parseFloat(it.precio_unitario || 0);
            const costo = parseFloat(it.costo_unitario || 0);
            if (it.tipo === 'producto') porProductos += (precio - costo) * qty;
            else if (it.tipo === 'servicio') porServicios += precio * qty;
          });
        });
      }

      // 2. Ítems de gastos fijos
      gastosItems = await obtenerGastosItems(mesClave);
    } catch (e) {
      console.warn('Error obteniendo resumen de ganancias en Supabase:', e);
    }
  } else {
    // Fallback mock
    gananciaBruta = mockGanancias.bruta;
    porProductos = mockGanancias.porProductos;
    porServicios = mockGanancias.porServicios;
    gastosItems = getDefaultItems(mesClave);
  }

  const gastosFijos = gastosItems.reduce((sum, i) => sum + parseFloat(i.monto || 0), 0);
  const gananciaNeta = gananciaBruta - gastosFijos;

  return {
    mesClave,
    mesNombre: obtenerNombreMes(mesClave),
    gananciaBruta,
    gastosFijos,
    gastosItems,
    gananciaNeta,
    porProductos,
    porServicios,
  };
}

// ─── Helpers internos ────────────────────────────────────────────────────────

function getDefaultItems(mesClave) {
  return [
    { id: 'mock-1', mes: mesClave, concepto: 'Renta del local', monto: 3500 },
    { id: 'mock-2', mes: mesClave, concepto: 'Electricidad', monto: 320 },
    { id: 'mock-3', mes: mesClave, concepto: 'Agua', monto: 80 },
    { id: 'mock-4', mes: mesClave, concepto: 'Internet', monto: 299 },
    { id: 'mock-5', mes: mesClave, concepto: 'Insumos generales', monto: 651 },
  ];
}
