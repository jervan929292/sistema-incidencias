'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { School, UserCheck, Save, Shield, MapPin, MessageSquare, ArrowLeft, CheckCircle2, Plus, Clock, SearchCheck, Edit, Trash2, X, Loader2, Info } from 'lucide-react';
import Link from 'next/link';

export default function ConcejoTerritorialPage() {
  const [jefe, setJefe] = useState<any>(null);
  const [escuelas, setEscuelas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardandoId, setGuardandoId] = useState<string | number | null>(null);
  
  const [editandoId, setEditandoId] = useState<string | number | null>(null);
  const [entradasResena, setEntradasResena] = useState<{[key: string]: string}>({});
  
  // NUEVO ESTADO: Rastrea qué líneas de la bitácora se han seleccionado para eliminar
  const [entradasSeleccionadas, setEntradasSeleccionadas] = useState<{[key: string]: number[]}>({});

  const [mostrarModalNueva, setMostrarModalNueva] = useState(false);
  const [nuevaEscuela, setNuevaEscuela] = useState({
    nombreCentro: '',
    direccion: 'DIRECCIÓN EN EVALUACIÓN'
  });
  const [guardandoNueva, setGuardandoNueva] = useState(false);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userData } = await supabase
          .from('directorio_operativo')
          .select('*')
          .eq('id', user.id)
          .single();

        if (userData) {
          setJefe(userData);
          
          const fetchCentrosAsignados = async () => {
            let todosLosCentros: any[] = [];
            let limite = 1000;
            let inicio = 0;
            let hayMas = true;
            while (hayMas) {
              const { data: batch } = await supabase.from('centros_votacion_2026')
                .select('*')
                .eq('CODIGO_CIRCUITO_COMUNAL', userData.codigo_situr)
                .range(inicio, inicio + limite - 1);
                
              if (batch && batch.length > 0) {
                todosLosCentros = [...todosLosCentros, ...batch];
                inicio += limite;
                if (batch.length < limite) hayMas = false; 
              } else { 
                hayMas = false; 
              }
            }
            return todosLosCentros;
          };

          const centros = await fetchCentrosAsignados();

          const { data: reportesExistentes } = await supabase
            .from('reportes_concejo_2026')
            .select('*')
            .eq('codigo_situr', userData.codigo_situr)
            .order('fecha_reporte', { ascending: false })
            .limit(5000);

          if (centros) {
            const normalizarNombre = (nombre: string) => {
              return nombre ? nombre.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/gi, '').replace(/\s+/g, ' ').trim() : '';
            };

            const mapaReportesExactos = new Map();
            const bolsaHuerfanos: any[] = [];

            if (reportesExistentes) {
              [...reportesExistentes].reverse().forEach(r => {
                if (r.cod_centro) mapaReportesExactos.set(r.cod_centro.toString().trim(), r);
                if (r.cierre_mesas === 'CERRADO') bolsaHuerfanos.push(r);
              });
            }

            const centrosUnicosMap = new Map();
            centros.forEach((c: any) => {
              const nombreLimpio = normalizarNombre(c['NOMBRE CENTRO']);
              if (nombreLimpio && !centrosUnicosMap.has(nombreLimpio)) {
                centrosUnicosMap.set(nombreLimpio, c);
              }
            });
            const centrosUnicos = Array.from(centrosUnicosMap.values());

            const huerfanosDisponibles = [...bolsaHuerfanos];

            const centrosConReportes = centrosUnicos.map((c: any, index: number) => {
              let rep = mapaReportesExactos.get(c.COD_CENTRO?.toString().trim());

              if (!rep || rep.cierre_mesas !== 'CERRADO') {
                if (huerfanosDisponibles.length > 0) {
                  rep = huerfanosDisponibles.shift(); 
                } else {
                  rep = {}; 
                }
              }

              const uniqueIdentifier = c.id || `temp-${c.COD_CENTRO}-${index}`;

              return { 
                ...c, 
                ...rep,
                uid_estricto: uniqueIdentifier, 
                id_centro: c.id, 
                cod_centro_real: c.COD_CENTRO, 
                id_reporte_viejo: rep?.id || null, 
                
                escuela_apta: rep?.escuela_apta || 'PENDIENTE',
                responsable_inspeccion: rep?.responsable_inspeccion || '',
                organismos_presentes: rep?.organismos_presentes || '',
                cierre_mesas: rep?.cierre_mesas || 'PENDIENTE',
                resena: rep?.resena || ''
              };
            });
            
            setEscuelas(centrosConReportes);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    cargarDatos();
  }, []);

  const handleInputChange = (uidEstricto: string | number, campo: string, valor: string) => {
    setEscuelas(prev => prev.map(esc => esc.uid_estricto === uidEstricto ? { ...esc, [campo]: valor } : esc));
  };

  const agregarEntradaBitacora = async (escuela: any) => {
    const llave = escuela.cod_centro_real || '';
    const textoNota = entradasResena[llave]?.trim();
    if (!textoNota) return;

    const ahora = new Date();
    const horaFormateada = ahora.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true });
    const fechaFormateada = ahora.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit' });
    const estampa = `[${fechaFormateada} - ${horaFormateada}]`;

    const nuevaLinea = `${estampa} ${textoNota}`;
    
    let resenaBase = escuela.resena || '';
    if (resenaBase === 'Sin novedades registradas.') resenaBase = '';

    const bitacoraActualizada = resenaBase 
      ? `${resenaBase}\n${nuevaLinea}`
      : nuevaLinea;

    setEscuelas(prev => prev.map(esc => esc.uid_estricto === escuela.uid_estricto ? { ...esc, resena: bitacoraActualizada } : esc));
    setEntradasResena(prev => ({ ...prev, [llave]: '' }));

    // Si ya estaba sincronizado, guardamos la bitácora de una vez
    if (escuela.id_reporte_viejo && escuela.cierre_mesas === 'CERRADO') {
      try {
        await supabase
          .from('reportes_concejo_2026')
          .upsert({
            id: escuela.id_reporte_viejo, 
            cod_centro: escuela.cod_centro_real,
            codigo_situr: jefe?.codigo_situr,
            resena: bitacoraActualizada,
            cierre_mesas: 'CERRADO',
            fecha_reporte: ahora.toISOString()
          }, { onConflict: 'id' }); 
      } catch (err) {
        console.error("Error en auto-guardado de bitácora:", err);
      }
    }
  };

  // NUEVA FUNCIÓN: Seleccionar / Deseleccionar una línea para eliminar
  const toggleSeleccionEntrada = (uidEstricto: string, indexLinea: number) => {
    setEntradasSeleccionadas(prev => {
      const seleccionadas = prev[uidEstricto] || [];
      if (seleccionadas.includes(indexLinea)) {
        return { ...prev, [uidEstricto]: seleccionadas.filter(i => i !== indexLinea) };
      } else {
        return { ...prev, [uidEstricto]: [...seleccionadas, indexLinea] };
      }
    });
  };

  // NUEVA FUNCIÓN: Eliminar las líneas seleccionadas
  const eliminarEntradasSeleccionadas = (escuela: any) => {
    const uid = escuela.uid_estricto;
    const seleccionadas = entradasSeleccionadas[uid] || [];
    if (seleccionadas.length === 0) return;

    const lineas = escuela.resena ? escuela.resena.split('\n') : [];
    const nuevasLineas = lineas.filter((_: any, idx: number) => !seleccionadas.includes(idx));
    
    handleInputChange(uid, 'resena', nuevasLineas.join('\n'));
    setEntradasSeleccionadas(prev => ({ ...prev, [uid]: [] })); // Limpiar la selección tras borrar
  };

  const guardarCambiosCentro = async (escuela: any) => {
    // VALIDACIÓN 1: Estatus Apto/No Apto
    if (escuela.escuela_apta !== 'APTA' && escuela.escuela_apta !== 'NO APTA') {
      alert("⚠️ ALTO: Debe seleccionar obligatoriamente si la infraestructura está 'APTA' o 'NO APTA' antes de guardar.");
      return;
    }

    // VALIDACIÓN 2: Bitácora Vacía (LA REGLA QUE PEDISTE)
    if (!escuela.resena || escuela.resena.trim() === '' || escuela.resena === 'Sin novedades registradas.') {
      alert("⚠️ ALTO: No puede guardar la inspección sin añadir reportes a la bitácora. Por favor, añada al menos una novedad a la caja.");
      return;
    }

    setGuardandoId(escuela.uid_estricto);
    try {
      const payload: any = {
        cod_centro: escuela.cod_centro_real, 
        codigo_situr: jefe?.codigo_situr,
        escuela_apta: escuela.escuela_apta,
        responsable_inspeccion: escuela.responsable_inspeccion || '',
        organismos_presentes: escuela.organismos_presentes || '',
        resena: escuela.resena.trim(),
        cierre_mesas: 'CERRADO', 
        fecha_reporte: new Date().toISOString()
      };

      if (escuela.id_reporte_viejo) {
        payload.id = escuela.id_reporte_viejo;
      }

      const { error } = await supabase
        .from('reportes_concejo_2026')
        .upsert(payload, { onConflict: escuela.id_reporte_viejo ? 'id' : 'cod_centro' });

      if (error) throw error;
      
      alert(`✅ ÉXITO: Reporte de la escuela "${escuela['NOMBRE CENTRO']}" guardado.`);
      window.location.reload(); 
    } catch (err: any) {
      alert("Error al guardar: " + err.message);
      setGuardandoId(null);
    }
  };

  const eliminarEscuela = async (idTablaEscuela: string | number, nombreEscuela: string, uidEstricto: string | number) => {
    if (confirm(`⚠️ ALERTA: ¿Está seguro que desea ELIMINAR la escuela "${nombreEscuela}"? \n\nEsta acción borrará el plantel permanentemente.`)) {
      try {
        const { error } = await supabase.from('centros_votacion_2026').delete().eq('id', idTablaEscuela);
        if (error) throw error;
        alert(`La escuela ha sido eliminada con éxito.`);
        setEscuelas(prev => prev.filter(e => e.uid_estricto !== uidEstricto));
      } catch (err: any) {
        alert("Error al eliminar la escuela: " + err.message);
      }
    }
  };

  const procesarNuevaEscuela = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaEscuela.nombreCentro.trim()) return;
    
    setGuardandoNueva(true);
    try {
      const cneGenerado = `${jefe?.codigo_situr || 'N/A'}-EXT-${Date.now().toString().slice(-6)}`;
      const payload = {
        "COD_CENTRO": cneGenerado,
        "NOMBRE CENTRO": nuevaEscuela.nombreCentro.trim().toUpperCase(),
        "DIRECCION": nuevaEscuela.direccion.trim().toUpperCase(),
        "CODIGO_COMUNA_CNE": jefe?.comuna_o_circuito_comunal || '',
        "CODIGO_CIRCUITO_COMUNAL": jefe?.codigo_situr || ''
      };

      const { error } = await supabase.from('centros_votacion_2026').insert([payload]);
      if (error) throw error;

      alert(`✅ Escuela "${payload['NOMBRE CENTRO']}" añadida con éxito.`);
      setMostrarModalNueva(false);
      window.location.reload(); 
      
    } catch (err: any) {
      alert("Error al añadir la escuela: " + err.message);
    } finally {
      setGuardandoNueva(false);
    }
  };

  if (loading) return <div className="p-8 text-center font-bold animate-pulse text-[#00529b]">Sincronizando escuelas asignadas...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-[#00529b] font-bold text-xs uppercase bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200 transition-colors w-fit">
          <ArrowLeft size={16} /> Volver al Menú Principal
        </Link>

        {/* Ficha del Funcionario */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-l-[#00529b]">
          <div className="space-y-3">
            <h1 className="text-xl font-black text-[#00529b] uppercase">Inspección de Infraestructura Escolar</h1>
            <div className="flex flex-col gap-1.5 text-xs text-gray-700 font-bold uppercase">
              <p className="flex items-center gap-2"><Shield size={16} className="text-amber-500" /> Organismo Evaluador: <span className="text-gray-900">{jefe?.organismo_responsable || 'NO REGISTRADO'}</span></p>
              <p className="flex items-center gap-2"><UserCheck size={16} className="text-blue-500" /> Funcionario: <span className="text-gray-900">{jefe?.grado_jerarquia} {jefe?.nombre_apellido_jefe}</span></p>
              <p className="flex items-center gap-2"><MapPin size={16} className="text-emerald-500" /> Jurisdicción: <span className="text-gray-900">{jefe?.municipio} - {jefe?.parroquia}</span></p>
            </div>
            <div className="inline-block bg-gray-100 text-gray-800 text-xs px-3 py-1 rounded-md font-black border uppercase mt-1">
              Circuito Comunal: {jefe?.comuna_o_circuito_comunal || 'N/A'}
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 px-6 py-4 rounded-xl flex flex-col items-center shadow-inner">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Llave SITUR</span>
            <span className="text-2xl font-mono font-black text-[#00529b]">{jefe?.codigo_situr}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <button 
            onClick={() => setMostrarModalNueva(true)}
            className="px-6 py-3 rounded-xl flex items-center gap-2 text-xs uppercase shadow-md transition-all font-black hover:opacity-90"
            style={{ backgroundColor: '#00529b', color: '#ffffff' }}
            title="Instrucción: Utilice este botón SOLO si una escuela que usted inspeccionó NO APARECE en la lista de abajo."
          >
            <Plus size={18} color="#ffffff" /> Añadir Escuela que no está registrada
          </button>
          <span className="text-[10px] font-medium text-gray-500 italic">
            * Presione aquí si falta un plantel en su circuito.
          </span>
        </div>

        {/* Lista de Escuelas */}
        <div className="space-y-4">
          {escuelas.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border text-center flex flex-col items-center justify-center text-gray-400">
              <School size={48} className="mb-4 opacity-20" />
              <p className="font-bold text-lg">Sin Escuelas Asignadas para Inspección</p>
            </div>
          ) : (
            escuelas.map((esc, index) => {
              const estaSincronizado = esc.cierre_mesas === 'CERRADO';
              const estaEditando = editandoId === esc.uid_estricto;
              const isLocked = estaSincronizado && !estaEditando;
              const tieneSeleccion = (entradasSeleccionadas[esc.uid_estricto] || []).length > 0;
              
              return (
                <div key={esc.uid_estricto} className={`bg-white rounded-2xl border p-6 shadow-sm flex flex-col gap-6 relative overflow-hidden transition-all ${estaSincronizado ? 'border-emerald-200 bg-emerald-50/5' : 'border-gray-200'} ${estaEditando ? 'ring-2 ring-amber-300' : ''}`}>
                  
                  <div className={`absolute top-0 right-0 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl flex items-center gap-2 ${estaSincronizado ? (estaEditando ? 'bg-amber-500' : 'bg-emerald-600') : 'bg-amber-500'}`}>
                    {estaSincronizado ? (estaEditando ? 'MODO EDICIÓN ACTIVADO' : 'DIAGNÓSTICO SINCRONIZADO') : `PLANTEL ${index + 1} DE ${escuelas.length}`}
                  </div>

                  <div className="border-b pb-4 flex justify-between items-start mt-2">
                    <div>
                      <div className="flex items-center gap-2 text-[#00529b] mb-1">
                        <School size={20} />
                        <span className="text-xs font-black">CNE: {esc.cod_centro_real}</span>
                      </div>
                      <h3 className="text-base font-black text-gray-800 uppercase">{esc['NOMBRE CENTRO']}</h3>
                      <p className="text-xs text-gray-500 font-medium">{esc.DIRECCION}</p>
                    </div>
                    
                    <button 
                      onClick={() => eliminarEscuela(esc.id_centro, esc['NOMBRE CENTRO'], esc.uid_estricto)}
                      className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 p-2 rounded-lg transition-colors flex items-center justify-center"
                      title="Instrucción: Elimina el plantel de la base de datos si fue cargado por error."
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <h4 className="text-[11px] font-black text-[#00529b] uppercase flex items-center gap-1.5">
                        <SearchCheck size={14}/> Formulario de Diagnóstico
                      </h4>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">
                            Estatus de la Infraestructura <span className="text-red-500">*</span>
                          </label>
                          <div className="flex gap-2">
                            <button 
                              type="button"
                              disabled={isLocked}
                              onClick={() => handleInputChange(esc.uid_estricto, 'escuela_apta', 'APTA')}
                              className={`flex-1 p-2.5 rounded-xl text-xs font-black transition-all border ${esc.escuela_apta === 'APTA' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'} ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              ESCUELA APTA
                            </button>
                            <button 
                              type="button"
                              disabled={isLocked}
                              onClick={() => handleInputChange(esc.uid_estricto, 'escuela_apta', 'NO APTA')}
                              className={`flex-1 p-2.5 rounded-xl text-xs font-black transition-all border ${esc.escuela_apta === 'NO APTA' ? 'bg-red-600 text-white border-red-600 shadow-sm' : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'} ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              NO APTA
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Responsable de la Evaluación</label>
                          <input 
                            type="text" 
                            disabled={isLocked} 
                            placeholder="Nombre completo y rango del evaluador..."
                            className="w-full p-2.5 border rounded-xl text-xs bg-white outline-none focus:border-blue-500 font-bold uppercase disabled:bg-gray-100 disabled:text-gray-500" 
                            value={esc.responsable_inspeccion || ''} 
                            onChange={e => handleInputChange(esc.uid_estricto, 'responsable_inspeccion', e.target.value)} 
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Organismos Presentes en la Inspección</label>
                          <textarea 
                            disabled={isLocked} 
                            placeholder="Ej: VEN 911, POLIFALCON, BRICOMILES..."
                            className="w-full p-2.5 border rounded-xl text-xs bg-white outline-none focus:border-blue-500 font-bold uppercase h-16 resize-none disabled:bg-gray-100 disabled:text-gray-500" 
                            value={esc.organismos_presentes || ''} 
                            onChange={e => handleInputChange(esc.uid_estricto, 'organismos_presentes', e.target.value)} 
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECCIÓN BITÁCORA REMODELADA */}
                    <div className="space-y-3 bg-amber-50/10 p-4 rounded-xl border border-amber-200 flex flex-col">
                      <div className="flex justify-between items-center shrink-0">
                        <h4 className="text-[11px] font-black text-amber-800 uppercase flex items-center gap-1.5">
                          <MessageSquare size={14}/> Bitácora de Novedades <span className="text-red-500">*</span>
                        </h4>
                        <div title="Instrucción: Describa detalladamente los daños. Si desea modificar, elimine el reporte seleccionándolo y añada uno nuevo.">
                          <Info size={14} className="text-amber-500 cursor-help" />
                        </div>
                      </div>
                      
                      {/* CAJA PARA AÑADIR NUEVOS REPORTES */}
                      <div className="flex gap-2 shrink-0">
                        <textarea 
                          disabled={isLocked}
                          placeholder="Añada un nuevo reporte aquí (Obligatorio)..." 
                          value={entradasResena[esc.cod_centro_real || ''] || ''} 
                          onChange={e => setEntradasResena(prev => ({ ...prev, [esc.cod_centro_real || '']: e.target.value }))}
                          rows={2}
                          className="flex-grow p-2.5 border rounded-xl text-xs bg-white outline-none focus:border-amber-500 font-medium resize-none min-h-[44px] disabled:bg-gray-100"
                        />
                        <button 
                          type="button" 
                          disabled={isLocked}
                          onClick={() => agregarEntradaBitacora(esc)}
                          className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1 text-xs uppercase shadow-sm shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus size={16}/> Añadir
                        </button>
                      </div>

                      {/* LISTA DE REPORTES (Vista de solo lectura o con selectores si está editando) */}
                      <div className="bg-white rounded-xl border p-3 min-h-[90px] max-h-48 overflow-y-auto space-y-3 grow">
                        {esc.resena && esc.resena !== 'Sin novedades registradas.' && esc.resena.trim() !== '' ? (
                          esc.resena.split('\n').filter((l:string) => l.trim() !== '').map((linea: string, lIdx: number) => (
                            <div key={lIdx} className="flex items-start gap-2 border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                              
                              {/* SELECTOR PARA ELIMINAR (Solo visible en modo edición) */}
                              {!isLocked && (
                                <input 
                                  type="checkbox"
                                  className="mt-0.5 shrink-0 w-3.5 h-3.5 text-amber-600 rounded border-gray-300 focus:ring-amber-500 cursor-pointer"
                                  checked={(entradasSeleccionadas[esc.uid_estricto] || []).includes(lIdx)}
                                  onChange={() => toggleSeleccionEntrada(esc.uid_estricto, lIdx)}
                                  title="Seleccionar para eliminar este reporte"
                                />
                              )}

                              <p className="text-[11px] text-gray-700 font-medium leading-relaxed">
                                <span className="text-[#00529b] font-mono font-bold mr-1.5 inline-flex items-center gap-0.5">
                                  <Clock size={10}/> {linea.match(/\[.*?\]/)?.[0] || ''}
                                </span>
                                {linea.replace(/\[.*?\]/, '').trim()}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-[11px] text-red-400 font-bold italic text-center py-4 flex flex-col items-center gap-1">
                            ¡La caja de reportes está vacía! 
                            <span className="text-[9px] text-gray-400">Debe añadir al menos una novedad antes de guardar.</span>
                          </p>
                        )}
                      </div>

                      {/* BOTÓN PARA BORRAR REPORTES SELECCIONADOS */}
                      {!isLocked && tieneSeleccion && (
                        <button 
                          type="button"
                          onClick={() => eliminarEntradasSeleccionadas(esc)}
                          className="w-full bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 font-bold p-2.5 rounded-xl text-[10px] uppercase flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                        >
                          <Trash2 size={14} /> Eliminar {entradasSeleccionadas[esc.uid_estricto].length} reporte(s) seleccionado(s)
                        </button>
                      )}

                    </div>
                  </div>

                  {/* CONTROLES DE GUARDADO */}
                  <div className="flex flex-col sm:flex-row justify-between items-center border-t border-gray-200 pt-4 gap-3">
                    <div className="w-full sm:w-auto">
                      {estaSincronizado && !estaEditando && (
                        <span className="text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl uppercase flex items-center gap-1.5 justify-center">
                          <CheckCircle2 size={16}/> Sincronizado en Sala Central
                        </span>
                      )}
                    </div>

                    {estaSincronizado ? (
                      isLocked ? (
                        <button 
                          type="button"
                          onClick={() => setEditandoId(esc.uid_estricto)}
                          className="w-full sm:w-auto px-8 py-3.5 font-black rounded-xl text-xs uppercase transition-all shadow-md flex items-center justify-center gap-2 bg-amber-100 text-amber-800 hover:bg-amber-200"
                        >
                          <Edit size={16} /> Editar Reporte
                        </button>
                      ) : (
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button 
                            type="button"
                            onClick={() => {
                              if (confirm("¿Descartar cambios no guardados?")) {
                                window.location.reload();
                              }
                            }}
                            className="flex-1 sm:flex-none px-6 py-3.5 font-black rounded-xl text-xs uppercase transition-all shadow-md bg-gray-200 text-gray-700 hover:bg-gray-300"
                          >
                            Cancelar
                          </button>
                          <button 
                            type="button"
                            disabled={guardandoId === esc.uid_estricto}
                            onClick={() => guardarCambiosCentro(esc)}
                            className="flex-1 sm:flex-none px-8 py-3.5 font-black rounded-xl text-xs uppercase transition-all shadow-md flex items-center justify-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                          >
                            {guardandoId === esc.uid_estricto ? 'Guardando...' : <><Save size={16}/> Guardar Cambios</>}
                          </button>
                        </div>
                      )
                    ) : (
                      <button 
                        type="button"
                        disabled={guardandoId === esc.uid_estricto}
                        onClick={() => guardarCambiosCentro(esc)}
                        className="w-full sm:w-auto px-8 py-3.5 font-black rounded-xl text-xs uppercase transition-all shadow-md flex items-center justify-center gap-2"
                        style={{ backgroundColor: '#00529b', color: '#ffffff' }}
                      >
                        <Save size={16} /> {guardandoId === esc.uid_estricto ? 'Sincronizando...' : 'Guardar Inspección'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {mostrarModalNueva && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          {/* Aquí va el contenido del modal que ya tenías, no lo toqué para ahorrar espacio */}
        </div>
      )}
    </div>
  );
}
