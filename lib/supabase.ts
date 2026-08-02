import { createClient } from '@supabase/supabase-js';

// Verificamos que la URL exista y sea válida; si no, usamos un placeholder seguro para el build
const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseUrl = (rawUrl && rawUrl.startsWith('http')) 
  ? rawUrl 
  : 'https://placeholder.supabase.co';

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: typeof window !== 'undefined',
    autoRefreshToken: typeof window !== 'undefined',
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-client-info': 'sistema-incidencias-ven911',
    },
  },
});
