'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx';

export default function ImportarEscuelasPage() {
  const [loading, setLoading] = useState(false);
  const [progreso, setProgreso] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setProgreso('Leyendo archivo (Excel o CSV)...');

    const reader = new FileReader();
    
    // Usamos readAsArrayBuffer para soportar perfectamente tanto .xlsx, .xls como .csv sin errores de codificación
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convertir la hoja de Excel/CSV a un arreglo de objetos JSON
        const rows: any[] = XLSX.utils.sheet_to_json(sheet);

        if (!rows || rows.length === 0) {
          throw new Error("El archivo está vacío o no tiene un formato válido.");
        }

        setProgreso(`Procesando ${rows.length} registros... Preparando inserción.`);

        // Mapear los datos asegurándonos de que coincidan con las columnas de Supabase
        const registrosParaSubir = rows.map((row) => ({
          "ESTADO": row["ESTADO"] || "FALCÓN",
          "MUNICIPIO": row["MUNICIPIO"] || "",
          "PARROQUIA": row["PARROQUIA"] || "",
          "COD_CENTRO": String(row["COD CENTRO"] || row["COD_CENTRO"] || "").trim(),
          "NOMBRE CENTRO": row["NOMBRE CENTRO"] || row["NOMBRE_CENTRO"] || "",
          "DIRECCION": row["DIRECCION"] || "DIRECCIÓN EN EVALUACIÓN",
          "CODIGO_COMUNA_CNE": row["CODIGO COMUNA CNE"] || row["CODIGO_COMUNA_CNE"] || "",
          "CODIGO_CIRCUITO_COMUNAL": row["CODIGO CIRCUITO COMUNAL"] || row["CODIGO_CIRCUITO_COMUNAL"] || "",
          "NOMBRE_CIRCUITO_COMUNAL": row["NOMBRE DE CIRCUITO COMUNAL"] || row["NOMBRE_CIRCUITO_COMUNAL"] || "",
          "MESA": String(row["MESA"] || "1"),
          "ORGANISMOS": row["ORGANISMOS"] || "",
          "TELF_CUADRANTE": String(row["TELF CUADRANTE"] || row["TELF_CUADRANTE"] || ""),
          "JERARQUIA": row["JERARQUIA"] || "",
          "JEFE_CUADRANTE": row["JEFE DE CUADRANTE"] || "",
          "CEDULA": String(row["CEDULA"] || "")
        }));

        // Insertar por lotes de 500 registros para evitar sobrecargar Supabase
        const tamanoLote = 500;
        let insertadosTotal = 0;

        for (let i = 0; i < registrosParaSubir.length; i += tamanoLote) {
          const lote = registrosParaSubir.slice(i, i + tamanoLote);
          setProgreso(`Subiendo lote ${Math.floor(i / tamanoLote) + 1} de ${Math.ceil(registrosParaSubir.length / tamanoLote)}...`);

          const { error } = await supabase.from('centros_votacion_2026').insert(lote);
          if (error) throw error;

          insertadosTotal += lote.length;
        }

        setSuccessMsg(`¡Importación completada con éxito! Se cargaron ${insertadosTotal} centros/escuelas en la base de datos.`);
      } catch (err: any) {
        setErrorMsg("Error al procesar el archivo: " + err.message);
      } finally {
        setLoading(false);
        setProgreso('');
      }
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center justify-center">
      <div className="max-w-xl w-full space-y-4">
        
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-[#00529b] font-bold text-xs uppercase bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200 transition-colors">
          <ArrowLeft size={16} /> Volver al Panel Admin
        </Link>

        <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-200 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-blue-50 text-[#00529b] rounded-2xl flex items-center justify-center shadow-inner">
            <FileSpreadsheet size= {32} />
          </div>

          <div>
            <h1 className="text-xl font-black text-gray-800 uppercase">Carga Masiva de Centros y Planteles</h1>
            <p className="text-xs text-gray-500 font-medium mt-1">Sube tu archivo en formato Excel (.xlsx, .xls) o CSV</p>
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle size={18} className="shrink-0" /> <p>{errorMsg}</p>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 size={18} className="shrink-0" /> <p>{successMsg}</p>
            </div>
          )}

          {loading ? (
            <div className="bg-blue-50 border border-blue-200 p-6 rounded-2xl flex flex-col items-center justify-center space-y-2">
              <Loader2 className="animate-spin text-[#00529b]" size={32} />
              <p className="text-xs font-black text-[#00529b]">{progreso}</p>
            </div>
          ) : (
            <label className="border-2 border-dashed border-gray-300 hover:border-[#00529b] bg-gray-50 hover:bg-blue-50/20 p-8 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all group">
              <Upload className="w-10 h-10 text-gray-400 group-hover:text-[#00529b] mb-3 transition-colors" />
              <span className="text-sm font-black text-gray-700 group-hover:text-[#00529b] uppercase">Haga clic para seleccionar el archivo</span>
              <span className="text-[10px] text-gray-400 mt-1">Formatos compatibles: .xlsx, .xls, .csv</span>
              <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="hidden" />
            </label>
          )}

          <div className="text-[11px] text-gray-400 font-medium border-t pt-4">
            Sistema de Operaciones - VEN 911 Falcón
          </div>
        </div>
      </div>
    </div>
  );
}
