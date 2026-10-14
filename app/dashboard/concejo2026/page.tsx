'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { School, UserCheck, Save, Shield, MapPin, MessageSquare, ArrowLeft, CheckCircle2, Plus, Clock, Edit, Trash2, X, Loader2, Info, Search } from 'lucide-react';
import Link from 'next/link';

export default function ConcejoTerritorialPage() {
  const [jefe, setJefe] = useState<any>(null);
  const [escuelas, setEscuelas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardandoId, setGuardandoId] = useState<string | number | null>(null);
  
  const [editandoId, setEditandoId] = useState<string | number | null>(null);

  // Estados para el Modal de Añadir / Buscar Centro
  const [mostrarModalNueva, setMostrarModalNueva] = useState(false);
  const [nombreBusqueda, setNombreBusqueda] = useState('');
  const [cneVirtualModal, setCneVirtualModal] = useState('AUTOMÁTICO');
  const [direccionModal, setDireccionModal] = useState('DIRECCIÓN EN EVALUACIÓN');
  const [sugerenciasCentros, setSugerenciasCentros] = useState<any[]>([]);
  const [buscandoSugerencias, setBuscandoSugerencias] = useState(false);
  const [centroExistenteSeleccionado, setCentroExistenteSeleccionado] = useState<any | null>(null);
  const [guardandoNueva, setGuardandoNueva] = useState(false);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        let emailABuscar = '';
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          emailABuscar = user.email;
        } else {
          const sessionData = localStorage.getItem('user_session');
          if (sessionData) {
            try {
              const parsed = JSON.parse(sessionData);
              if (parsed?.email) emailABuscar = parsed.email;
            } catch (e) {}
          }
        }

        if (!emailABuscar) {
          setLoading(false);
          return;
        }

        const { data: userData, error: userErr } = await supabase
          .from('directorio_operativo')
          .select('*')
          .ilike('email', emailABuscar)
          .maybeSingle();

        if (userErr || !userData) {
          setLoading(false);
          return;
        }

        setJefe(userData);
        const siturCodigo = userData.codigo_situr?.toString().trim();

        if (siturCodigo) {
          const fetchCentrosAsignados = async () => {
            let todosLosCentros: any[] = [];
            let limite = 1000;
            let inicio = 0;
            let hayMas = true;
            while (hayMas) {
              const { data: batch } = await supabase.from('centros_votacion_2026')
                .select('*')
                .eq('CODIGO_CIRCUITO_COMUNAL', siturCodigo)
                .range(inicio, inicio + limite - 1);
                
              if (batch && batch.length > 0) {
                todosLosCentros = [...todosLosCentros, ...batch];
                inicio += limite;
                if (batch.length < limite) hayMas = false; 
              } else { hayMas = false; }
            }
            return todosLosCentros;
          };

          const centros = await fetchCentrosAsignados();

          const { data: reportesExistentes } = await supabase
            .from('reportes_concejo_2026')
            .select('*')
            .eq('codigo_situr', siturCodigo)
            .order('fecha_reporte', { ascending: false })
            .limit(5000);

          if (centros) {
            const mapaReportesExactos = new Map();
            if (reportesExistentes) {
              reportesExistentes.forEach(r => {
                const key = r.cod_centro?.toString().trim();
                if (key && !mapaReportesExactos.has(key)) {
                  mapaReportesExactos.set(key, r);
                }
              });
            }

            const centrosConReportes = centros.map((c: any, index: number) => {
              let rep = mapaReportesExactos.get(c.COD_CENTRO?.toString().trim()) || {};
              const uniqueIdentifier = c.id || `temp-${c.COD_CENTRO}-${index}`;

              return { 
                ...c, 
                ...rep,
                uid_estricto: uniqueIdentifier, 
                id_centro: c.id, 
                cod_centro_real: c.COD_CENTRO, 
                id_reporte_viejo: rep?.id || null, 
                
                responsable_cne: rep?.responsable_cne || '',
                responsable_mesa: rep?.responsable_mesa || '',
                entrega_cotillon: rep?.entrega_cotillon || 'PENDIENTE',
                motivo_no_cotillon: rep?.motivo_no_cotillon || '',
                minuta: rep?.minuta || '',
                cierre_mesas: rep?.cierre_mesas || 'PENDIENTE'
              };
            });
            
            setEscuelas(centrosConReportes);
          }
        }
      } catch (err) {
        console.error("Error al cargar datos:", err);
      } finally {
        setLoading(false);
      }
    };
    cargarDatos();
  }, []);

  // AUTOCOMPLETADO ESTILO GOOGLE AL ESCRIBIR 3 O MÁS LETRAS
  const handleNombreChange = async (valor: string) => {
    const textoUpper = valor.toUpperCase();
    setNombreBusqueda(textoUpper);
    setCentroExistenteSeleccionado(null);

    if (textoUpper.trim().length >= 3) {
      setBuscandoSugerencias(true);
      try {
        const { data } = await supabase
          .from('centros_votacion_2026')
          .select('*')
          .ilike('NOMBRE CENTRO', `%${textoUpper}%`)
          .limit(6);

        setSugerenciasCentros(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setBuscandoSugerencias(false);
      }
    } else {
      setSugerenciasCentros([]);
      setCneVirtualModal('AUTOMÁTICO');
      setDireccionModal('DIRECCIÓN EN EVALUACIÓN');
    }
  };

  const seleccionarSugerencia = (centro: any) => {
    setNombreBusqueda(centro['NOMBRE CENTRO']);
    setCneVirtualModal(centro.COD_CENTRO || 'S/C');
    setDireccionModal(centro.DIRECCION || 'DIRECCIÓN EN EVALUACIÓN');
    setCentroExistenteSeleccionado(centro);
    setSugerenciasCentros([]);
  };

  const handleInputChange = (uidEstricto: string | number, campo: string, valor: string) => {
    setEscuelas(prev => prev.map(esc => esc.uid_estricto === uidEstricto ? { ...esc, [campo]: valor } : esc));
  };

  const guardarCambiosCentro = async (escuela: any) => {
    if (!escuela.responsable_cne || !escuela.responsable_mesa) {
      alert("⚠️ ALTO: Debe ingresar el nombre del Responsable CNE y del Responsable de mesa.");
      return;
    }

    if (escuela.entrega_cotillon !== 'SI' && escuela.entrega_cotillon !== 'NO') {
      alert("⚠️ ALTO: Debe indicar si se hizo entrega de cotillón (Sí / No).");
      return;
    }

    if (escuela.entrega_cotillon === 'NO' && !escuela.motivo_no_cotillon?.trim()) {
      alert("⚠️ ALTO: Como seleccionó 'NO' en entrega de cotillón, debe escribir obligatoriamente el motivo.");
      return;
    }

    if (!escuela.minuta || escuela.minuta.trim() === '') {
      alert("⚠️ ALTO: Debe redactar la minuta informativa del centro.");
      return;
    }

    setGuardandoId(escuela.uid_estricto);
    try {
      const payload: any = {
        cod_centro: escuela.cod_centro_real, 
        codigo_situr: jefe?.codigo_situr,
        responsable_cne: escuela.responsable_cne.trim().toUpperCase(),
        responsable_mesa: escuela.responsable_mesa.trim().toUpperCase(),
        entrega_cotillon: escuela.entrega_cotillon,
        motivo_no_cotillon: escuela.entrega_cotillon === 'NO' ? escuela.motivo_no_cotillon.trim().toUpperCase() : null,
        minuta: escuela.minuta.trim(),
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
      
      alert(`✅ ÉXITO: Reporte del centro "${escuela['NOMBRE CENTRO']}" guardado correctamente.`);
      window.location.reload(); 
    } catch (err: any) {
      alert("Error al guardar: " + err.message);
      setGuardandoId(null);
    }
  };

  const eliminarEscuela = async (idTablaEscuela: string | number, nombreEscuela: string, uidEstricto: string | number) => {
    if (confirm(`⚠️ ALERTA: ¿Está seguro que desea ELIMINAR el centro "${nombreEscuela}"?`)) {
      try {
        const { error } = await supabase.from('centros_votacion_2026').delete().eq('id', idTablaEscuela);
        if (error) throw error;
        alert(`El centro ha sido eliminado con éxito.`);
        setEscuelas(prev => prev.filter(e => e.uid_estricto !== uidEstricto));
      } catch (err: any) {
        alert("Error al eliminar: " + err.message);
      }
    }
  };

  const procesarNuevaEscuela = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreBusqueda.trim()) return;
    
    setGuardandoNueva(true);
    try {
      if (centroExistenteSeleccionado) {
        // SI SELECCIONÓ UN CENTRO EXISTENTE DE LA BÚSQUEDA -> Asignarlo al SITUR actual
        const { error } = await supabase
          .from('centros_votacion_2026')
          .update({
            "CODIGO_CIRCUITO_COMUNAL": jefe?.codigo_situr,
            "CODIGO_COMUNA_CNE": jefe?.comuna_o_circuito_comunal || ''
          })
          .eq('id', centroExistenteSeleccionado.id);

        if (error) throw error;
        alert(`✅ Centro "${centroExistenteSeleccionado['NOMBRE CENTRO']}" enlazado correctamente a la llave SITUR: ${jefe?.codigo_situr}`);
      } else {
        // SI ES UN CENTRO TOTALMENTE NUEVO -> Crearlo con CNE automático
        const escuelasDelSitur = escuelas.filter(esc => esc.CODIGO_CIRCUITO_COMUNAL === jefe?.codigo_situr);
        const siguienteNumero = escuelasDelSitur.length + 1;
        const cneGenerado = `${jefe?.codigo_situr || 'N/A'}-${siguienteNumero}`;
        
        const payload = {
          "COD_CENTRO": cneGenerado,
          "NOMBRE CENTRO": nombreBusqueda.trim().toUpperCase(),
          "DIRECCION": direccionModal.trim().toUpperCase(),
          "CODIGO_COMUNA_CNE": jefe?.comuna_o_circuito_comunal || '',
          "CODIGO_CIRCUITO_COMUNAL": jefe?.codigo_situr || ''
        };

        const { error } = await supabase.from('centros_votacion_2026').insert([payload]);
        if (error) throw error;

        alert(`✅ Centro "${payload['NOMBRE CENTRO']}" creado con éxito. CNE asignado: ${cneGenerado}`);
      }

      setMostrarModalNueva(false);
      window.location.reload(); 
    } catch (err: any) {
      alert("Error al procesar el centro: " + err.message);
    } finally {
      setGuardandoNueva(false);
    }
  };

  if (loading) return <div className="p-8 text-center font-bold animate-pulse text-[#00529b]">Sincronizando centros asignados...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-[#00529b] font-bold text-xs uppercase bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200 transition-colors w-fit">
          <ArrowLeft size={16} /> Volver al Menú Principal
        </Link>

        {/* Ficha del Funcionario */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-l-[#00529b]">
          <div className="space-y-3">
            <h1 className="text-xl font-black text-[#00529b] uppercase">Segunda Consulta Popular Nacional 2026</h1>
            <div className="flex flex-col gap-1.5 text-xs text-gray-700 font-bold uppercase">
              <p className="flex items-center gap-2"><Shield size={16} className="text-amber-500" /> Organismo: <span className="text-gray-900">{jefe?.organismo_responsable || 'NO REGISTRADO'}</span></p>
              <p className="flex items-center gap-2"><UserCheck size={16} className="text-blue-500" /> Funcionario: <span className="text-gray-900">{jefe?.grado_jerarquia} {jefe?.nombre_apellido_jefe}</span></p>
              <p className="flex items-center gap-2"><MapPin size={16} className="text-emerald-500" /> Jurisdicción: <span className="text-gray-900">{jefe?.municipio} - {jefe?.parroquia}</span></p>
            </div>
            <div className="inline-block bg-gray-100 text-gray-800 text-xs px-3 py-1 rounded-md font-black border uppercase mt-1">
              Circuito Comunal: {jefe?.comuna_o_circuito_comunal || 'N/A'}
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 px-6 py-4 rounded-xl flex flex-col items-center shadow-inner">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Llave SITUR</span>
            <span className="text-2xl font-mono font-black text-[#00529b]">{jefe?.codigo_situr || 'SIN LLAVE'}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <button 
            onClick={() => {
              setNombreBusqueda('');
              setCneVirtualModal('AUTOMÁTICO');
              setSugerenciasCentros([]);
              setCentroExistenteSeleccionado(null);
              setMostrarModalNueva(true);
            }}
            className="px-6 py-3 rounded-xl flex items-center gap-2 text-xs uppercase shadow-md transition-all font-black hover:opacity-90 bg-[#00529b] text-white"
          >
            <Plus size={18} /> Añadir Centro que no está registrado
          </button>
        </div>

        {/* Lista de Centros */}
        <div className="space-y-4">
          {escuelas.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border text-center flex flex-col items-center justify-center text-gray-400">
              <School size={48} className="mb-4 opacity-20" />
              <p className="font-bold text-lg">Sin Centros Asignados</p>
            </div>
          ) : (
            escuelas.map((esc, index) => {
              const estaSincronizado = esc.cierre_mesas === 'CERRADO';
              const estaEditando = editandoId === esc.uid_estricto;
              const isLocked = estaSincronizado && !estaEditando;
              
              return (
                <div key={esc.uid_estricto} className={`bg-white rounded-2xl border p-6 shadow-sm flex flex-col gap-6 relative overflow-hidden transition-all ${estaSincronizado ? 'border-emerald-200 bg-emerald-50/5' : 'border-gray-200'} ${estaEditando ? 'ring-2 ring-amber-300' : ''}`}>
                  
                  <div className={`absolute top-0 right-0 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl flex items-center gap-2 ${estaSincronizado ? (estaEditando ? 'bg-amber-500' : 'bg-emerald-600') : 'bg-amber-500'}`}>
                    {estaSincronizado ? (estaEditando ? 'MODO EDICIÓN' : 'REGISTRADO') : `CENTRO ${index + 1} DE ${escuelas.length}`}
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
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <h4 className="text-[11px] font-black text-[#00529b] uppercase flex items-center gap-1.5">
                        <UserCheck size={14}/> Autoridades de la Consulta
                      </h4>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                            Responsable CNE <span className="text-red-500">*</span>
                          </label>
                          <input 
                            type="text" 
                            disabled={isLocked} 
                            placeholder="Nombre del responsable del CNE..."
                            className="w-full p-2.5 border rounded-xl text-xs bg-white outline-none font-bold uppercase disabled:bg-gray-100" 
                            value={esc.responsable_cne || ''} 
                            onChange={e => handleInputChange(esc.uid_estricto, 'responsable_cne', e.target.value)} 
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                            Responsable de Mesa <span className="text-red-500">*</span>
                          </label>
                          <input 
                            type="text" 
                            disabled={isLocked} 
                            placeholder="Nombre del responsable de mesa..."
                            className="w-full p-2.5 border rounded-xl text-xs bg-white outline-none font-bold uppercase disabled:bg-gray-100" 
                            value={esc.responsable_mesa || ''} 
                            onChange={e => handleInputChange(esc.uid_estricto, 'responsable_mesa', e.target.value)} 
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">
                            Entrega de Cotillón <span className="text-red-500">*</span>
                          </label>
                          <div className="flex gap-2">
                            <button 
                              type="button"
                              disabled={isLocked}
                              onClick={() => handleInputChange(esc.uid_estricto, 'entrega_cotillon', 'SI')}
                              className={`flex-1 p-2.5 rounded-xl text-xs font-black transition-all border ${esc.entrega_cotillon === 'SI' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-gray-400 border-gray-200'} ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              SÍ
                            </button>
                            <button 
                              type="button"
                              disabled={isLocked}
                              onClick={() => handleInputChange(esc.uid_estricto, 'entrega_cotillon', 'NO')}
                              className={`flex-1 p-2.5 rounded-xl text-xs font-black transition-all border ${esc.entrega_cotillon === 'NO' ? 'bg-red-600 text-white border-red-600 shadow-sm' : 'bg-white text-gray-400 border-gray-200'} ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              NO
                            </button>
                          </div>
                        </div>

                        {esc.entrega_cotillon === 'NO' && (
                          <div>
                            <label className="block text-[10px] font-bold text-red-600 uppercase mb-1">
                              Motivo por el cual NO se entregó cotillón <span className="text-red-500">*</span>
                            </label>
                            <textarea 
                              disabled={isLocked}
                              rows={2}
                              placeholder="Escriba detalladamente el motivo..."
                              className="w-full p-2.5 border border-red-300 bg-red-50/20 rounded-xl text-xs outline-none font-medium uppercase disabled:bg-gray-100"
                              value={esc.motivo_no_cotillon || ''}
                              onChange={e => handleInputChange(esc.uid_estricto, 'motivo_no_cotillon', e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 bg-amber-50/10 p-4 rounded-xl border border-amber-200 flex flex-col">
                      <div className="flex justify-between items-center shrink-0">
                        <h4 className="text-[11px] font-black text-amber-800 uppercase flex items-center gap-1.5">
                          <MessageSquare size={14}/> Minuta Informativa <span className="text-red-500">*</span>
                        </h4>
                        <Info size={14} className="text-amber-500" />
                      </div>

                      <div className="grow flex flex-col">
                        <textarea 
                          disabled={isLocked}
                          placeholder="Redacte aquí la minuta general del centro de votación..." 
                          value={esc.minuta || ''} 
                          onChange={e => handleInputChange(esc.uid_estricto, 'minuta', e.target.value)}
                          rows={6}
                          className="w-full p-3 border rounded-xl text-xs bg-white outline-none focus:border-amber-500 font-medium resize-none grow disabled:bg-gray-100"
                        />
                      </div>
                    </div>
                  </div>

                  {/* CONTROLES DE GUARDADO */}
                  <div className="flex flex-col sm:flex-row justify-between items-center border-t border-gray-200 pt-4 gap-3">
                    <div className="w-full sm:w-auto">
                      {estaSincronizado && !estaEditando && (
                        <span className="text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl uppercase flex items-center gap-1.5 justify-center">
                          <CheckCircle2 size={16}/> Sincronizado Correctamente
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
                          <Edit size={16} /> Modificar Reporte
                        </button>
                      ) : (
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button 
                            type="button"
                            onClick={() => setEditandoId(null)}
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
                            {guardandoId === esc.uid_estricto ? 'Guardando...' : <><Save size={16}/> Actualizar Cambios</>}
                          </button>
                        </div>
                      )
                    ) : (
                      <button 
                        type="button"
                        disabled={guardandoId === esc.uid_estricto}
                        onClick={() => guardarCambiosCentro(esc)}
                        className="w-full sm:w-auto px-8 py-3.5 font-black rounded-xl text-xs uppercase transition-all shadow-md flex items-center justify-center gap-2 bg-[#00529b] text-white hover:bg-[#003d73]"
                      >
                        <Save size={16} /> {guardandoId === esc.uid_estricto ? 'Sincronizando...' : 'Guardar Reporte'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL CON AUTOCOMPLETADO ESTILO GOOGLE */}
      {mostrarModalNueva && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border relative">
            
            <div className="flex justify-between items-start border-b pb-3 mb-6">
              <h3 className="text-xl font-black text-[#00529b] flex items-center gap-2 uppercase">
                <School size={24} /> Añadir Centro
              </h3>
              <button onClick={() => setMostrarModalNueva(false)} className="text-gray-400 hover:text-red-500"><X size={20}/></button>
            </div>

            <form onSubmit={procesarNuevaEscuela} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-100 p-3 rounded-xl border">
                  <label className="block text-[9px] font-bold text-gray-500 uppercase">CÓDIGO SITUR</label>
                  <p className="font-mono text-sm font-black text-gray-800">{jefe?.codigo_situr}</p>
                </div>
                <div className="bg-gray-100 p-3 rounded-xl border">
                  <label className="block text-[9px] font-bold text-gray-500 uppercase">CNE VIRTUAL</label>
                  <p className="font-mono text-xs font-black text-[#00529b] flex items-center gap-1">
                    <Clock size={12}/> {cneVirtualModal}
                  </p>
                </div>
              </div>

              <div className="relative">
                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">NOMBRE DEL CENTRO</label>
                <div className="relative">
                  <input 
                    type="text" 
                    required
                    placeholder="Escriba 3 letras para buscar..."
                    className="w-full p-3 pr-10 border rounded-xl text-sm font-black uppercase text-gray-800 outline-none focus:ring-2 focus:ring-[#00529b]"
                    value={nombreBusqueda}
                    onChange={e => handleNombreChange(e.target.value)}
                  />
                  {buscandoSugerencias ? (
                    <Loader2 size={18} className="animate-spin text-gray-400 absolute right-3 top-3.5" />
                  ) : (
                    <Search size={18} className="text-gray-400 absolute right-3 top-3.5" />
                  )}
                </div>

                {/* DESPLEGABLE DE SUGERENCIAS ESTILO GOOGLE */}
                {sugerenciasCentros.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto divide-y divide-gray-100">
                    {sugerenciasCentros.map((item, idx) => (
                      <div 
                        key={idx}
                        onClick={() => seleccionarSugerencia(item)}
                        className="p-3 hover:bg-blue-50 cursor-pointer transition-colors flex flex-col"
                      >
                        <span className="font-black text-xs text-gray-800 uppercase">{item['NOMBRE CENTRO']}</span>
                        <span className="text-[10px] text-blue-600 font-bold">CNE: {item.COD_CENTRO} — {item.MUNICIPIO || 'FALCÓN'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {centroExistenteSeleccionado && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-bold">
                  ✓ Centro encontrado en la base de datos. Se enlazará con el CNE: <strong>{centroExistenteSeleccionado.COD_CENTRO}</strong>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setMostrarModalNueva(false)}
                  className="w-1/3 bg-gray-200 text-gray-700 font-bold p-3 rounded-xl uppercase text-xs"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={guardandoNueva}
                  className="w-2/3 font-black p-3 rounded-xl uppercase text-xs text-white bg-[#00529b] flex items-center justify-center gap-2"
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
