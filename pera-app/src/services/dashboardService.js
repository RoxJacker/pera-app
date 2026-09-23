import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockMetricasHoy, mockBarras, mockProductos } from '../constants/mockData';

/**
 * Retorna las fechas clave para calcular rangos de hoy, ayer y la semana
 */
function obtenerRangosFecha() {
  const ahora = new Date();
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0);
  const finHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59);

  // Ayer
  const inicioAyer = new Date(inicioHoy);
  inicioAyer.setDate(inicioAyer.getDate() - 1);
  const finAyer = new Date(finHoy);
  finAyer.setDate(finAyer.getDate() - 1);

  // Lunes de esta semana
  const diaSem = ahora.getDay();
  const diffLunes = ahora.getDate() - diaSem + (diaSem === 0 ? -6 : 1);
  const inicioSemana = new Date(ahora.getFullYear(), ahora.getMonth(), diffLunes, 0, 0, 0);

  // Lunes de la semana anterior
  const inicioSemanaAnterior = new Date(inicioSemana);
  inicioSemanaAnterior.setDate(inicioSemanaAnterior.getDate() - 7);

  return {
    inicioHoy,
    finHoy,
    inicioAyer,
    finAyer,
    inicioSemana,
    inicioSemanaAnterior,
  };
}

/**
 * Obtiene las métricas consolidadas en vivo para la pantalla de Inicio
 */
export async function obtenerMetricasDashboard() {
  const rangos = obtenerRangosFecha();

  if (isSupabaseConfigured && supabase) {
    try {
      // Consultar ventas completadas desde la semana pasada hasta hoy
      const { data: ventas, error } = await supabase
        .from('ventas')
        .select(`
          *,
          venta_items (*)
        `)
        .neq('estado', 'cancelada')
        .gte('fecha', rangos.inicioSemanaAnterior.toISOString())
        .order('fecha', { ascending: true });

      if (!error && ventas) {
        let gananciaHoy = 0;
        let gananciaAyer = 0;
        let gananciaSemana = 0;
        let gananciaSemanaAnterior = 0;
        let ventasHoyCount = 0;
        let ventasProductosCount = 0;
        let ventasServiciosCount = 0;

        // Distribución por día de la semana [L, M, M, J, V, S, D]
        const barrasSemana = [0, 0, 0, 0, 0, 0, 0];

        ventas.forEach((v) => {
          const f = new Date(v.fecha);
          const ganancia = parseFloat(v.ganancia_bruta || 0);
          const total = parseFloat(v.total || 0);

          // Hoy
          if (f >= rangos.inicioHoy && f <= rangos.finHoy) {
            gananciaHoy += ganancia;
            ventasHoyCount += 1;

            (v.venta_items || []).forEach((it) => {
              const qty = parseInt(it.cantidad || 1, 10);
              if (it.tipo === 'producto') {
                ventasProductosCount += qty;
              } else if (it.tipo === 'servicio') {
                ventasServiciosCount += qty;
              }
            });
          }

          // Ayer
          if (f >= rangos.inicioAyer && f <= rangos.finAyer) {
            gananciaAyer += ganancia;
          }

          // Esta semana (desde el lunes actual)
          if (f >= rangos.inicioSemana) {
            gananciaSemana += ganancia;

            // Indice del día: Lunes=0, Martes=1, ..., Domingo=6
            const dia = f.getDay();
            const idx = dia === 0 ? 6 : dia - 1;
            barrasSemana[idx] += total;
          } else if (f >= rangos.inicioSemanaAnterior && f < rangos.inicioSemana) {
            // Semana anterior
            gananciaSemanaAnterior += ganancia;
          }
        });

        // Calcular deltas porcentuales
        let gananciaHoyDelta = 0;
        if (gananciaAyer > 0) {
          gananciaHoyDelta = Math.round(((gananciaHoy - gananciaAyer) / gananciaAyer) * 100);
        } else if (gananciaHoy > 0) {
          gananciaHoyDelta = 100;
        }

        let gananciaSemanaDelta = 0;
        if (gananciaSemanaAnterior > 0) {
          gananciaSemanaDelta = Math.round(
            ((gananciaSemana - gananciaSemanaAnterior) / gananciaSemanaAnterior) * 100
          );
        } else if (gananciaSemana > 0) {
          gananciaSemanaDelta = 100;
        }

        return {
          gananciaHoy,
          gananciaHoyDelta,
          gananciaSemana,
          gananciaSemanaDelta,
          ventasHoy: ventasHoyCount,
          ventasProductos: ventasProductosCount,
          ventasServicios: ventasServiciosCount,
          barras: barrasSemana,
        };
      }
    } catch (e) {
      console.warn('Error calculando métricas del dashboard en Supabase:', e);
    }
  }

  // Fallback con datos mock estructurados
  return {
    gananciaHoy: mockMetricasHoy.gananciaHoy,
    gananciaHoyDelta: mockMetricasHoy.gananciaHoyDelta,
    gananciaSemana: mockMetricasHoy.gananciaSemana,
    gananciaSemanaDelta: mockMetricasHoy.gananciasemanaDelta,
    ventasHoy: mockMetricasHoy.ventasHoy,
    ventasProductos: mockMetricasHoy.ventasProductos,
    ventasServicios: mockMetricasHoy.ventasServicios,
    barras: mockBarras,
  };
}

/**
 * Obtiene los productos con stock menor o igual a su stock mínimo
 */
export async function obtenerProductosStockBajo() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .order('stock', { ascending: true });

      if (!error && data) {
        return data
          .filter((p) => {
            const stock = parseInt(p.stock || 0, 10);
            const stockMin = parseInt(p.stock_minimo ?? p.stockMinimo ?? 5, 10);
            return stock <= stockMin;
          })
          .map((p) => ({
            id: p.id,
            nombre: p.nombre,
            stock: parseInt(p.stock || 0, 10),
            stockMinimo: parseInt(p.stock_minimo ?? p.stockMinimo ?? 5, 10),
            categoria: p.categoria,
          }));
      }
    } catch (e) {
      console.warn('Error consultando stock bajo en Supabase:', e);
    }
  }

  // Fallback con productos mock
  return mockProductos
    .filter((p) => p.stock <= p.stockMinimo)
    .map((p) => ({
      id: p.id,
      nombre: p.nombre,
      stock: p.stock,
      stockMinimo: p.stockMinimo,
      categoria: p.categoria,
    }));
}
