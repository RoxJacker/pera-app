import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Utilidades para fechas en formato ISO YYYY-MM-DD
export function getFechaLocalISO(d = new Date()) {
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

const hoyDate = new Date();
const mananaDate = new Date();
mananaDate.setDate(hoyDate.getDate() + 1);

const en3Dias = new Date();
en3Dias.setDate(hoyDate.getDate() + 3);

const en5Dias = new Date();
en5Dias.setDate(hoyDate.getDate() + 5);

export const HOY_ISO = getFechaLocalISO(hoyDate);
export const MANANA_ISO = getFechaLocalISO(mananaDate);

// Datos iniciales en memoria como fallback
let localCitas = [
  {
    id: 'c1',
    cliente_nombre: 'María López',
    cliente_telefono: '333-111-0000',
    servicio_id: 's1',
    servicio_nombre: 'Corte + peinado',
    fecha: HOY_ISO,
    hora: '10:00 am',
    duracion_min: 60,
    precio: 250,
    estado: 'confirmada',
    notas: 'Cliente frecuente',
  },
  {
    id: 'c2',
    cliente_nombre: 'Sofía Ramírez',
    cliente_telefono: '333-555-4444',
    servicio_id: 's2',
    servicio_nombre: 'Manicura completa',
    fecha: HOY_ISO,
    hora: '12:30 pm',
    duracion_min: 45,
    precio: 180,
    estado: 'completada',
    notas: 'Esmaltado en gel',
  },
  {
    id: 'c3',
    cliente_nombre: 'Ana Ruiz',
    cliente_telefono: '333-222-1111',
    servicio_id: 's3',
    servicio_nombre: 'Coloración completa',
    fecha: MANANA_ISO,
    hora: '11:00 am',
    duracion_min: 90,
    precio: 420,
    estado: 'pendiente',
    notas: 'Tinte rubio cenizo',
  },
  {
    id: 'c4',
    cliente_nombre: 'Sandra Torres',
    cliente_telefono: '333-333-2222',
    servicio_id: 's2',
    servicio_nombre: 'Manicura completa',
    fecha: MANANA_ISO,
    hora: '2:00 pm',
    duracion_min: 45,
    precio: 180,
    estado: 'confirmada',
    notas: 'Diseño floral',
  },
  {
    id: 'c5',
    cliente_nombre: 'Claudia Vega',
    cliente_telefono: '333-444-3333',
    servicio_id: 's4',
    servicio_nombre: 'Tratamiento capilar',
    fecha: getFechaLocalISO(en3Dias),
    hora: '9:30 am',
    duracion_min: 60,
    precio: 320,
    estado: 'pendiente',
    notas: 'Primera vez en salón',
  },
  {
    id: 'c6',
    cliente_nombre: 'Lucía Méndez',
    cliente_telefono: '333-777-8888',
    servicio_id: 's1',
    servicio_nombre: 'Corte + peinado',
    fecha: getFechaLocalISO(en5Dias),
    hora: '4:30 pm',
    duracion_min: 60,
    precio: 250,
    estado: 'pendiente',
    notas: 'Corte en capas',
  },
];

/**
 * Convierte un string de hora en formato 12 horas (ej. '10:00 am', '2:30 pm') a minutos desde medianoche
 */
export function hora12AMinutos(horaStr) {
  if (!horaStr) return 0;
  const match = horaStr.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (!match) {
    // Si viene en formato 24h ej. '14:30'
    const match24 = horaStr.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
      return parseInt(match24[1], 10) * 60 + parseInt(match24[2], 10);
    }
    return 0;
  }

  let horas = parseInt(match[1], 10);
  const minutos = parseInt(match[2], 10);
  const periodo = match[3].toLowerCase();

  if (periodo === 'pm' && horas !== 12) {
    horas += 12;
  } else if (periodo === 'am' && horas === 12) {
    horas = 0;
  }

  return horas * 60 + minutos;
}

/**
 * Formatea minutos o string 24h a formato 12 horas con am/pm
 */
export function formatearHora12(horas, minutos) {
  let h = horas % 12;
  if (h === 0) h = 12;
  const periodo = horas >= 12 ? 'pm' : 'am';
  const m = String(minutos).padStart(2, '0');
  return `${h}:${m} ${periodo}`;
}

/**
 * Normaliza un objeto de cita
 */
