'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ShieldCheck, UserPlus, Building2 } from 'lucide-react';

// ==========================================
// LISTA DE ORGANISMOS (INCLUYE VEN 911)
// ==========================================
const LISTA_ORGANISMOS = [
  "VEN 911",
  "Cuerpo de Investigaciones Científicas Penales y Criminalísticas",
  "Dirección de Atención Integral Penitenciaria",
  "Dirección General de Bomberos y Bomberas",
  "Direccion General de Cuadrantes de Paz",
  "Dirección General de los Centros de Comando, Control y Telecomunicaciones",
  "Dirección General de Prevención del Delito",
  "Guardia Nacional bolivariana",
  "Instituto Nacional Contra la Discriminación Racial",
  "Instituto Nacional de Meteorología e Hidrología",
  "Instituto Nacional de Transporte Terrestre",
  "Oficina Nacional Contra la Delincuencia Organizada y Financiamiento al Terrorismo",
  "Oficina Nacional para La Atención Integral de las Victimas",
  "Policía Estadal",
  "Policía Municipal Miranda",
  "Policía Municipal Carirubana",
  "Policía Nacional Bolivariana",
  "Protección Civil y Administración de Desastre",
  "Servicio Autónomo de Identificación, Migración y Extranjería",
  "Servicio Autónomo de Registros y Notarias",
  "Servicio Nacional para el Desarme",
  "Sistema Nacional de Medicina Forense",
  "Superintendencia Nacional Antidrogas",
  "Universidad Nacional Experimental de la Seguridad",
  "Otros"
];

