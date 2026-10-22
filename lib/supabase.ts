import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: typeof window !== 'undefined',
    autoRefreshToken: typeof window !== 'undefined',
  },
  global: {
    headers: {
      // ESTAS DOS CABECERAS DESTRUYEN LA PÁGINA INTERMEDIA DE LOCALTONET:
      'localtonet-skip-warning': 'true',
      'bypass-tunnel-reminder': 'true',
      'x-client-info': 'sistema-incidencias-ven911',
    },
  },
});
