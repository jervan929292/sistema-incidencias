'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash2, AlertTriangle, Search, ArrowLeft, Building2, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

// Algoritmo de limpieza profunda
function limpiarNombre(text: string) {
  if (!text) return "";
  let t = text.toUpperCase();
  // Quitar acentos
  t = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // Quitar signos de puntuación
  t = t.replace(/[^\w\s]/g, ' ');
  
  // Normalizar prefijos comunes
  t = t.replace(/\b(ESCUELA BASICA|E B |EB)\b/g, 'EB ');
  t = t.replace(/\b(UNIDAD EDUCATIVA|U E |UE)\b/g, 'UE ');
  t = t.replace(/\b(CENTRO DE EDUCACION INICIAL|C E I |CEI)\b/g, 'CEI ');
  t = t.replace(/\b(ESCUELA PRIMARIA NACIONAL|E P N |EPN)\b/g, 'EPN ');
  t = t.replace(/\b(ESCUELA PRIMARIA BOLIVARIANA|E P B |EPB)\b/g, 'EPB ');
  t = t.replace(/\b(ESCUELA PRIMARIA|E P |EP)\b/g, 'EP ');
  t = t.replace(/\b(LICEO NACIONAL|L N |LN)\b/g, 'LN ');
  t = t.replace(/\b(CENTRO DE EDUCACION INICIAL SIMONCITO|C E I S |CEIS)\b/g, 'CEIS ');
  
  return t.replace(/\s+/g, ' ').trim();
}

export default function LimpiadorEscuelasPage() {
  const [duplicados, setDuplicados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [borrando, setBorrrando] = useState<string | null>(null);

  const cargarDatos = async () => {
    setLoading(true);
    // Traer todas las escuelas
    const { data: escuelas, error } = await supabase.from('centros_votacion_2026').select('*');
    
    if (escuelas && !error) {
      const grupos = new Map();
      
      escuelas.forEach(c => {
        const situr = c.CODIGO_CIRCUITO_COMUNAL?.trim();
        const nombreLimpio = limpiarNombre(c['NOMBRE CENTRO']);
        // Agrupamos por Circuito y Nombre Similar
        const clave = `${situr} ||| ${nombreLimpio}`;
        
        if (!grupos.has(clave)) grupos.set(clave, []);
        grupos.get(clave).push(c);
      });

      // Filtrar solo los que tienen 2 o más escuelas parecidas
      const repetidos = Array.from(grupos.entries())
        .filter(([_, arr]) => arr.length > 1)
        .map(([clave, arr]) => ({
          situr: clave.split(' ||| ')[0],
          nombreDetectado: clave.split(' ||| ')[1],
          escuelas: arr
        }));

      setDuplicados(repetidos);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const eliminarEscuela = async (codCentro: string) => {
    const confirmar = window.confirm(`¿Estás 100% seguro de que deseas eliminar la escuela con código ${codCentro}?\n\nEsta acción no se puede deshacer.`);
    if (!confirmar) return;

    setBorrrando(codCentro);
    const { error } = await supabase
      .from('centros_votacion_2026')
      .delete()
      .eq('COD_CENTRO', codCentro);

    if (!error) {
      alert(`Escuela ${codCentro} eliminada correctamente.`);
      cargarDatos(); // Recargar la lista
    } else {
      alert(`Error al eliminar: ${error.message}`);
    }
    setBorrrando(null);
  };

  if (loading) return <div className="p-8 text-center font-bold text-[#00529b] animate-pulse">Escaneando base de datos con inteligencia artificial...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      <div className="flex justify-between items-center max-w-6xl mx-auto">
        <Link href="/admin" className="inline-flex items-center gap-2 text-gray-500 hover:text-[#00529b] font-bold text-xs uppercase bg-white px-4 py-2 rounded-xl shadow-sm border transition-colors">
          <ArrowLeft size={16} /> Volver a Admin
        </Link>
        <h1 className="text-xl font-black text-gray-800 flex items-center gap-2 uppercase">
          <Search className="text-[#00529b]" size={24}/> Radar de Duplicados
        </h1>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex gap-3 text-amber-800 text-sm shadow-sm mb-6">
          <ShieldAlert className="shrink-0 text-amber-600" size={20} />
          <div>
            <p className="font-bold uppercase tracking-wide text-amber-900">Atención Operativa</p>
            <p className="mt-1 font-medium">El sistema ha detectado estas escuelas con nombres muy similares dentro del mismo circuito SITUR. Revisa bien el código de centro antes de eliminar para no borrar la que ya posee el reporte de inspección.</p>
          </div>
        </div>

        {duplicados.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border shadow-sm text-center">
            <Building2 className="mx-auto text-emerald-500 mb-4" size={48} />
            <h2 className="text-xl font-black text-gray-800 uppercase">¡Base de Datos Limpia!</h2>
            <p className="text-gray-500 font-medium mt-2">No se detectaron escuelas similares o duplicadas en el mismo circuito.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {duplicados.map((grupo, index) => (
              <div key={index} className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="bg-gray-100 px-6 py-3 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="bg-gray-800 text-white text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider">
                      SITUR: {grupo.situr}
                    </span>
                    <span className="text-xs font-bold text-gray-500 uppercase">Coincidencia: {grupo.nombreDetectado}</span>
                  </div>
                  <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-1 rounded-full uppercase">
                    {grupo.escuelas.length} Similares
                  </span>
                </div>
                
                <div className="divide-y divide-gray-100">
                  {grupo.escuelas.map((escuela: any, idx: number) => (
                    <div key={idx} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-gray-50 transition-colors">
                      <div>
                        <p className="text-sm font-black text-gray-800 uppercase">{escuela['NOMBRE CENTRO']}</p>
                        <p className="text-xs font-bold text-[#00529b] mt-1 font-mono">CÓDIGO: {escuela.COD_CENTRO}</p>
                      </div>
                      <button 
                        onClick={() => eliminarEscuela(escuela.COD_CENTRO)}
                        disabled={borrando === escuela.COD_CENTRO}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all shadow-sm
                          ${borrando === escuela.COD_CENTRO 
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                            : 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-100 hover:border-red-600'
                          }`}
                      >
                        <Trash2 size={16} /> 
                        {borrando === escuela.COD_CENTRO ? 'Borrando...' : 'Eliminar Escuela'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}