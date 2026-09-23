import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockGanancias } from '../constants/mockData';

// Almacén local en memoria para gastos fijos
const localGastosFijos = {
  [obtenerMesClave()]: mockGanancias.gastosFijos || 850,
};

/**
 * Retorna la clave del mes en formato 'YYYY-MM'
 */
export function obtenerMesClave(fecha = new Date()) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Retorna el nombre del mes en español (ej. 'Septiembre 2026')
 */
export function obtenerNombreMes(mesClave = obtenerMesClave()) {
  const [year, month] = mesClave.split('-').map(Number);
  const fecha = new Date(year, month - 1, 1);
  const mesNombre = fecha.toLocaleDateString('es-MX', { month: 'long' });
  return `${mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1)} ${year}`;
}

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
  let gastosFijos = localGastosFijos[mesClave] ?? 850;

  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Consultar ventas e items del mes
      const { data: ventas, error: ventasError } = await supabase
        .from('ventas')
        .select(`
          *,
          venta_items (*)
        `)
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

            if (it.tipo === 'producto') {
              porProductos += (precio - costo) * qty;
            } else if (it.tipo === 'servicio') {
              porServicios += precio * qty;
            }
          });
        });
      }

      // 2. Consultar gastos fijos mensuales
      const { data: gastoData, error: gastoError } = await supabase
        .from('gastos_fijos_mensuales')
        .select('*')
        .eq('mes', mesClave)
        .maybeSingle();

      if (!gastoError && gastoData) {
        gastosFijos = parseFloat(gastoData.monto || 0);
      }
    } catch (e) {
      console.warn('Error obteniendo resumen de ganancias en Supabase:', e);
    }
  }

  // Fallback si no hay Supabase
  if (!isSupabaseConfigured || !supabase) {
    gananciaBruta = mockGanancias.bruta;
    porProductos = mockGanancias.porProductos;
    porServicios = mockGanancias.porServicios;
    gastosFijos = localGastosFijos[mesClave] ?? mockGanancias.gastosFijos;
  }

  const gananciaNeta = gananciaBruta - gastosFijos;

  return {
    mesClave,
    mesNombre: obtenerNombreMes(mesClave),
    gananciaBruta,
    gastosFijos,
    gananciaNeta,
    porProductos,
    porServicios,
  };
}

/**
 * Guarda o actualiza los gastos fijos para el mes indicado
 * @param {string} mesClave - Formato 'YYYY-MM'
 * @param {number|string} monto - Monto de gastos fijos
 */
export async function guardarGastosFijosMes(mesClave = obtenerMesClave(), monto) {
  const montoNum = parseFloat(monto || 0);
  localGastosFijos[mesClave] = montoNum;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('gastos_fijos_mensuales')
        .upsert(
          {
            mes: mesClave,
            monto: montoNum,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'mes' }
        )
        .select()
        .single();

      if (error) {
        console.error('Error guardando gastos fijos en Supabase:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (e) {
      console.warn('Fallo guardando gastos fijos en Supabase:', e);
      throw e;
    }
  }

  return { mes: mesClave, monto: montoNum };
}