export default function RegistroAdminPage() {
  const [formData, setFormData] = useState({ 
    nombre: '', 
    email: '', 
    telefono: '', 
    password: '', 
    cargo: '', 
    cedula: '',
    organismo: '' 
  });
  const [loading, setLoading] = useState(false);
  const [vieneDeAdmin, setVieneDeAdmin] = useState(false);
  const router = useRouter();

  // --- VERIFICAR SI YA ESTÁ LOGUEADO COMO ADMIN ---
  useEffect(() => {
    const verificarSesion = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setVieneDeAdmin(true);
      }
    };
    verificarSesion();
  }, []);

  // --- INICIO DEL ATAJO SECRETO CTRL + 8 (PARA VOLVER RÁPIDO) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '8') {
        e.preventDefault();
        router.push(vieneDeAdmin ? '/admin' : '/');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, vieneDeAdmin]);
  // --- FIN DEL ATAJO SECRETO ---

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Crear usuario en Auth
      const { data: auth, error: authError } = await supabase.auth.signUp({ 
        email: formData.email, 
        password: formData.password 
      });

      if (authError) throw new Error("Error de Autenticación: " + authError.message);

      // 2. Guardar datos en la base de datos
      const { error: dbError } = await supabase.from('directorio_operativo').insert([{
        id: auth.user?.id, 
        nombre_apellido_jefe: formData.nombre, 
        email: formData.email, 
        telefono_celular_jefe: formData.telefono,
        cedula: formData.cedula,
        grado_jerarquia: formData.cargo,
        organismo_responsable: formData.organismo,
        rol: 'admin', // Nace como administrador regular de su institución
        codigo_situr: formData.password
      }]);
      
      if (dbError) throw new Error("Error guardando en la tabla: " + dbError.message);

      alert("¡Administrador registrado correctamente!");
      
      // Si venía del panel, lo regresamos al panel. Si no, lo mandamos al login.
      router.push(vieneDeAdmin ? '/admin' : '/');
      
    } catch (err: any) {
      alert("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] p-6 flex items-center justify-center">
      <div className="bg-white rounded-[2rem] p-8 max-w-4xl w-full shadow-2xl border">
        
        <div className="flex flex-col items-center justify-center mb-6 border-b pb-4">
          <div className="bg-blue-100 p-3 rounded-full mb-3 text-[#00529b]">
            <ShieldCheck size={32} />
          </div>
          <h3 className="text-2xl font-black text-gray-800 text-center">Registro de Nuevo Administrador</h3>
          <p className="text-xs text-gray-500 font-bold mt-1 text-center">Crea una cuenta para gestionar los despachos de tu Institución</p>
        </div>
        
        <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          
          {/* Columna Izquierda: Datos Personales e Institución */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#00529b] mb-1 flex items-center gap-1">
                <Building2 size={14} /> Institución a la que pertenece
              </label>
              <select 
                required 
                className="w-full p-3 border-2 border-[#00529b] rounded-xl bg-blue-50 focus:ring-2 focus:ring-[#00529b] outline-none transition-all font-bold text-gray-700 cursor-pointer text-sm"
                value={formData.organismo} 
                onChange={e => setFormData({...formData, organismo: e.target.value})}
              >
                <option value="">Seleccione su Organismo...</option>
                {LISTA_ORGANISMOS.map((org, i) => (
                  <option key={i} value={org}>{org}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Nombre completo</label>
              <input required className="w-full p-3 border rounded-xl bg-white focus:ring-2 focus:ring-[#00529b] outline-none transition-all" placeholder="Ej: Juan Pérez" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
            </div>
            
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Cédula (Solo números)</label>
              <input required type="text" inputMode="numeric" pattern="[0-9]*" maxLength={10} className="w-full p-3 border rounded-xl bg-white focus:ring-2 focus:ring-[#00529b] outline-none transition-all" placeholder="Ej: 12345678" value={formData.cedula} onChange={e => setFormData({...formData, cedula: e.target.value.replace(/\D/g, '')})} />
            </div>
            
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Cargo / Grado</label>
              <input required className="w-full p-3 border rounded-xl bg-white focus:ring-2 focus:ring-[#00529b] outline-none transition-all" placeholder="Ej: Comisionado" value={formData.cargo} onChange={e => setFormData({...formData, cargo: e.target.value})} />
            </div>
          </div>

          {/* Columna Derecha: Datos de Contacto y Acceso */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Correo Electrónico Oficial</label>
              <input required type="email" className="w-full p-3 border rounded-xl bg-white focus:ring-2 focus:ring-[#00529b] outline-none transition-all" placeholder="admin@cupaz.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Teléfono Celular (Solo números)</label>
              <input required type="text" inputMode="numeric" pattern="[0-9]*" maxLength={11} className="w-full p-3 border rounded-xl bg-white focus:ring-2 focus:ring-[#00529b] outline-none transition-all" placeholder="Ej: 04120000000" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value.replace(/\D/g, '')})} />
            </div>
            
            <div className="pt-2">
              <label className="text-xs font-bold text-gray-700 mb-1 block">Contraseña de Acceso (Min. 6 caracteres)</label>
              <input required type="password" minLength={6} className="w-full p-3 border rounded-xl bg-white font-bold focus:ring-2 focus:ring-[#00529b] outline-none transition-all" placeholder="Ingresa tu clave segura" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            </div>
          </div>

          <div className="col-span-full flex flex-col sm:flex-row gap-3 pt-6 border-t mt-4">
            <button 
              type="button" 
              onClick={() => router.push(vieneDeAdmin ? '/admin' : '/')} 
              className="flex-1 bg-gray-200 text-gray-700 p-4 rounded-xl font-bold hover:bg-gray-300 transition-all text-center shadow-sm"
            >
              {vieneDeAdmin ? 'Volver al Panel Admin' : 'Volver al Login'}
            </button>
            
            <button type="submit" disabled={loading} className="flex-1 bg-[#00529b] text-white p-4 rounded-xl font-bold hover:bg-[#003d73] transition-all shadow-md flex items-center justify-center gap-2">
              {loading ? 'Procesando...' : <><UserPlus size={20} /> Solicitar Registro</>}
            </button>
          </div>
        </form>
        
      </div>
    </div>
  );
}