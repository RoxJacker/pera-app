import { createClient } from '@supabase/supabase-js';

// Esta función SOLO se usa en el backend (funciones serverless de Vercel)
// La service_role key NUNCA se expone al cliente
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️  Faltan variables de entorno de Supabase. Revisa tu .env.local o Vercel dashboard.');
}

export const supabase = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
