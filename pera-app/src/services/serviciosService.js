import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockServicios } from '../constants/mockData';

// Almacén local en memoria como fallback si la base de datos no está disponible
let localServicios = mockServicios.map(s => ({
  ...s,
  duracion_min: s.duracion,
  pedestal_color: s.pedestalColor || '#EBD9CC',
  activo: true,
}));

/**
 * Normaliza los campos de un registro de servicio para compatibilidad
 */
function normalizarServicio(item) {
  return {
    id: item.id,
    nombre: item.nombre,
    precio: parseFloat(item.precio || 0),
    duracion_min: parseInt(item.duracion_min ?? item.duracion ?? 45, 10),
    duracion: parseInt(item.duracion_min ?? item.duracion ?? 45, 10),
    pedestal_color: item.pedestal_color || item.pedestalColor || '#EBD9CC',
    pedestalColor: item.pedestal_color || item.pedestalColor || '#EBD9CC',
    activo: item.activo !== false,
  };
}

/**
 * Obtiene todos los servicios activos
 */
export async function obtenerServicios() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('servicios')
        .select('*')
        .eq('activo', true)
        .order('nombre', { ascending: true });

      if (error) {
        console.warn('Error consultando servicios en Supabase, usando local:', error.message);
        return localServicios.map(normalizarServicio);
      }

      if (data && data.length > 0) {
        return data.map(normalizarServicio);
      }
    } catch (e) {
      console.warn('Excepción consultando servicios:', e);
    }
  }

  return localServicios.filter(s => s.activo !== false).map(normalizarServicio);
}

/**
 * Obtiene un servicio por su ID
 */
export async function obtenerServicioPorId(id) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('servicios')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        return normalizarServicio(data);
      }
    } catch (e) {
      console.warn('Error obteniendo servicio por ID:', e);
    }
  }

  const local = localServicios.find(s => String(s.id) === String(id));
  return local ? normalizarServicio(local) : null;
}

/**
 * Registra un nuevo servicio
 */
export async function crearServicio(datos) {
  const payload = {
    nombre: datos.nombre?.trim() || 'Servicio sin nombre',
    precio: parseFloat(datos.precio || 0),
    duracion_min: parseInt(datos.duracion_min || datos.duracion || 45, 10),
    pedestal_color: datos.pedestal_color || datos.pedestalColor || '#EBD9CC',
    activo: true,
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('servicios')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.warn('Error al insertar servicio en Supabase:', error.message);
        throw error;
      }

      return normalizarServicio(data);
    } catch (err) {
      console.warn('Falló inserción en Supabase, guardando localmente:', err.message);
    }
  }

  // Fallback local
  const nuevoLocal = {
    id: `serv_${Date.now()}`,
    ...payload,
  };
  localServicios.unshift(nuevoLocal);
  return normalizarServicio(nuevoLocal);
}

/**
 * Actualiza los datos de un servicio existente
 */
export async function actualizarServicio(id, datos) {
  const payload = {
    nombre: datos.nombre?.trim(),
    precio: parseFloat(datos.precio || 0),
    duracion_min: parseInt(datos.duracion_min || datos.duracion || 45, 10),
    pedestal_color: datos.pedestal_color || datos.pedestalColor || '#EBD9CC',
  };

  if (datos.activo !== undefined) {
    payload.activo = Boolean(datos.activo);
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('servicios')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.warn('Error al actualizar servicio en Supabase:', error.message);
        throw error;
      }

      return normalizarServicio(data);
    } catch (err) {
      console.warn('Falló actualización en Supabase, modificando local:', err.message);
    }
  }

  // Fallback local
  const idx = localServicios.findIndex(s => String(s.id) === String(id));
  if (idx !== -1) {
    localServicios[idx] = { ...localServicios[idx], ...payload };
    return normalizarServicio(localServicios[idx]);
  }

  return null;
}

/**
 * Elimina un servicio (borrado físico o lógico)
 */
export async function eliminarServicio(id) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('servicios')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn('Error eliminando servicio en Supabase:', error.message);
        throw error;
      }

      return true;
    } catch (err) {
      console.warn('Falló eliminación en Supabase, borrando local:', err.message);
    }
  }

  // Fallback local
  localServicios = localServicios.filter(s => String(s.id) !== String(id));
  return true;
}
