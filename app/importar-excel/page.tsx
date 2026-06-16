'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Papa from 'papaparse';
import { FileUp, Loader2, CheckCircle2, AlertTriangle, Database } from 'lucide-react';

export default function ImportarCSVPage() {
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [tipoMsj, setTipoMsj] = useState<'info'|'success'|'error'>('info');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setTipoMsj('info');
    setMensaje("Analizando estructura del archivo CSV...");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        setMensaje(`Mapeando ${results.data.length} filas al sistema...`);
        
        const datosParaBD = results.data
          .filter((row: any) => row['CODIGO SITUR'])
          .map((row: any) => ({
            n_registro: row['N°'],
            estado: row['ESTADO'],
            municipio: row['MUNICIPIO'],
            parroquia: row['PARROQUIA'],
            codigo_situr: row['CODIGO SITUR'],
            comuna_o_circuito: row['COMUNA O CIRCUITO COMUNAL'],
            consejos_comunales: row['CONSEJOS COMUNALES'],
            sectores: row['SECTORES'],
            cuadrante: row['CUADRANTE'],
            telefono_cuadrante: row['NUMERO TELEFONICO CUADRANTE'],
            organismo_responsable: row['ORGANISMO RESPONSABLE'],
            grado_jerarquia_jefe: row['GRADO O JERARQUIA JEFE CUADRANTE'],
            nombre_apellido_jefe: row['NOMBRES Y APELLIDOS JEFE CUADRANTE'],
            cedula_jefe: String(row['CEDULA DE IDENTIDAD JEFE CUADRANTE']),
            telefono_celular_jefe: String(row['TELEFONO CELULAR JEFE CUADRANTE']),
            observaciones: row['OBSERVACIONES'],
            grado_jerarquia_auxiliar: row['GRADO O JERARQUIA AUXILIARES JEFE DE CUADRATES GNB'],
            nombres_apellidos_auxiliar: row['AUXILIARES JEFE DE CUADRATES GNB'],
            cedula_auxiliar: String(row['CEDULA']),
            telefono_celular_auxiliar: String(row['TELEFONO CELULAR DEL AUXILIAR JEFE CUADRANTE']),
            email: `cuadrante.${row['CODIGO SITUR']}@cupaz.gob.ve`.toLowerCase(),
            rol: 'usuario'
          }));

        const { error } = await supabase.from('directorio_operativo').insert(datosParaBD);

        if (error) {
          setTipoMsj('error');
          setMensaje(`Fallo en la inyección de datos: ${error.message}`);
        } else {
          setTipoMsj('success');
          setMensaje(`¡MIGRACIÓN COMPLETA! Se sincronizaron ${datosParaBD.length} perfiles operativos con éxito.`);
        }
        setLoading(false);
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5] p-6">
      <div className="bg-white p-10 sm:p-12 rounded-[2rem] shadow-xl w-full max-w-xl text-center space-y-6 border border-gray-100">
        
        <div className="flex justify-center mb-2">
          <div className="bg-blue-50 p-4 rounded-full text-[#00529b]">
            <Database size={48} />
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Migración Masiva CSV</h2>
          <p className="text-gray-500 font-medium text-sm mt-2">Herramienta técnica de respaldo para inyección de datos planos (Legacy).</p>
        </div>
        
        <div className="relative group mt-8">
          <div className="absolute inset-0 bg-blue-50 border-2 border-dashed border-blue-200 rounded-2xl group-hover:bg-blue-100 transition-colors"></div>
          <label className="relative flex flex-col items-center justify-center w-full p-10 cursor-pointer">
            <FileUp size={36} className="text-[#00529b] mb-3" />
            <span className="font-bold text-[#00529b]">Seleccionar archivo CSV</span>
            <span className="text-xs text-gray-500 mt-1">.csv delimitado por comas</span>
            <input 
              type="file" accept=".csv"
              onChange={handleFileUpload} disabled={loading}
              className="hidden"
            />
          </label>
        </div>

        {mensaje && (
          <div className={`mt-6 p-4 rounded-xl text-sm font-bold flex items-start gap-3 text-left ${
            tipoMsj === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
            tipoMsj === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
            'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            {loading ? <Loader2 size={18} className="animate-spin shrink-0 mt-0.5" /> : 
             tipoMsj === 'error' ? <AlertTriangle size={18} className="shrink-0 mt-0.5" /> : 
             <CheckCircle2 size={18} className="shrink-0 mt-0.5" />}
            <p className="leading-relaxed">{mensaje}</p>
          </div>
        )}
      </div>
    </div>
  );
}