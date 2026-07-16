'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash2, AlertTriangle, Search, ArrowLeft, Building2, ShieldAlert, Crosshair } from 'lucide-react';
import Link from 'next/link';

// 1. Algoritmo de limpieza ULTRA agresiva
function limpiarNombre(text: string) {
  if (!text) return "";
  let t = text.toUpperCase();
  // Quitar acentos
  t = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // Quitar todos los signos de puntuación (puntos, comas, guiones, etc)
  t = t.replace(/[^\w\s]/g, ' ');
  
  // Normalizar prefijos (E.B, U.E, C.E.I)
  t = t.replace(/\b(ESCUELA BASICA|E B |EB)\b/g, 'EB ');
  t = t.replace(/\b(UNIDAD EDUCATIVA|U E |UE)\b/g, 'UE ');
  t = t.replace(/\b(CENTRO DE EDUCACION INICIAL|C E I |CEI)\b/g, 'CEI ');
  t = t.replace(/\b(ESCUELA PRIMARIA NACIONAL|E P N |EPN)\b/g, 'EPN ');
  t = t.replace(/\b(ESCUELA PRIMARIA BOLIVARIANA|E P B |EPB)\b/g, 'EPB ');
  t = t.replace(/\b(ESCUELA PRIMARIA|E P |EP)\b/g, 'EP ');
  t = t.replace(/\b(LICEO NACIONAL|L N |LN)\b/g, 'LN ');
  t = t.replace(/\b(CENTRO DE EDUCACION INICIAL SIMONCITO|C E I S |CEIS)\b/g, 'CEIS ');
  
  // OMITIR conectores y palabras basura para ir directo al grano
  t = t.replace(/\b(DE|LA|LAS|EL|LOS|Y|EN|DEL)\b/g, ' ');

  // Quitar espacios extra
  return t.replace(/\s+/g, ' ').trim();
}

// 2. Algoritmo Matemático de Similitud (Distancia de Levenshtein)
function calcularSimilitud(a: string, b: string) {
  if (a.length === 0) return b.length === 0 ? 100 : 0;
  if (b.length === 0) return 0;
  
  const matrix = [];
  for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
  for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // Sustitución
          Math.min(matrix[i][j - 1] + 1, // Inserción
                   matrix[i - 1][j] + 1) // Eliminación
        );
      }
    }
  }
  
  const distancia = matrix[b.length][a.length];
  const longitudMax = Math.max(a.length, b.length);
  return ((longitudMax - distancia) / longitudMax) * 100;
}

