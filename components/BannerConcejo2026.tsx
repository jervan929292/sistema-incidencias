'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ShieldAlert, Vote, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BannerConcejo2026() {
  const [rol, setRol] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
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
  }, [pathname]);

  if (pathname === '/login' || pathname === '/' || loading || !rol) return null;

  // ENCABEZADO 1: Para el Superusuario o Administrador (Publicidad de Supervisión)
  if (rol === 'superusuario' || rol === 'admin') {
    return (
      <div className="w-full bg-gradient-to-r from-red-700 via-amber-600 to-red-800 text-white px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2 text-center md:text-left">
          <div className="bg-white/20 p-1.5 rounded-lg shrink-0 hidden sm:block">
            <ShieldAlert size={18} className="text-white" />
          </div>
          <p className="text-[11px] md:text-sm font-black tracking-wide uppercase leading-tight">
            Panel de Control Centralizado: <br className="block md:hidden"/>
            <span className="text-amber-200">Consulta Popular 2026</span>
          </p>
        </div>
        <Link 
          href="/admin/concejo2026" 
          className="flex items-center justify-center gap-2 bg-white text-red-700 px-6 py-2 rounded-full text-xs font-black hover:bg-gray-100 transition-all shadow-sm w-full md:w-auto"
        >
          SUPERVISAR ESTADO <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  // ENCABEZADO 2: Para el Usuario Regular / Jefe de Cuadrante (Publicidad de Carga Territorial)
  if (rol === 'usuario') {
    return (
      <div className="w-full bg-gradient-to-r from-[#00529b] via-blue-600 to-[#003d73] text-white px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2 text-center md:text-left">
          <div className="bg-white/20 p-1.5 rounded-lg shrink-0 hidden sm:block">
            <Vote size={18} className="text-emerald-300" />
          </div>
          <p className="text-[11px] md:text-sm font-bold tracking-wide uppercase leading-tight">
            Registro de Actividades: <br className="block md:hidden"/>
            <span className="text-emerald-200 font-black">Consulta Popular 2026</span>
          </p>
        </div>
        <Link 
          href="/dashboard/concejo2026" 
          className="flex items-center justify-center gap-2 bg-emerald-500 text-white px-6 py-2 rounded-full text-xs font-black hover:bg-emerald-600 transition-all shadow-sm w-full md:w-auto"
        >
          REGISTRAR AHORA <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  return null;
}