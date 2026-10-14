'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FileSpreadsheet, Upload, ArrowLeft, CheckCircle2, AlertCircle, Loader2, Database, Info } from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx';

export default function ImportarCentrosPage() {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [progreso, setProgreso] = useState({ actual: 0, total: 0 });
  const [resultado, setResultado] = useState<{
    insertados: number;
    actualizados: number;
    errores: number;
    mensajes: string[];
  } | null>(null);

  const manejarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setArchivo(e.target.files[0]);
      setResultado(null);
    }
  };

  const procesarExcel = async () => {
    if (!archivo) {
      alert("⚠️ Por favor selecciona un archivo Excel (.xlsx o .xls).");
      return;
    }

    setProcesando(true);
    setResultado(null);

    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        
        // Convertir hoja a JSON
        const dataJson: any[] = XLSX.utils.sheet_to_json(ws);

        if (!dataJson || dataJson.length === 0) {
          alert("⚠️ El archivo Excel está vacío o no contiene datos válidos.");
          setProcesando(false);
          return;
        }

        setProgreso({ actual: 0, total: dataJson.length });

        let insertadosCount = 0;
        let actualizadosCount = 0;
        let erroresCount = 0;
        const mensajesLog: string[] = [];

        // Procesar fila por fila o en pequeños lotes
        for (let i = 0; i < dataJson.length; i++) {
          const fila = dataJson[i];

          // Extracción y normalización de campos desde el XLSX
          const codCentroRaw = fila['COD CENTRO'] || fila['cod_centro'] || fila['COD_CENTRO'];
          const siturRaw = fila['CODIGO CIRCUITO COMUNAL'] || fila['codigo_situr'] || fila['SITUR'];
          const nombreCentroRaw = fila['NOMBRE CENTRO'] || fila['nombre_centro'];
          const direccionRaw = fila['DIRECCION'] || fila['direccion'];
          const municipioRaw = fila['MUNICIPIO'] || fila['municipio'] || '';
          const parroquiaRaw = fila['PARROQUIA'] || fila['parroquia'] || '';
          const circuitoRaw = fila['NOMBRE DE CIRCUITO COMUNAL'] || fila['circuito_comunal'] || '';
          const organismoRaw = fila['ORGANSIMOS'] || fila['ORGANISMO'] || fila['organismo'] || 'S/O';
          const jerarquiaRaw = fila['JERARQUIA'] || fila['funcionario_rango'] || '';
          const jefeRaw = fila['JEFE DE CUADRANTE'] || fila['funcionario_nombre'] || '';
          const telfRaw = fila['TELF CUADRANTE'] || fila['funcionario_telefono'] || 'S/N';

          if (!codCentroRaw || !nombreCentroRaw) {
            erroresCount++;
            mensajesLog.push(`Fila ${i + 2}: Omitida por falta de CNE o Nombre.`);
            continue;
          }

          const codCentroFinal = codCentroRaw.toString().trim().toUpperCase();
          const siturFinal = siturRaw ? siturRaw.toString().trim().toUpperCase() : 'N/A';
          const nombreFinal = nombreCentroRaw.toString().trim().toUpperCase();
          const direccionFinal = direccionRaw ? direccionRaw.toString().trim().toUpperCase() : 'DIRECCIÓN EN EVALUACIÓN';

          // Normalizar prefijo de municipio "MP."
          let muniUpper = municipioRaw.toString().trim().toUpperCase();
          if (muniUpper && !muniUpper.startsWith('MP.')) {
            muniUpper = `MP. ${muniUpper}`;
          }

          const funcionarioCompleto = `${jerarquiaRaw} ${jefeRaw}`.trim().toUpperCase();

          // 1. Verificar si ya existe un registro con este COD_CENTRO (Código CNE)
          const { data: registroExistente } = await supabase
            .from('centros_registrados_organismos')
            .select('id, estatus')
            .eq('cod_centro', codCentroFinal)
            .maybeSingle();

          const payload = {
            cod_centro: codCentroFinal,
            codigo_situr: siturFinal,
            nombre_centro: nombreFinal,
            direccion: direccionFinal,
            municipio: muniUpper || 'SIN MUNICIPIO',
            parroquia: parroquiaRaw.toString().trim().toUpperCase() || 'SIN PARROQUIA',
            circuito_comunal: circuitoRaw.toString().trim().toUpperCase() || 'SIN CIRCUITO',
            organismo: organismoRaw.toString().trim().toUpperCase(),
            funcionario_nombre: funcionarioCompleto || 'FUNCIONARIO NO ASIGNADO',
            funcionario_rango: jerarquiaRaw.toString().trim().toUpperCase() || 'Funcionario',
            funcionario_telefono: telfRaw.toString().trim().toUpperCase(),
            updated_at: new Date().toISOString()
          };

          if (registroExistente) {
            // ACTUALIZAR / CORREGIR DATOS
            const { error: errUpdate } = await supabase
              .from('centros_registrados_organismos')
              .update(payload)
              .eq('id', registroExistente.id);

            if (errUpdate) {
              erroresCount++;
              mensajesLog.push(`Error actualizando CNE ${codCentroFinal}: ${errUpdate.message}`);
            } else {
              actualizadosCount++;
            }
          } else {
            // INSERTAR NUEVO REGISTRO
            const { error: errInsert } = await supabase
              .from('centros_registrados_organismos')
              .insert([{ ...payload, estatus: 'PENDIENTE' }]);

            if (errInsert) {
              erroresCount++;
              mensajesLog.push(`Error insertando CNE ${codCentroFinal}: ${errInsert.message}`);
            } else {
              insertadosCount++;
            }
          }

          setProgreso({ actual: i + 1, total: dataJson.length });
        }

        setResultado({
          insertados: insertadosCount,
          actualizados: actualizadosCount,
          errores: erroresCount,
          mensajes: mensajesLog
        });

      } catch (error: any) {
        alert("Error crítico al procesar el archivo Excel: " + error.message);
      } finally {
        setProcesando(false);
      }
    };

    reader.readAsBinaryString(archivo);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* BOTÓN VOLVER */}
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-[#00529b] font-bold text-xs uppercase bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200 transition-colors w-fit">
          <ArrowLeft size={16} /> Volver al Menú
        </Link>

        {/* TÍTULO */}
        <div className="bg-gradient-to-r from-[#00529b] to-blue-900 p-6 rounded-3xl text-white shadow-md flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black uppercase flex items-center gap-2">
              <FileSpreadsheet size={28} /> Importación Masiva de Centros
            </h1>
            <p className="text-xs text-blue-100 mt-1 font-medium">
              Sincroniza y corrige el catálogo de escuelas subiendo la tabla oficial (.XLSX)
            </p>
          </div>
          <Database size={40} className="text-blue-300 opacity-50 hidden sm:block" />
        </div>

        {/* NOTA RELEVANTE SOBRE COD_CENTRO Y SITUR */}
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3 text-amber-800 text-xs font-medium">
          <Info size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold uppercase text-amber-900 mb-1">Regla de Sincronización (Código CNE vs SITUR):</p>
            <p>
              El sistema utilizará la columna <strong className="text-black">COD CENTRO (Código CNE)</strong> como identificador único. Si la escuela ya existe, <u>corregirá y actualizará todos sus datos</u>. Si no existe, la creará de forma completa. El <strong>Código SITUR</strong> se almacenará en su campo correspondiente sin interferir con el código centro.
            </p>
          </div>
        </div>

        {/* CUADRO DE CARGA DE ARCHIVO */}
        <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6 text-center">
          <div className="border-2 border-dashed border-gray-300 hover:border-[#00529b] p-8 rounded-2xl transition-colors bg-gray-50/50 flex flex-col items-center justify-center">
            <Upload size={48} className="text-[#00529b] mb-3 opacity-80" />
            <p className="font-bold text-gray-700 text-sm mb-1">Selecciona o arrastra el archivo Excel (.xlsx)</p>
            <p className="text-xs text-gray-400 mb-4">Asegúrate de subir la tabla oficial de patrullaje o consulta popular</p>

            <input 
              type="file" 
              accept=".xlsx, .xls"
              onChange={manejarArchivo}
              disabled={procesando}
              className="hidden" 
              id="fileInputExcel"
            />
            <label 
              htmlFor="fileInputExcel"
              className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase cursor-pointer transition-all shadow-sm ${archivo ? 'bg-emerald-600 text-white' : 'bg-[#00529b] text-white hover:bg-[#003d73]'}`}
            >
              {archivo ? `Archivo: ${archivo.name}` : 'Examinar Archivo'}
            </label>
          </div>

          {/* BARRA DE PROGRESO */}
          {procesando && (
            <div className="space-y-2 bg-blue-50 p-4 rounded-2xl border border-blue-100">
              <div className="flex justify-between items-center text-xs font-black text-[#00529b] uppercase">
                <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Procesando filas...</span>
                <span>{progreso.actual} / {progreso.total}</span>
              </div>
              <div className="w-full bg-blue-200 h-3 rounded-full overflow-hidden">
                <div 
                  className="bg-[#00529b] h-full transition-all duration-200"
                  style={{ width: `${(progreso.actual / (progreso.total || 1)) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* BOTÓN PROCESAR */}
          <button
            onClick={procesarExcel}
            disabled={!archivo || procesando}
            className="w-full py-4 rounded-2xl font-black text-xs uppercase transition-all shadow-md flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {procesando ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Sincronizando con Supabase...
              </>
            ) : (
              <>
                <CheckCircle2 size={18} /> Iniciar Carga y Corrección Masiva
              </>
            )}
          </button>
        </div>

        {/* RESUMEN DE RESULTADOS */}
        {resultado && (
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="text-base font-black text-gray-800 uppercase flex items-center gap-2">
              <CheckCircle2 size={20} className="text-emerald-600" /> Resumen del Proceso
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-center">
                <p className="text-[10px] font-bold text-emerald-600 uppercase">Centros Nuevos Insertados</p>
                <p className="text-2xl font-black text-emerald-800 mt-1">{resultado.insertados}</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl text-center">
                <p className="text-[10px] font-bold text-[#00529b] uppercase">Centros Corregidos / Actualizados</p>
                <p className="text-2xl font-black text-[#00529b] mt-1">{resultado.actualizados}</p>
              </div>

              <div className="bg-red-50 border border-red-200 p-4 rounded-2xl text-center">
                <p className="text-[10px] font-bold text-red-600 uppercase">Filas con Error / Omitidas</p>
                <p className="text-2xl font-black text-red-800 mt-1">{resultado.errores}</p>
              </div>
            </div>

            {resultado.mensajes.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl space-y-1 max-h-40 overflow-y-auto">
                <p className="text-[10px] font-black text-gray-500 uppercase mb-2">Detalles del reporte:</p>
                {resultado.mensajes.map((msg, idx) => (
                  <p key={idx} className="text-[11px] font-mono text-red-600 flex items-center gap-1">
                    <AlertCircle size={12} /> {msg}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
