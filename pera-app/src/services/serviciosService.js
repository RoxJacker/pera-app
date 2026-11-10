import * as ImageManipulator from 'expo-image-manipulator';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockServicios } from '../constants/mockData';

// Almacén local en memoria como fallback si la base de datos no está disponible
let localServicios = mockServicios.map(s => ({
  ...s,
  duracion_min: s.duracion,
  pedestal_color: s.pedestalColor || '#EBD9CC',
  foto_url: null,
  activo: true,
}));

/**
 * Optimiza y comprime la foto del servicio a ~800px
 */
export async function optimizarFotoServicio(uri) {
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );
    return manipResult.uri;
  } catch (error) {
    console.warn('No se pudo optimizar imagen de servicio, usando original:', error);
    return uri;
  }
}

/**
 * Sube la foto del servicio al bucket de Supabase Storage con timeout seguro
 */
export async function subirFotoServicioStorage(uri, servicioId) {
  if (!uri || uri.startsWith('http')) return uri;

  if (!isSupabaseConfigured || !supabase) {
    return uri;
  }

  try {
    const optimizadaUri = await optimizarFotoServicio(uri);
    const fileName = `serv_${servicioId || 'new'}_${Date.now()}.jpg`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20_000);
    let blob;
    try {
      const response = await fetch(optimizadaUri, { signal: controller.signal });
      blob = await response.blob();
    } finally {
      clearTimeout(timeoutId);
    }

    // Intentar en servicios-fotos; si no existe, usar productos-fotos
    let bucket = 'servicios-fotos';
    let uploadRes = await supabase.storage
      .from(bucket)
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadRes.error) {
      // Fallback al bucket general de fotos si servicios-fotos no está creado
      bucket = 'productos-fotos';
      uploadRes = await supabase.storage
        .from(bucket)
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });
    }

    if (uploadRes.error) {
      console.warn('Error subiendo foto de servicio:', uploadRes.error.message);
      return null;
    }

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return data?.publicUrl ?? null;
  } catch (err) {
    console.warn('Excepción en subirFotoServicioStorage:', err.message);
    return null;
  }
}

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
    foto_url: item.foto_url || item.fotoUrl || null,
    fotoUrl: item.foto_url || item.fotoUrl || null,
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
 * Registra un nuevo servicio con soporte de foto opcional
 */
export async function crearServicio(datos, fotoUri = null) {
  let fotoUrl = null;
  if (fotoUri && !fotoUri.startsWith('http')) {
    fotoUrl = await subirFotoServicioStorage(fotoUri);
  } else if (fotoUri && fotoUri.startsWith('http')) {
    fotoUrl = fotoUri;
  }

  const payload = {
    nombre: datos.nombre?.trim() || 'Servicio sin nombre',
    precio: parseFloat(datos.precio || 0),
    duracion_min: parseInt(datos.duracion_min || datos.duracion || 45, 10),
    pedestal_color: datos.pedestal_color || datos.pedestalColor || '#EBD9CC',
    foto_url: fotoUrl,
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
 * Actualiza los datos de un servicio existente con soporte de foto
 */
export async function actualizarServicio(id, datos, nuevaFotoUri = undefined) {
  let fotoUrl = datos.foto_url ?? datos.fotoUrl ?? null;

  if (nuevaFotoUri && !nuevaFotoUri.startsWith('http')) {
    const subida = await subirFotoServicioStorage(nuevaFotoUri, id);
    if (subida) fotoUrl = subida;
  } else if (nuevaFotoUri === null) {
    // Se quitó la foto explícitamente
    fotoUrl = null;
  }

  const payload = {
    nombre: datos.nombre?.trim(),
    precio: parseFloat(datos.precio || 0),
    duracion_min: parseInt(datos.duracion_min || datos.duracion || 45, 10),
    pedestal_color: datos.pedestal_color || datos.pedestalColor || '#EBD9CC',
    foto_url: fotoUrl,
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
