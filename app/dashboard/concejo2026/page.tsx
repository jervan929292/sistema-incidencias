'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { School, UserCheck, Save, Shield, MapPin, MessageSquare, ArrowLeft, CheckCircle2, Plus, Clock, SearchCheck, Edit, Trash2, X, Loader2, Building } from 'lucide-react';
import Link from 'next/link';

export default function ConcejoTerritorialPage() {
  const [jefe, setJefe] = useState<any>(null);
  const [escuelas, setEscuelas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardandoId, setGuardandoId] = useState<string | number | null>(null);
  
  // ESTADO NUEVO: Saber qué escuela se está editando
  const [editandoId, setEditandoId] = useState<string | number | null>(null);

  // Estado local temporal para la nueva reseña de la bitácora
  const [entradasResena, setEntradasResena] = useState<{[key: string]: string}>({});

  // ESTADOS PARA EL MODAL DE NUEVA ESCUELA
  const [mostrarModalNueva, setMostrarModalNueva] = useState(false);
  const [nuevaEscuela, setNuevaEscuela] = useState({
    nombreCentro: '',
    direccion: 'DIRECCIÓN EN EVALUACIÓN'
  });
  const [guardandoNueva, setGuardandoNueva] = useState(false);
  const [centroSeleccionado, setCentroSeleccionado] = useState<any | null>(null);

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

            const centrosConReportes = centrosUnicos.map((c: any) => {
              let rep = mapaReportesExactos.get(c.COD_CENTRO?.toString().trim());

              if (!rep || rep.cierre_mesas !== 'CERRADO') {
                if (huerfanosDisponibles.length > 0) {
                  rep = huerfanosDisponibles.shift(); 
                } else {
                  rep = {}; 
                }
              }

              return { 
                ...c, 
                ...rep,
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

  const handleInputChange = (idCentro: string | number, campo: string, valor: string) => {
    setEscuelas(prev => prev.map(esc => esc.id_centro === idCentro ? { ...esc, [campo]: valor } : esc));
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

    setEscuelas(prev => prev.map(esc => esc.cod_centro_real === escuela.cod_centro_real ? { ...esc, resena: bitacoraActualizada } : esc));
    setEntradasResena(prev => ({ ...prev, [llave]: '' }));

    // Auto-guardado opcional de la bitácora
    try {
      await supabase
        .from('reportes_concejo_2026')
        .upsert({
          id: escuela.id_reporte_viejo || undefined, 
          cod_centro: escuela.cod_centro_real,
          codigo_situr: jefe?.codigo_situr,
          resena: bitacoraActualizada,
          cierre_mesas: 'CERRADO',
          fecha_reporte: ahora.toISOString()
        }, { onConflict: 'id' }); 
    } catch (err) {
      console.error("Error en auto-guardado de bitácora:", err);
    }
  };

  const guardarCambiosCentro = async (escuela: any) => {
    // VALIDACIÓN ESTRICTA
    if (escuela.escuela_apta !== 'APTA' && escuela.escuela_apta !== 'NO APTA') {
      alert("⚠️ ALTO: Debe seleccionar obligatoriamente si la infraestructura está 'APTA' o 'NO APTA' antes de guardar.");
      return;
    }

    setGuardandoId(escuela.id_centro);
    try {
      const payload: any = {
        cod_centro: escuela.cod_centro_real, 
        codigo_situr: jefe?.codigo_situr,
        escuela_apta: escuela.escuela_apta,
        responsable_inspeccion: escuela.responsable_inspeccion || '',
        organismos_presentes: escuela.organismos_presentes || '',
        resena: escuela.resena || '',
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
      
      alert(`✅ ÉXITO: Reporte de la escuela "${escuela['NOMBRE CENTRO']}" guardado y sincronizado con el VEN 911.`);
      window.location.reload(); 
    } catch (err: any) {
      alert("Error al guardar en el sistema: " + err.message);
      setGuardandoId(null);
    }
  };

  const eliminarEscuela = async (idTablaEscuela: string | number, nombreEscuela: string) => {
    if (confirm(`⚠️ ALERTA: ¿Está seguro que desea ELIMINAR la escuela "${nombreEscuela}"? \n\nEsta acción borrará el plantel de la base de datos de su cuadrante permanentemente.`)) {
      try {
        const { error } = await supabase.from('centros_votacion_2026').delete().eq('id', idTablaEscuela);
        if (error) throw error;
        alert(`La escuela "${nombreEscuela}" ha sido eliminada con éxito.`);
        setEscuelas(prev => prev.filter(e => e.id_centro !== idTablaEscuela));
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

      alert(`✅ Escuela "${payload['NOMBRE CENTRO']}" añadida con éxito al circuito ${jefe?.codigo_situr}.`);
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

        {/* BOTÓN PARA AÑADIR ESCUELA FALTANTE */}
        <div className="flex justify-end">
          <button 
            onClick={() => setMostrarModalNueva(true)}
            className="px-6 py-3 rounded-xl flex items-center gap-2 text-xs uppercase shadow-md transition-all font-black hover:opacity-90"
            style={{ backgroundColor: '#00529b', color: '#ffffff' }}
          >
            <Plus size={18} color="#ffffff" /> Añadir Escuela que no está registrada
          </button>
        </div>

        {/* Lista de Escuelas */}
        <div className="space-y-4">
          {escuelas.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border text-center flex flex-col items-center justify-center text-gray-400">
              <School size={48} className="mb-4 opacity-20" />
              <p className="font-bold text-lg">Sin Escuelas Asignadas para Inspección</p>
              <button 
                onClick={() => setMostrarModalNueva(true)}
                className="mt-4 px-6 py-3 rounded-xl font-black text-xs uppercase shadow-md hover:opacity-90"
                style={{ backgroundColor: '#00529b', color: '#ffffff' }}
              >
                Añadir una escuela manualmente
              </button>
            </div>
          ) : (
            escuelas.map((esc, index) => {
              const estaSincronizado = esc.cierre_mesas === 'CERRADO';
              const estaEditando = editandoId === esc.id_centro;
              
              // LA LÓGICA DE BLOQUEO: Se bloquea si está sincronizado Y no se le ha dado al botón "Editar"
              const isLocked = estaSincronizado && !estaEditando;
              
              return (
                <div key={esc.id_centro} className={`bg-white rounded-2xl border p-6 shadow-sm flex flex-col gap-6 relative overflow-hidden transition-all ${estaSincronizado ? 'border-emerald-200 bg-emerald-50/5' : 'border-gray-200'} ${estaEditando ? 'ring-2 ring-amber-300' : ''}`}>
                  
                  <div className={`absolute top-0 right-0 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl flex items-center gap-2 ${estaSincronizado ? (estaEditando ? 'bg-amber-500' : 'bg-emerald-600') : 'bg-amber-500'}`}>
                    {estaSincronizado ? (estaEditando ? 'MODO EDICIÓN ACTIVADO' : 'DIAGNÓSTICO SINCRONIZADO') : `PLANTEL ${index + 1} DE ${escuelas.length}`}
                  </div>

                  <div className="border-b pb-4 flex justify-between items-start mt-2">
                    <div>
                      <div className="flex items-center gap-2 text-[#00529b] mb-1">
                        <School size={20} />
                        <span className="text-xs font-black">CNE: {esc.cod_centro_real} {esc.id_reporte_viejo && <span className="text-amber-500 ml-1" title="Reporte histórico recuperado">★</span>}</span>
                      </div>
                      <h3 className="text-base font-black text-gray-800 uppercase">{esc['NOMBRE CENTRO']}</h3>
                      <p className="text-xs text-gray-500 font-medium">{esc.DIRECCION}</p>
                    </div>
                    
                    <button 
                      onClick={() => eliminarEscuela(esc.id_centro, esc['NOMBRE CENTRO'])}
                      className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 p-2 rounded-lg transition-colors flex items-center justify-center"
                      title="Eliminar esta escuela de la base de datos"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* CRITERIOS DE EVALUACIÓN OBLIGATORIOS */}
                    <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <h4 className="text-[11px] font-black text-[#00529b] uppercase flex items-center gap-1.5"><SearchCheck size={14}/> Formulario de Diagnóstico</h4>
                      
                      <div className="space-y-3">
                        {/* 1. ¿Escuela Apta? */}
                        <div>
                          <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">Estatus de la Infraestructura <span className="text-red-500">*</span></label>
                          <div className="flex gap-2">
                            <button 
                              type="button"
                              disabled={isLocked}
                              onClick={() => handleInputChange(esc.id_centro, 'escuela_apta', 'APTA')}
                              className={`flex-1 p-2.5 rounded-xl text-xs font-black transition-all border ${esc.escuela_apta === 'APTA' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'} ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              ESCUELA APTA
                            </button>
                            <button 
                              type="button"
                              disabled={isLocked}
                              onClick={() => handleInputChange(esc.id_centro, 'escuela_apta', 'NO APTA')}
                              className={`flex-1 p-2.5 rounded-xl text-xs font-black transition-all border ${esc.escuela_apta === 'NO APTA' ? 'bg-red-600 text-white border-red-600 shadow-sm' : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'} ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              NO APTA
                            </button>
                          </div>
                        </div>

                        {/* 2. Responsable */}
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Responsable de la Evaluación</label>
                          <input 
                            type="text" 
                            disabled={isLocked} 
                            placeholder="Nombre completo y rango del evaluador..."
                            className="w-full p-2.5 border rounded-xl text-xs bg-white outline-none focus:border-blue-500 font-bold uppercase disabled:bg-gray-100 disabled:text-gray-500" 
                            value={esc.responsable_inspeccion || ''} 
                            onChange={e => handleInputChange(esc.id_centro, 'responsable_inspeccion', e.target.value)} 
                          />
                        </div>

                        {/* 3. Organismos Presentes */}
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Organismos Presentes en la Inspección</label>
                          <textarea 
                            disabled={isLocked} 
                            placeholder="Ej: VEN 911, POLIFALCON, BRICOMILES, BOMBEROS..."
                            className="w-full p-2.5 border rounded-xl text-xs bg-white outline-none focus:border-blue-500 font-bold uppercase h-16 resize-none disabled:bg-gray-100 disabled:text-gray-500" 
                            value={esc.organismos_presentes || ''} 
                            onChange={e => handleInputChange(esc.id_centro, 'organismos_presentes', e.target.value)} 
                          />
                        </div>
                      </div>
                    </div>

                    {/* BITÁCORA PARA DETALLES ADICIONALES */}
                    <div className="space-y-3 bg-amber-50/10 p-4 rounded-xl border border-amber-200 flex flex-col">
                      <h4 className="text-[11px] font-black text-amber-800 uppercase flex items-center gap-1.5 shrink-0">
                        <MessageSquare size={14}/> Bitácora de Novedades y Necesidades
                      </h4>
                      
                      {/* COMPONENTE DE AÑADIR RÁPIDO (Se desactiva al bloquear) */}
                      <div className="flex gap-2 shrink-0">
                        <textarea 
                          disabled={isLocked}
                          placeholder="Escriba aquí deficiencias (Ej: Filtración en el techo, sin servicio de agua)..." 
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

                      {/* VISTA DE BITÁCORA: Cuadro bloqueado (lista) vs Cuadro editable (textarea) */}
                      {isLocked ? (
                        <div className="bg-white rounded-xl border p-3 min-h-[90px] max-h-48 overflow-y-auto space-y-2 divide-y divide-gray-50 grow">
                          {esc.resena && esc.resena !== 'Sin novedades registradas.' ? (
                            esc.resena.split('\n').map((linea: string, lIdx: number) => (
                              <p key={lIdx} className="text-[11px] text-gray-700 font-medium pt-1.5 first:pt-0 leading-relaxed">
                                <span className="text-[#00529b] font-mono font-bold mr-1.5 inline-flex items-center gap-0.5">
                                  <Clock size={10}/> {linea.match(/\[.*?\]/)?.[0] || ''}
                                </span>
                                {linea.replace(/\[.*?\]/, '').trim()}
                              </p>
                            ))
                          ) : (
                            <p className="text-[11px] text-gray-400 italic text-center py-4">No hay novedades registradas en este plantel.</p>
                          )}
                        </div>
                      ) : (
                        <textarea 
                          className="w-full p-3 border rounded-xl text-xs bg-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 font-medium min-h-[120px] resize-y grow"
                          value={esc.resena === 'Sin novedades registradas.' ? '' : esc.resena}
                          onChange={e => handleInputChange(esc.id_centro, 'resena', e.target.value)}
                          placeholder="Puede editar todo el historial de la reseña directamente aquí..."
                        />
                      )}
                    </div>
                  </div>

                  {/* CONTROLES DE GUARDADO Y EDICIÓN */}
                  <div className="flex flex-col sm:flex-row justify-between items-center border-t border-gray-200 pt-4 gap-3">
                    <div className="w-full sm:w-auto">
                      {estaSincronizado && !estaEditando && (
                        <span className="text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl uppercase flex items-center gap-1.5 justify-center">
                          <CheckCircle2 size={16}/> Sincronizado en Sala Central
                        </span>
                      )}
                      {estaEditando && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-lg">
                          Los campos están desbloqueados. Realice sus cambios.
                        </span>
                      )}
                    </div>

                    {estaSincronizado ? (
                      isLocked ? (
                        // BOTÓN DE DESBLOQUEO (MODO VISTA)
                        <button 
                          type="button"
                          onClick={() => setEditandoId(esc.id_centro)}
                          className="w-full sm:w-auto px-8 py-3.5 font-black rounded-xl text-xs uppercase transition-all shadow-md flex items-center justify-center gap-2 bg-amber-100 text-amber-800 hover:bg-amber-200"
                        >
                          <Edit size={16} /> Editar Reporte
                        </button>
                      ) : (
                        // BOTONES DE GUARDADO Y CANCELAR (MODO EDICIÓN)
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button 
                            type="button"
                            onClick={() => {
                              if (confirm("Se descartarán todos los cambios no guardados y el reporte volverá a su estado anterior. ¿Desea cancelar?")) {
                                window.location.reload();
                              }
                            }}
                            className="flex-1 sm:flex-none px-6 py-3.5 font-black rounded-xl text-xs uppercase transition-all shadow-md bg-gray-200 text-gray-700 hover:bg-gray-300"
                          >
                            Cancelar
                          </button>
                          <button 
                            type="button"
                            disabled={guardandoId === esc.id_centro}
                            onClick={() => {
                              if (confirm("Los cambios se guardarán con éxito. Por favor dele Aceptar para modificar el registro o Cancelar para dejarlo como estaba antes.")) {
                                guardarCambiosCentro(esc);
                              } else {
                                window.location.reload();
                              }
                            }}
                            className="flex-1 sm:flex-none px-8 py-3.5 font-black rounded-xl text-xs uppercase transition-all shadow-md flex items-center justify-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                          >
                            {guardandoId === esc.id_centro ? 'Guardando...' : <><Save size={16}/> Guardar Cambios</>}
                          </button>
                        </div>
                      )
                    ) : (
                      // BOTÓN GUARDAR (NUEVO REPORTE)
                      <button 
                        type="button"
                        disabled={guardandoId === esc.id_centro}
                        onClick={() => guardarCambiosCentro(esc)}
                        className="w-full sm:w-auto px-8 py-3.5 font-black rounded-xl text-xs uppercase transition-all shadow-md flex items-center justify-center gap-2"
                        style={{ backgroundColor: '#00529b', color: '#ffffff' }}
                      >
                        <Save size={16} /> {guardandoId === esc.id_centro ? 'Sincronizando...' : 'Guardar Inspección'}
                      </button>
                    )}

                  </div>

                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ==========================================
          MODAL PARA AÑADIR NUEVA ESCUELA MANUALMENTE
          ========================================== */}
      {mostrarModalNueva && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border">
            
            <div className="flex justify-between items-start border-b pb-3 mb-6">
              <h3 className="text-xl font-black text-[#00529b] flex items-center gap-2 uppercase">
                <School size={24} /> Añadir Escuela
              </h3>
              <button onClick={() => setMostrarModalNueva(false)} className="text-gray-400 hover:text-red-500"><X size={20}/></button>
            </div>

            <form onSubmit={procesarNuevaEscuela} className="space-y-4">
              
              {/* CAMPOS PRE-LLENADOS Y BLOQUEADOS */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-100 p-3 rounded-xl border border-gray-200">
                  <label className="block text-[9px] font-bold text-gray-500 uppercase">CÓDIGO SITUR</label>
                  <p className="font-mono text-sm font-black text-gray-800">{jefe?.codigo_situr}</p>
                </div>
                <div className="bg-gray-100 p-3 rounded-xl border border-gray-200">
                  <label className="block text-[9px] font-bold text-gray-500 uppercase">CNE VIRTUAL</label>
                  <p className="font-mono text-xs font-black text-gray-800 flex items-center gap-1">
                    <Clock size={12}/> AUTOMÁTICO
                  </p>
                </div>
              </div>

              {/* CAMPOS A LLENAR A MANO */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">NOMBRE CENTRO (ESCUELA)</label>
                <input 
                  type="text" 
                  required
                  placeholder="Escriba el nombre exacto del plantel..."
                  className="w-full p-3 border rounded-xl text-sm font-black uppercase text-gray-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  value={nuevaEscuela.nombreCentro}
                  onChange={e => setNuevaEscuela({...nuevaEscuela, nombreCentro: e.target.value.toUpperCase()})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">DIRECCIÓN (Opcional)</label>
                <textarea 
                  rows={2}
                  placeholder="Ej: Sector Centro, Calle Principal..."
                  className="w-full p-3 border rounded-xl text-xs font-bold uppercase text-gray-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 resize-none"
                  value={nuevaEscuela.direccion}
                  onChange={e => setNuevaEscuela({...nuevaEscuela, direccion: e.target.value.toUpperCase()})}
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setMostrarModalNueva(false)}
                  className="w-1/3 bg-gray-200 text-gray-700 font-bold p-3 rounded-xl uppercase text-xs hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={guardandoNueva}
                  className="w-2/3 font-black p-3 rounded-xl uppercase text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: '#00529b', color: '#ffffff' }}
                >
                  {guardandoNueva ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Registrar
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
