import { createClient } from '@supabase/supabase-js';

// Usamos las credenciales que ya probamos con éxito en la terminal
const supabaseUrl = 'https://arnzgpkllqjkchvydqbc.supabase.co';
const supabaseKey = 'sb_publishable_x0KPWEiTh7wy7xtcYm4hJA_xXofMvhK';

export const supabase = createClient(supabaseUrl, supabaseKey);