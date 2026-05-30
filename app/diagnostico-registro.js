const { createClient } = require('@supabase/supabase-js');

// Configuración con tus credenciales actuales
const supabase = createClient('https://arnzgpkllqjkchvydqbc.supabase.co', 'sb_publishable_x0KPWEiTh7wy7xtcYm4hJA_xXofMvhK');

async function diagnosticar() {
  console.log("--- INICIANDO DIAGNÓSTICO ---");

  // 1. Prueba de escritura simple (sin Auth, solo base de datos)
  console.log("Intentando escribir prueba en directorio_operativo...");
  const { data, error } = await supabase
    .from('directorio_operativo')
    .insert([{
      nombre_apellido_jefe: "USUARIO DE PRUEBA",
      email: "prueba" + Date.now() + "@test.com",
      telefono_celular_jefe: "0000000000",
      rol: "admin"
    }]);

  if (error) {
    console.error("❌ ERROR CRÍTICO EN BASE DE DATOS:");
    console.error("Código:", error.code);
    console.error("Mensaje:", error.message);
    console.error("Detalles:", error.details);
  } else {
    console.log("✅ ÉXITO: La base de datos permite inserciones.");
  }

  console.log("--- FIN DEL DIAGNÓSTICO ---");
}

diagnosticar();