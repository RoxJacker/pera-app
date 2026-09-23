import { supabase, isSupabaseConfigured } from '../lib/supabase';

let pinLocal = '1234';
let sesionIniciada = false;

export async function verificarPin(pinIngresado) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('configuracion')
        .select('valor')
        .eq('clave', 'pin_seguridad')
        .single();

      if (!error && data?.valor) {
        const valido = data.valor.trim() === pinIngresado.trim();
        if (valido) sesionIniciada = true;
        return valido;
      }
    } catch (e) {
      console.warn('Error verificando PIN en Supabase, usando PIN local:', e);
    }
  }

  // Fallback con PIN por defecto
  const valido = pinIngresado === pinLocal;
  if (valido) sesionIniciada = true;
  return valido;
}

export function estaAutenticado() {
  return sesionIniciada;
}

export function cerrarSesion() {
  sesionIniciada = false;
}

export async function actualizarPin(nuevoPin) {
  pinLocal = nuevoPin;
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('configuracion')
        .upsert({ clave: 'pin_seguridad', valor: nuevoPin });
    } catch (e) {
      console.warn('Error actualizando PIN en Supabase:', e);
    }
  }
}
