import * as ImageManipulator from 'expo-image-manipulator';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockProductos } from '../constants/mockData';

// Almacén en memoria como respaldo cuando Supabase aún no está configurado
let localProductos = [...mockProductos];

/**
 * Optimiza y comprime la imagen a ~800px de ancho y calidad 0.8
 */
export async function optimizarFoto(uri) {
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );
    return manipResult.uri;
  } catch (error) {
    console.warn('No se pudo optimizar la imagen, usando original:', error);
    return uri;
  }
}

/**
 * Sube la foto al bucket de Supabase Storage
 */
export async function subirFotoStorage(uri, productoId) {
  if (!isSupabaseConfigured || !supabase) {
    return uri; // Modo local: retorna la URI temporal local
  }

  try {
    const optimizadaUri = await optimizarFoto(uri);
    const fileName = `${productoId || Date.now()}_${Date.now()}.jpg`;

    const response = await fetch(optimizadaUri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from('productos-fotos')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.warn('Error subiendo foto a Supabase Storage:', uploadError);
      return uri;
    }

    const { data } = supabase.storage
      .from('productos-fotos')
      .getPublicUrl(fileName);

    return data?.publicUrl || uri;
  } catch (err) {
    console.error('Error en subirFotoStorage:', err);
    return uri;
  }
}

/**
 * Obtiene la lista completa de productos
 */
export async function obtenerProductos() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) {
        console.warn('Error al consultar Supabase, usando respaldo local:', error.message);
        return localProductos;
      }

      if (data && data.length > 0) {
        // Mapear campos de BD a formato frontend si hace falta
        return data.map(item => ({
          ...item,
          precioVenta: item.precio_venta ?? item.precioVenta,
          stockMinimo: item.stock_minimo ?? item.stockMinimo,
          pedestalColor: item.pedestal_color ?? item.pedestalColor ?? '#F7F1E8',
        }));
      }
    } catch (e) {
      console.warn('Excepción consultando Supabase:', e);
    }
  }

  return [...localProductos];
}

/**
 * Obtiene un producto por su ID
 */
export async function obtenerProductoPorId(id) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        return {
          ...data,
          precioVenta: data.precio_venta ?? data.precioVenta,
          stockMinimo: data.stock_minimo ?? data.stockMinimo,
          pedestalColor: data.pedestal_color ?? data.pedestalColor ?? '#F7F1E8',
        };
      }
    } catch (e) {
      console.warn('Error obteniendo producto en Supabase:', e);
    }
  }

  return localProductos.find(p => String(p.id) === String(id)) || null;
}

/**
 * Crea un nuevo producto
 */
export async function crearProducto(nuevoData, fotoUri = null) {
  let fotoUrl = null;

  if (fotoUri) {
    fotoUrl = await subirFotoStorage(fotoUri);
  }

  const payload = {
    nombre: nuevoData.nombre?.trim() || 'Sin nombre',
    marca: nuevoData.marca?.trim() || '',
    categoria: nuevoData.categoria || 'General',
    costo: parseFloat(nuevoData.costo || 0),
    precio_venta: parseFloat(nuevoData.precioVenta ?? nuevoData.precio_venta ?? 0),
    stock: parseInt(nuevoData.stock || 0, 10),
    stock_minimo: parseInt(nuevoData.stockMinimo ?? nuevoData.stock_minimo ?? 3, 10),
    foto_url: fotoUrl,
    pedestal_color: nuevoData.pedestalColor || '#F7F1E8',
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('productos')
        .insert([payload])
        .select()
        .single();

      if (!error && data) {
        return {
          ...data,
          precioVenta: data.precio_venta,
          stockMinimo: data.stock_minimo,
          pedestalColor: data.pedestal_color,
        };
      }
      console.warn('Error insertando en Supabase, guardando local:', error);
    } catch (e) {
      console.warn('Excepción insertando en Supabase:', e);
    }
  }

  // Respaldo local
  const nuevoLocal = {
    id: `prod_${Date.now()}`,
    ...payload,
    precioVenta: payload.precio_venta,
    stockMinimo: payload.stock_minimo,
    pedestalColor: payload.pedestal_color,
  };
  localProductos = [nuevoLocal, ...localProductos];
  return nuevoLocal;
}

/**
 * Actualiza un producto existente
 */
export async function actualizarProducto(id, datos, nuevaFotoUri = null) {
  let fotoUrl = datos.foto_url || datos.fotoUrl;

  if (nuevaFotoUri && !nuevaFotoUri.startsWith('http')) {
    fotoUrl = await subirFotoStorage(nuevaFotoUri, id);
  }

  const payload = {
    nombre: datos.nombre?.trim(),
    marca: datos.marca?.trim(),
    categoria: datos.categoria,
    costo: parseFloat(datos.costo || 0),
    precio_venta: parseFloat(datos.precioVenta ?? datos.precio_venta ?? 0),
    stock: parseInt(datos.stock || 0, 10),
    stock_minimo: parseInt(datos.stockMinimo ?? datos.stock_minimo ?? 3, 10),
    foto_url: fotoUrl,
    pedestal_color: datos.pedestalColor || datos.pedestal_color || '#F7F1E8',
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('productos')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        return {
          ...data,
          precioVenta: data.precio_venta,
          stockMinimo: data.stock_minimo,
          pedestalColor: data.pedestal_color,
        };
      }
      console.warn('Error actualizando en Supabase, actualizando local:', error);
    } catch (e) {
      console.warn('Excepción actualizando en Supabase:', e);
    }
  }

  // Respaldo local
  const index = localProductos.findIndex(p => String(p.id) === String(id));
  if (index !== -1) {
    localProductos[index] = {
      ...localProductos[index],
      ...payload,
      precioVenta: payload.precio_venta,
      stockMinimo: payload.stock_minimo,
      pedestalColor: payload.pedestal_color,
    };
    return localProductos[index];
  }

  return { id, ...payload };
}

/**
 * Elimina un producto
 */
export async function eliminarProducto(id) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('productos')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn('Error eliminando en Supabase:', error);
      }
    } catch (e) {
      console.warn('Excepción eliminando en Supabase:', e);
    }
  }

  localProductos = localProductos.filter(p => String(p.id) !== String(id));
  return true;
}
