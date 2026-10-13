use client';
import Link from 'next/link';
import { Wrench, ArrowLeft, ShieldAlert, Home } from 'lucide-react';

export default function NotFoundPage() {
return (

```
  {/* Elementos decorativos de fondo */}
  <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
  <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

  <div className="max-w-xl w-full bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl text-center relative z-10">
    
    {/* Icono animado o destacado */}
    <div className="mx-auto w-20 h-20 bg-gradient-to-tr from-amber-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 mb-6 transform hover:rotate-6 transition-transform">
      <Wrench className="w-10 h-10 text-white animate-pulse" />
    </div>

    {/* Código de error */}
    <span className="inline-block bg-amber-500/20 text-amber-300 text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest mb-3">
      Error 404 / Mantenimiento
    </span>

    <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-4">
      Página no encontrada o en Actualización
    </h1>

    <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-8">
      El módulo al que intentas acceder no se encuentra disponible, está temporalmente en mantenimiento o la ruta especificada es incorrecta.
    </p>

    {/* Botones de acción */}
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
      <Link
        href="/"
        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black px-6 py-3 rounded-xl transition-all shadow-lg shadow-blue-600/30 text-xs tracking-wider uppercase"
      >
        <Home size={16} /> Ir al Inicio
      </Link>
      
      <button
        onClick={() => window.history.back()}
        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-3 rounded-xl transition-all border border-white/10 text-xs tracking-wider uppercase"
      >
        <ArrowLeft size={16} /> Regresar Atrás
      </button>
    </div>

  </div>

  {/* Pie de página sutil */}
  <div className="mt-8 text-center text-xs text-slate-500 font-medium">
    Sistema Centralizado • Protección y Control Operativo
  </div>

</div>

```

);
}
