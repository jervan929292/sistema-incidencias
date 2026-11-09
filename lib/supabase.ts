import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://14disun0wg.localto.net';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: typeof window !== 'undefined',
    autoRefreshToken: typeof window !== 'undefined',
  },
  global: {
    headers: {
      'x-client-info': 'sistema-cupaz-falcon',
    },
  },
});
