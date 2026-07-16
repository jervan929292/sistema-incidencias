'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash2, Edit2, Search, ArrowLeft, Building2, ShieldAlert, Crosshair, Lock, Unlock, X, Save, Download, Upload } from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx';

// Algoritmo de limpieza ULTRA agresiva
function limpiarNombre(text: string | null | undefined) {
  if (!text) return "";
  let t = String(text).toUpperCase();
  t = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  t = t.replace(/[^\w\s]/g, ' ');
  t = t.replace(/\b(ESCUELA BASICA|E B |EB)\b/g, 'EB ');
  t = t.replace(/\b(UNIDAD EDUCATIVA|U E |UE)\b/g, 'UE ');
  t = t.replace(/\b(CENTRO DE EDUCACION INICIAL|C E I |CEI)\b/g, 'CEI ');
  t = t.replace(/\b(ESCUELA PRIMARIA NACIONAL|E P N |EPN)\b/g, 'EPN ');
  t = t.replace(/\b(ESCUELA PRIMARIA BOLIVARIANA|E P B |EPB)\b/g, 'EPB ');
  t = t.replace(/\b(ESCUELA PRIMARIA|E P |EP)\b/g, 'EP ');
  t = t.replace(/\b(LICEO NACIONAL|L N |LN)\b/g, 'LN ');
  t = t.replace(/\b(CENTRO DE EDUCACION INICIAL SIMONCITO|C E I S |CEIS)\b/g, 'CEIS ');
  t = t.replace(/\b(DE|LA|LAS|EL|LOS|Y|EN|DEL)\b/g, ' ');
  return t.replace(/\s+/g, ' ').trim();
}