export default function LimpiadorEscuelasPage() {
  const [duplicados, setDuplicados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [borrando, setBorrrando] = useState<string | null>(null);

  const cargarDatos = async () => {
    setLoading(true);
    const { data: escuelas, error } = await supabase.from('centros_votacion_2026').select('*');
    
    if (escuelas && !error) {
      const gruposPorSitur: Record<string, any[]> = {};
      
      // Agrupar agresivamente
      escuelas.forEach(c => {
        const situr = c.CODIGO_CIRCUITO_COMUNAL?.trim() || 'SIN_SITUR';
        const nombreLimpio = limpiarNombre(c['NOMBRE CENTRO']);
        
        if (!gruposPorSitur[situr]) gruposPorSitur[situr] = [];
        
        let encontrado = false;
        for (let grupo of gruposPorSitur[situr]) {
          // AQUI ESTA LA MAGIA: Si se parece en un 80% o más, lo atrapa como duplicado
          const similitud = calcularSimilitud(grupo.nombreRepresentativo, nombreLimpio);
          
          if (similitud >= 80) { 
            grupo.escuelas.push(c);
            encontrado = true;
            break;
          }
        }
        
        if (!encontrado) {
          gruposPorSitur[situr].push({
            nombreRepresentativo: nombreLimpio,
            escuelas: [c]
          });
        }
      });

      // Extraer solo los grupos que atraparon 2 o más escuelas
      const repetidos: any[] = [];
      for (const situr in gruposPorSitur) {
        for (const grupo of gruposPorSitur[situr]) {
          if (grupo.escuelas.length > 1) {
            repetidos.push({
              situr: situr,
              nombreDetectado: grupo.nombreRepresentativo,
              escuelas: grupo.escuelas
            });
          }
        }
      }

      setDuplicados(repetidos);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const eliminarEscuela = async (codCentro: string) => {
    const confirmar = window.confirm(`ATENCIÓN: ¿Estás seguro de eliminar la escuela CÓDIGO ${codCentro}?\n\nRecuerda revisar que no estés borrando la escuela que ya tiene el reporte del funcionario.`);
    if (!confirmar) return;

    setBorrrando(codCentro);
    const { error } = await supabase
      .from('centros_votacion_2026')
      .delete()
      .eq('COD_CENTRO', codCentro);

    if (!error) {
      alert(`✅ Escuela ${codCentro} eliminada con éxito del sistema.`);
      cargarDatos();
    } else {
      alert(`Error al eliminar: ${error.message}`);
    }
    setBorrrando(null);
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center space-y-4">
      <Crosshair className="text-[#00529b] animate-spin" size={48} />
      <p className="font-black text-[#00529b] uppercase tracking-widest text-sm">Escaneo Agresivo en progreso...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      <div className="flex justify-between items-center max-w-6xl mx-auto">
        <Link href="/admin" className="inline-flex items-center gap-2 text-gray-500 hover:text-[#00529b] font-bold text-xs uppercase bg-white px-4 py-2 rounded-xl shadow-sm border transition-colors">
          <ArrowLeft size={16} /> Volver a Admin
        </Link>
        <h1 className="text-xl font-black text-gray-800 flex items-center gap-2 uppercase">
          <Crosshair className="text-red-600" size={24}/> Radar Agresivo
        </h1>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex gap-3 text-red-800 text-sm shadow-sm mb-6">
          <ShieldAlert className="shrink-0 text-red-600" size={20} />
          <div>
            <p className="font-bold uppercase tracking-wide text-red-900">Modo de Alta Sensibilidad Activado</p>
            <p className="mt-1 font-medium">El algoritmo está agrupando escuelas que tienen un 80% o más de coincidencia en sus letras, ignorando puntos, comas, acentos y conectores. Mucho cuidado al eliminar.</p>
          </div>
        </div>

        {duplicados.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border shadow-sm text-center">
            <Building2 className="mx-auto text-emerald-500 mb-4" size={48} />
            <h2 className="text-xl font-black text-gray-800 uppercase">¡Base de Datos Impecable!</h2>
            <p className="text-gray-500 font-medium mt-2">Ni siquiera el escaneo agresivo encontró escuelas parecidas.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {duplicados.map((grupo, index) => (
              <div key={index} className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-md">
                <div className="bg-gray-800 px-6 py-3 border-b border-gray-700 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-sm uppercase tracking-wider">
                      SITUR: {grupo.situr}
                    </span>
                    <span className="text-xs font-bold text-gray-300 uppercase">Patrón Detectado: <span className="text-white">{grupo.nombreDetectado}</span></span>
                  </div>
                  <span className="text-[10px] font-bold bg-white/20 text-white px-3 py-1 rounded-full uppercase">
                    {grupo.escuelas.length} Coincidencias
                  </span>
                </div>
                
                <div className="divide-y divide-gray-100">
                  {grupo.escuelas.map((escuela: any, idx: number) => (
                    <div key={idx} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-red-50/50 transition-colors">
                      <div>
                        <p className="text-sm font-black text-gray-900 uppercase">{escuela['NOMBRE CENTRO']}</p>
                        <p className="text-xs font-bold text-[#00529b] mt-1 font-mono">CÓDIGO: {escuela.COD_CENTRO}</p>
                      </div>
                      <button 
                        onClick={() => eliminarEscuela(escuela.COD_CENTRO)}
                        disabled={borrando === escuela.COD_CENTRO}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all shadow-sm shrink-0
                          ${borrando === escuela.COD_CENTRO 
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                            : 'bg-white text-red-600 hover:bg-red-600 hover:text-white border-2 border-red-200 hover:border-red-600'
                          }`}
                      >
                        <Trash2 size={16} /> 
                        {borrando === escuela.COD_CENTRO ? 'Destruyendo...' : 'Eliminar Registro'}
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
