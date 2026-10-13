'use client';
import Link from 'next/link';
import { Wrench, ArrowLeft, ShieldAlert, Home } from 'lucide-react';

export default function MantenimientoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-xl w-full bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl text-center relative z-10">
        
        {/* Icono animado */}
        <div className="mx-auto w-20 h-20 bg-gradient-to-tr from-amber-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 mb-6">
          <Wrench className="w-10 h-10 text-white animate-pulse" />
        </div>

        {/* Código de error */}
        <span className="inline-block bg-amber-500/20 text-amber-300 text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest mb-3 border border-amber-500/30">
          Error 404 / Mantenimiento Programado
        </span>

        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-4 text-white uppercase">
          Sistema en Actualización
        </h1>

        <p className="text-gray-300 text-sm md:text-base leading-relaxed mb-8">
          En este momento nos encontramos optimizando los servidores y actualizando los módulos operativos del <strong className="text-white">Sistema VEN 911</strong>. Estaremos de vuelta en breve.
        </p>

        {/* Botones de navegación */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link 
            href="/login" 
            className="w-full sm:w-auto bg-[#00529b] hover:bg-[#003d73] text-white font-bold text-xs uppercase px-6 py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Home size={16} /> Ir al Inicio / Login
          </Link>
          
          <button 
            onClick={() => window.location.reload()} 
            className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs uppercase px-6 py-3.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} /> Reintentar Conexión
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 text-[11px] text-gray-400 font-medium">
          Centro de Comando, Control y Telecomunicaciones VEN 911 - Falcón
        </div>

      </div>
    </div>
  );
}
