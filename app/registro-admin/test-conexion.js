const { createClient } = require('@supabase/supabase-js');

// Aquí están las NUEVAS credenciales de tu proyecto actual
const supabase = createClient('https://arnzgpkllqjkchvydqbc.supabase.co', 'sb_publishable_x0KPWEiTh7wy7xtcYm4hJA_xXofMvhK');

async function test() {
  console.log("Probando conexión con la nueva base de datos...");
  
  const { data, error } = await supabase.from('directorio_operativo').select('*').limit(1);
  
  if (error) {
    console.error("ERROR DE CONEXIÓN:", error.message);
  } else {
    console.log("¡CONEXIÓN EXITOSA! Todo está funcionando perfectamente. Datos:", data);
  }
}

test();