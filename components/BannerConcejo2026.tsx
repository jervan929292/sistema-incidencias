'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ShieldAlert, Vote, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation'; // <-- Importamos esto para detectar la ruta

export default function BannerConcejo2026() {
  const [rol, setRol] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname(); // <-- Aquí leemos en qué página estamos

  useEffect(() => {
    // Si estamos en el login, ni siquiera intentamos buscar el rol
    if (pathname === '/login' || pathname === '/') {
      setLoading(false);
      return;
    }

    const obtenerRol = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: perfil } = await supabase
          .from('directorio_operativo')
          .select('rol')
          .eq('id', user.id)
          .single();

        if (perfil) {
          setRol(perfil.rol);
        }
      } catch (error) {
        console.error("Error obteniendo rol para banner:", error);
      } finally {
        setLoading(false);
      }
    };
    
    obtenerRol();
  }, [pathname]); // <-- Le decimos que se actualice si cambias de página

  // LA REGLA DE ORO: Si es la página de login, o está cargando, o no hay rol, NO MUESTRES NADA.
  if (pathname === '/login' || pathname === '/' || loading || !rol) return null;

  // ENCABEZADO 1: Para el Superusuario o Administrador (Publicidad de Supervisión)
  if (rol === 'superusuario' || rol === 'admin') {
    return (
      <div className="w-full bg-gradient-to-r from-red-700 via-amber-600 to-red-800 text-white px-4 py-2.5 flex items-center justify-between shadow-md animate-pulse">
        <div className="flex items-center gap-3 mx-auto md:mx-0">
          <div className="bg-white/20 p-1.5 rounded-lg">
            <ShieldAlert size={18} className="text-white" />
          </div>
          <p className="text-xs md:text-sm font-black tracking-wide uppercase">
            Panel de Control Centralizado: <span className="text-amber-200">Operativo Concejo Popular 2026</span>
          </p>
        </div>
        <Link 
          href="/admin/concejo2026" 
          className="hidden md:flex items-center gap-2 bg-white text-red-700 px-4 py-1 rounded-full text-xs font-black hover:bg-gray-100 transition-all shadow-sm"
        >
          SUPERVISAR ESTADO <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  // ENCABEZADO 2: Para el Usuario Regular / Jefe de Cuadrante (Publicidad de Carga Territorial)
  if (rol === 'usuario') {
    return (
      <div className="w-full bg-gradient-to-r from-[#00529b] via-blue-600 to-[#003d73] text-white px-4 py-2.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3 mx-auto md:mx-0">
          <div className="bg-white/20 p-1.5 rounded-lg">
            <Vote size={18} className="text-emerald-300" />
          </div>
          <p className="text-xs md:text-sm font-bold tracking-wide uppercase">
            Atención Jefe de Circuito: <span className="text-emerald-200 font-black">Actualiza las Autoridades de tus Escuelas</span>
          </p>
        </div>
        <Link 
          href="/dashboard/concejo2026" 
          className="hidden md:flex items-center gap-2 bg-emerald-500 text-white px-4 py-1 rounded-full text-xs font-black hover:bg-emerald-600 transition-all shadow-sm"
        >
          REGISTRAR AHORA <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  return null;
}