function normalizarCita(item) {
  return {
    id: item.id,
    clienteNombre: item.cliente_nombre || item.clienteNombre,
    cliente_nombre: item.cliente_nombre || item.clienteNombre,
    clienteTelefono: item.cliente_telefono || item.clienteTelefono || '',
    cliente_telefono: item.cliente_telefono || item.clienteTelefono || '',
    servicioId: item.servicio_id || item.servicioId,
    servicio_id: item.servicio_id || item.servicioId,
    servicioNombre: item.servicios?.nombre || item.servicio_nombre || item.servicio || 'Servicio',
    servicio_nombre: item.servicios?.nombre || item.servicio_nombre || item.servicio || 'Servicio',
    fecha: item.fecha,
    hora: item.hora,
    duracionMin: parseInt(item.duracion_min || item.duracionMin || 45, 10),
    duracion_min: parseInt(item.duracion_min || item.duracionMin || 45, 10),
    precio: parseFloat(item.precio || item.servicios?.precio || 0),
    estado: item.estado || 'pendiente',
    notas: item.notas || '',
  };
}

/**
 * Verifica si existe un traslape de horario en la misma fecha
 */
export async function verificarTraslape(fecha, hora12, duracionMin = 45, excluirId = null) {
  const citas = await obtenerCitas();
  const inicioNuevo = hora12AMinutos(hora12);
  const finNuevo = inicioNuevo + parseInt(duracionMin, 10);

  const conflicto = citas.find(c => {
    if (c.id === excluirId) return false;
    if (c.fecha !== fecha) return false;
    if (c.estado === 'cancelada') return false;

    const inicioCita = hora12AMinutos(c.hora);
    const finCita = inicioCita + (c.duracion_min || 45);

    return inicioNuevo < finCita && finNuevo > inicioCita;
  });

  return {
    hayTraslape: Boolean(conflicto),
    citaConflicto: conflicto || null,
  };
}

/**
 * Obtiene todas las citas
 */
export async function obtenerCitas() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('citas')
        .select(`
          *,
          servicios ( id, nombre, precio, pedestal_color )
        `)
        .order('fecha', { ascending: true })
        .order('hora', { ascending: true });

      if (error) {
        console.warn('Error consultando citas en Supabase, usando local:', error.message);
        return localCitas.map(normalizarCita);
      }

      if (data && data.length > 0) {
        return data.map(normalizarCita);
      }
    } catch (e) {
      console.warn('Excepción obteniendo citas:', e);
    }
  }

  return localCitas.map(normalizarCita);
}

/**
 * Obtiene el conteo de citas programadas para mañana (excluye canceladas)
 */
export async function obtenerConteoCitasMañana() {
  const citas = await obtenerCitas();
  const manana = MANANA_ISO;
  return citas.filter(c => c.fecha === manana && c.estado !== 'cancelada').length;
}

/**
 * Crea una nueva cita
 */
export async function crearCita(datos) {
  const payload = {
    cliente_nombre: datos.cliente_nombre || datos.clienteNombre,
    cliente_telefono: datos.cliente_telefono || datos.clienteTelefono || null,
    servicio_id: datos.servicio_id || datos.servicioId || null,
    fecha: datos.fecha, // 'YYYY-MM-DD'
    hora: datos.hora,   // ej. '10:00 am'
    duracion_min: parseInt(datos.duracion_min || datos.duracionMin || 45, 10),
    precio: parseFloat(datos.precio || 0),
    estado: datos.estado || 'pendiente',
    notas: datos.notas?.trim() || null,
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('citas')
        .insert([payload])
        .select(`
          *,
          servicios ( id, nombre, precio, pedestal_color )
        `)
        .single();

      if (error) {
        console.warn('Error insertando cita en Supabase:', error.message);
        throw error;
      }

      return normalizarCita(data);
    } catch (err) {
      console.warn('Falló inserción en Supabase, guardando local:', err.message);
    }
  }

  // Fallback local
  const nuevaCita = {
    id: `cita_${Date.now()}`,
    ...payload,
    servicio_nombre: datos.servicio_nombre || datos.servicioNombre || 'Servicio',
  };
  localCitas.push(nuevaCita);
  return normalizarCita(nuevaCita);
}

/**
 * Actualiza el estado de una cita ('confirmada', 'completada', 'cancelada', etc.)
 */
export async function actualizarEstadoCita(id, nuevoEstado) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('citas')
        .update({ estado: nuevoEstado })
        .eq('id', id)
        .select(`
          *,
          servicios ( id, nombre, precio, pedestal_color )
        `)
        .single();

      if (!error && data) {
        return normalizarCita(data);
      }
    } catch (e) {
      console.warn('Error actualizando estado en Supabase:', e);
    }
  }

  // Fallback local
  const idx = localCitas.findIndex(c => String(c.id) === String(id));
  if (idx !== -1) {
    localCitas[idx].estado = nuevoEstado;
    return normalizarCita(localCitas[idx]);
  }

  return null;
}

/**
 * Elimina una cita
 */
export async function eliminarCita(id) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('citas')
        .delete()
        .eq('id', id);

      if (!error) return true;
    } catch (e) {
      console.warn('Error eliminando cita en Supabase:', e);
    }
  }

  // Fallback local
  localCitas = localCitas.filter(c => String(c.id) !== String(id));
  return true;
}