// Algoritmo Matemático de Similitud
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
          matrix[i - 1][j - 1] + 1, 
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1) 
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
  const [procesando, setProcesando] = useState<string | null>(null);
  
  // Referencia y estado para el Excel
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  
  // Estados para el Modal de Edición
  const [escuelaEdit, setEscuelaEdit] = useState<any | null>(null);
  const [formEdit, setFormEdit] = useState({ nombre: '', cod_centro: '', situr: '', direccion: '' });
  const [desbloquearSitur, setDesbloquearSitur] = useState(false);

  const cargarDatos = async () => {
    setLoading(true);
    const { data: escuelas, error } = await supabase.from('centros_votacion_2026').select('*');
    
    if (escuelas && !error) {
      const gruposPorSitur: Record<string, any[]> = {};
      
      escuelas.forEach(c => {
        const situr = c.CODIGO_CIRCUITO_COMUNAL?.trim() || 'SIN_SITUR';
        const nombreLimpio = limpiarNombre(c['NOMBRE CENTRO']);
        
        // 1. Atrapa escuelas en blanco (Fantasmas)
        if (nombreLimpio === '' || nombreLimpio.includes('NO POSEE CENTROS EDUCATIVOS')) {
          if (!gruposPorSitur['SIN_NOMBRE_O_VACIAS']) gruposPorSitur['SIN_NOMBRE_O_VACIAS'] = [{ nombreRepresentativo: '⚠️ PLANTEL SIN NOMBRE O NO POSEE CENTROS', escuelas: [] }];
          gruposPorSitur['SIN_NOMBRE_O_VACIAS'][0].escuelas.push(c);
          return; // Saltamos la validación de similitud
        }

        // 2. Validación normal de similitud
        if (!gruposPorSitur[situr]) gruposPorSitur[situr] = [];
        let encontrado = false;
        
        for (let grupo of gruposPorSitur[situr]) {
          const similitud = calcularSimilitud(grupo.nombreRepresentativo, nombreLimpio);
          if (similitud >= 80) { 
            grupo.escuelas.push(c);
            encontrado = true;
            break;
          }
        }
        if (!encontrado) {
          gruposPorSitur[situr].push({ nombreRepresentativo: nombreLimpio, escuelas: [c] });
        }
      });

      const repetidos: any[] = [];
      for (const situr in gruposPorSitur) {
        for (const grupo of gruposPorSitur[situr]) {
          // Mostrar si hay duplicados OR si es el grupo de escuelas sin nombre
          if (grupo.escuelas.length > 1 || situr === 'SIN_NOMBRE_O_VACIAS') {
            repetidos.push({
              situr: situr === 'SIN_NOMBRE_O_VACIAS' ? 'MÚLTIPLES' : situr,
              nombreDetectado: grupo.nombreRepresentativo,
              escuelas: grupo.escuelas,
              esFantasma: situr === 'SIN_NOMBRE_O_VACIAS'
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

  // --- LOGICA PARA DESCARGAR EXCEL ---
  const descargarExcel = () => {
    const datosPlanos: any[] = [];
    duplicados.forEach(grupo => {
      grupo.escuelas.forEach((esc: any) => {
        datosPlanos.push({
          'COD_CENTRO': esc.COD_CENTRO,
          'NOMBRE CENTRO': esc['NOMBRE CENTRO'],
          'CODIGO_CIRCUITO_COMUNAL': esc.CODIGO_CIRCUITO_COMUNAL,
          'DIRECCION': esc.DIRECCION,
          'TIPO_PROBLEMA': grupo.esFantasma ? 'FANTASMA / SIN CENTRO' : 'POSIBLE DUPLICADO'
        });
      });
    });

    if (datosPlanos.length === 0) {
      alert("No hay escuelas con problemas para descargar.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(datosPlanos);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Escuelas_Para_Corregir");
    XLSX.writeFile(workbook, "Reporte_Escuelas_A_Corregir.xlsx");
  };

  // --- LOGICA PARA CARGAR EXCEL Y ACTUALIZAR ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmar = window.confirm("¿Estás seguro de cargar este archivo?\n\nEl sistema actualizará los nombres, SITUR y dirección en la base de datos basándose en la columna COD_CENTRO.");
    if (!confirmar) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

        let actualizados = 0;
        let errores = 0;

        for (const row of rows) {
          const codCentro = row['COD_CENTRO'];
          if (!codCentro) continue;

          const updateData = {
            'NOMBRE CENTRO': row['NOMBRE CENTRO'] ? String(row['NOMBRE CENTRO']).toUpperCase() : '',
            'CODIGO_CIRCUITO_COMUNAL': row['CODIGO_CIRCUITO_COMUNAL'] ? String(row['CODIGO_CIRCUITO_COMUNAL']).trim() : null,
            'DIRECCION': row['DIRECCION'] ? String(row['DIRECCION']).toUpperCase() : 'DIRECCIÓN EN EVALUACIÓN'
          };

          const { error } = await supabase
            .from('centros_votacion_2026')
            .update(updateData)
            .eq('COD_CENTRO', codCentro);

          if (error) {
            console.error("Error actualizando", codCentro, error);
            errores++;
          } else {
            actualizados++;
          }
        }

        alert(`✅ PROCESO FINALIZADO\n\nEscuelas actualizadas: ${actualizados}\nErrores: ${errores}`);
        cargarDatos();
      } catch (err) {
        console.error(err);
        alert("Ocurrió un error al leer el archivo Excel. Asegúrate de que tenga el formato correcto.");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const eliminarEscuela = async (codCentro: string) => {
    const confirmar = window.confirm(`ATENCIÓN: ¿Estás seguro de eliminar la escuela CÓDIGO ${codCentro}?`);
    if (!confirmar) return;

    setProcesando(codCentro);
    const { error } = await supabase.from('centros_votacion_2026').delete().eq('COD_CENTRO', codCentro);
    if (!error) {
      alert(`✅ Escuela eliminada con éxito.`);
      cargarDatos();
    } else {
      alert(`Error al eliminar: ${error.message}`);
    }
    setProcesando(null);
  };

  const abrirModalEdicion = (escuela: any) => {
    setEscuelaEdit(escuela);
    setFormEdit({
      nombre: escuela['NOMBRE CENTRO'] || '',
      cod_centro: escuela.COD_CENTRO || '',
      situr: escuela.CODIGO_CIRCUITO_COMUNAL || '',
      direccion: escuela.DIRECCION || ''
    });
    setDesbloquearSitur(false); 
  };

  const guardarCambios = async () => {
    if (!formEdit.nombre || !formEdit.cod_centro) {
      alert("El nombre y el CNE son obligatorios.");
      return;
    }
    
    setProcesando('guardando');
    const { error } = await supabase.from('centros_votacion_2026')
      .update({
        'NOMBRE CENTRO': formEdit.nombre.toUpperCase(),
        'COD_CENTRO': formEdit.cod_centro,
        'CODIGO_CIRCUITO_COMUNAL': formEdit.situr,
        'DIRECCION': formEdit.direccion.toUpperCase()
      })
      .eq('COD_CENTRO', escuelaEdit.COD_CENTRO); 

    if (!error) {
      alert("✅ Escuela actualizada perfectamente.");
      setEscuelaEdit(null);
      cargarDatos();
    } else {
      alert(`Error al actualizar: ${error.message}`);
    }
    setProcesando(null);
  };

  if (loading || uploading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center space-y-4">
      <Crosshair className={`text-[#00529b] ${uploading ? 'animate-bounce' : 'animate-spin'}`} size={48} />
      <p className="font-black text-[#00529b] uppercase tracking-widest text-sm text-center px-4">
        {uploading ? 'PROCESANDO EXCEL Y ACTUALIZANDO BASE DE DATOS...' : 'Escaneo Agresivo en progreso...'}
      </p>
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

      {/* BOTONES DE EXCEL */}
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4">
        <button 
          onClick={descargarExcel}
          className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-4 rounded-2xl font-black uppercase text-sm shadow-md transition-all active:scale-[0.98]"
        >
          <Download size={20} /> 1. Descargar XLSX a Corregir
        </button>
        
        <label className="flex-1 flex items-center justify-center gap-2 bg-[#00529b] hover:bg-blue-800 text-white px-4 py-4 rounded-2xl font-black uppercase text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer">
          <Upload size={20} /> 2. Cargar XLSX Corregido
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload} 
          />
        </label>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        {duplicados.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border shadow-sm text-center">
            <Building2 className="mx-auto text-emerald-500 mb-4" size={48} />
            <h2 className="text-xl font-black text-gray-800 uppercase">¡Base de Datos Impecable!</h2>
            <p className="text-gray-500 font-medium mt-2">No hay escuelas repetidas ni registros en blanco.</p>
          </div>
        ) : (
          duplicados.map((grupo, index) => (
            <div key={index} className={`bg-white rounded-3xl border overflow-hidden shadow-md ${grupo.esFantasma ? 'border-amber-400' : 'border-gray-200'}`}>
              <div className={`px-6 py-3 border-b flex flex-wrap items-center justify-between gap-2 ${grupo.esFantasma ? 'bg-amber-100 border-amber-200' : 'bg-gray-800 border-gray-700'}`}>
                <div className="flex items-center gap-3">
                  <span className={`${grupo.esFantasma ? 'bg-amber-500' : 'bg-red-600'} text-white text-[10px] font-black px-2 py-1 rounded shadow-sm uppercase tracking-wider`}>
                    SITUR: {grupo.situr}
                  </span>
                  <span className={`text-xs font-bold uppercase ${grupo.esFantasma ? 'text-amber-900' : 'text-gray-300'}`}>
                    {grupo.esFantasma ? 'Alerta:' : 'Patrón Detectado:'} <span className={grupo.esFantasma ? 'text-amber-900 font-black' : 'text-white'}>{grupo.nombreDetectado}</span>
                  </span>
                </div>
                <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase ${grupo.esFantasma ? 'bg-amber-200 text-amber-800' : 'bg-white/20 text-white'}`}>
                  {grupo.escuelas.length} Registros
                </span>
              </div>
              
              <div className="divide-y divide-gray-100">
                {grupo.escuelas.map((escuela: any, idx: number) => (
                  <div key={idx} className="p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-black text-gray-900 uppercase">{escuela['NOMBRE CENTRO'] || '— EN BLANCO —'}</p>
                      <p className="text-xs font-bold text-[#00529b] mt-1 font-mono">CNE: {escuela.COD_CENTRO} <span className="text-gray-400 mx-2">|</span> SITUR: {escuela.CODIGO_CIRCUITO_COMUNAL || 'N/A'}</p>
                    </div>
                    <div className="flex gap-2 w-full lg:w-auto">
                      <button 
                        onClick={() => abrirModalEdicion(escuela)}
                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all shadow-sm bg-blue-50 text-[#00529b] hover:bg-[#00529b] hover:text-white border-2 border-blue-100 hover:border-[#00529b]"
                      >
                        <Edit2 size={16} /> Editar Todo
                      </button>
                      <button 
                        onClick={() => eliminarEscuela(escuela.COD_CENTRO)}
                        disabled={procesando === escuela.COD_CENTRO}
                        className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all shadow-sm ${procesando === escuela.COD_CENTRO ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-white text-red-600 hover:bg-red-600 hover:text-white border-2 border-red-200 hover:border-red-600'}`}
                      >
                        <Trash2 size={16} /> {procesando === escuela.COD_CENTRO ? '...' : 'Eliminar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL DE EDICIÓN TOTAL */}
      {escuelaEdit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="bg-[#00529b] p-4 flex justify-between items-center text-white">
              <h2 className="font-black uppercase flex items-center gap-2"><Edit2 size={18}/> Editar Plantel</h2>
              <button onClick={() => setEscuelaEdit(null)} className="hover:bg-white/20 p-1 rounded-full transition-colors"><X size={20}/></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Nombre del Plantel</label>
                <input 
                  type="text" 
                  value={formEdit.nombre} 
                  onChange={e => setFormEdit({...formEdit, nombre: e.target.value})}
                  className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm font-bold text-gray-800 focus:border-[#00529b] focus:ring-0 outline-none uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-500">Código CNE</label>
                  <input 
                    type="text" 
                    value={formEdit.cod_centro} 
                    onChange={e => setFormEdit({...formEdit, cod_centro: e.target.value})}
                    className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm font-bold text-gray-800 focus:border-[#00529b] focus:ring-0 outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-500 flex justify-between items-center">
                    Cód. SITUR
                    <button 
                      onClick={() => setDesbloquearSitur(!desbloquearSitur)}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] ${desbloquearSitur ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                      title="Haz clic para permitir modificar el SITUR"
                    >
                      {desbloquearSitur ? <Unlock size={10}/> : <Lock size={10}/>} {desbloquearSitur ? 'Modificable' : 'Bloqueado'}
                    </button>
                  </label>
                  <input 
                    type="text" 
                    disabled={!desbloquearSitur}
                    value={formEdit.situr} 
                    onChange={e => setFormEdit({...formEdit, situr: e.target.value})}
                    className={`w-full border-2 rounded-xl p-3 text-sm font-bold font-mono outline-none transition-colors
                      ${desbloquearSitur ? 'border-amber-400 bg-white text-gray-800 focus:border-[#00529b]' : 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed'}
                    `}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Dirección</label>
                <textarea 
                  rows={2}
                  value={formEdit.direccion} 
                  onChange={e => setFormEdit({...formEdit, direccion: e.target.value})}
                  className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm font-bold text-gray-800 focus:border-[#00529b] focus:ring-0 outline-none uppercase resize-none"
                />
              </div>

              <button 
                onClick={guardarCambios}
                disabled={procesando === 'guardando'}
                className="w-full bg-[#00529b] hover:bg-blue-800 text-white font-black uppercase text-sm py-3.5 rounded-xl mt-4 flex justify-center items-center gap-2 shadow-md transition-all"
              >
                <Save size={18}/> {procesando === 'guardando' ? 'Guardando cambios...' : 'Guardar Cambios Oficiales'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
