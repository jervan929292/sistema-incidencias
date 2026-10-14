'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { School, UserCheck, Save, Shield, MapPin, MessageSquare, ArrowLeft, CheckCircle2, Plus, Clock, Edit, Trash2, X, Loader2, Info, Search, Building2 } from 'lucide-react';
import Link from 'next/link';

const LISTA_ORGANISMOS = ['BOMBEROS', 'GNB', 'CPNB', 'CPMM', 'CPMC', 'CPEF', 'PC', 'CICPC', 'OTROS'];

export default function ConcejoTerritorialPage() {
  const [jefe, setJefe] = useState<any>(null);
  const [escuelas, setEscuelas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardandoId, setGuardandoId] = useState<string | number | null>(null);
  const [editandoId, setEditandoId] = useState<string | number | null>(null);

  // Estados del Modal (Manual o Autocompletado)
  const [mostrarModalNueva, setMostrarModalNueva] = useState(false);
  const [nombreBusqueda, setNombreBusqueda] = useState('');
  const [cneVirtualModal, setCneVirtualModal] = useState('');
  const [direccionModal, setDireccionModal] = useState('');
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

        const { data: userData } = await supabase
          .from('directorio_operativo')
          .select('*')
          .ilike('email', emailABuscar)
          .maybeSingle();

        if (!userData) {
          setLoading(false);
          return;
        }

        setJefe(userData);
        const siturCodigo = (userData.codigo_situr || userData.situr || '').toString().trim();

        if (siturCodigo) {
          const { data: misCentros } = await supabase
            .from('centros_registrados_organismos')
            .select('*')
            .eq('codigo_situr', siturCodigo)
            .order('created_at', { ascending: false });

          setEscuelas(misCentros || []);
        }
      } catch (err) {
        console.error("Error al cargar datos:", err);
      } finally {
        setLoading(false);
      }
    };
    cargarDatos();
  }, []);

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
    }
  };

  const seleccionarSugerencia = (centro: any) => {
    const nombreC = centro['NOMBRE CENTRO'] || centro.nombre_centro;
    const codC = centro.COD_CENTRO || centro.cod_centro;
    const dirC = centro.DIRECCION || centro.direccion;

    setNombreBusqueda(nombreC);
    setCneVirtualModal(codC || '');
    setDireccionModal(dirC || '');
    setCentroExistenteSeleccionado(centro);
    setSugerenciasCentros([]);
  };

  const handleInputChange = (id: string | number, campo: string, valor: any) => {
    setEscuelas(prev => prev.map(esc => esc.id === id ? { ...esc, [campo]: valor } : esc));
  };

  const toggleOrganismoPresente = (escuelaId: string | number, organismo: string) => {
    setEscuelas(prev => prev.map(esc => {
      if (esc.id === escuelaId) {
        const listaActual: string[] = esc.organismos_presentes || [];
        const yaExiste = listaActual.includes(organismo);
        const nuevaLista = yaExiste 
          ? listaActual.filter(o => o !== organismo) 
          : [...listaActual, organismo];
        return { ...esc, organismos_presentes: nuevaLista };
      }
      return esc;
    }));
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
      alert("⚠️ ALTO: Debe escribir obligatoriamente el motivo por el cual no se entregó cotillón.");
      return;
    }

    if (!escuela.organismos_presentes || escuela.organismos_presentes.length === 0) {
      alert("⚠️ ALTO: Seleccione al menos un organismo presente en el centro.");
      return;
    }

    if (!escuela.minuta || escuela.minuta.trim() === '') {
      alert("⚠️ ALTO: Debe redactar la minuta informativa.");
      return;
    }

    setGuardandoId(escuela.id);
    try {
      const payload = {
        responsable_cne: escuela.responsable_cne.trim().toUpperCase(),
        responsable_mesa: escuela.responsable_mesa.trim().toUpperCase(),
        entrega_cotillon: escuela.entrega_cotillon,
        motivo_no_cotillon: escuela.entrega_cotillon === 'NO' ? escuela.motivo_no_cotillon.trim().toUpperCase() : null,
        organismos_presentes: escuela.organismos_presentes,
        minuta: escuela.minuta.trim(),
        estatus: 'CERRADO',
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('centros_registrados_organismos')
        .update(payload)
        .eq('id', escuela.id);

      if (error) throw error;
      
      alert(`✅ ÉXITO: Reporte guardado correctamente.`);
      window.location.reload(); 
    } catch (err: any) {
      alert("Error al guardar: " + err.message);
      setGuardandoId(null);
    }
  };

  const eliminarEscuela = async (id: string | number, nombreEscuela: string) => {
    if (confirm(`⚠️ ALERTA: ¿Está seguro que desea ELIMINAR el centro "${nombreEscuela}"?`)) {
      try {
        const { error } = await supabase.from('centros_registrados_organismos').delete().eq('id', id);
        if (error) throw error;
        alert(`Centro eliminado con éxito.`);
        setEscuelas(prev => prev.filter(e => e.id !== id));
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
      const siturActual = jefe?.codigo_situr || jefe?.situr;
      const comunaActual = jefe?.comuna_o_circuito_comunal || jefe?.circuito || '';
      
      let codCentroFinal = cneVirtualModal.trim();
      if (!codCentroFinal) {
        codCentroFinal = `${siturActual || 'N/A'}-${escuelas.length + 1}`;
      }

      let direccionFinal = direccionModal.trim();
      if (!direccionFinal) {
        direccionFinal = 'DIRECCIÓN EN EVALUACIÓN';
      }

      let municipioFinal = jefe?.municipio || 'SIN MUNICIPIO';
      let parroquiaFinal = jefe?.parroquia || 'SIN PARROQUIA';

      const muniUpper = municipioFinal.toString().trim().toUpperCase();
      const municipioConPrefijo = muniUpper.startsWith('MP.') ? muniUpper : `MP. ${muniUpper}`;

      const payload = {
        cod_centro: codCentroFinal.toUpperCase(),
        codigo_situr: siturActual,
        nombre_centro: nombreBusqueda.trim().toUpperCase(),
        direccion: direccionFinal.toUpperCase(),
        municipio: municipioConPrefijo,
        parroquia: parroquiaFinal.toString().trim().toUpperCase(),
        circuito_comunal: comunaActual.toString().trim().toUpperCase(),
        organismo: (jefe?.organismo_responsable || jefe?.organismo || 'S/O').toUpperCase(),
        funcionario_nombre: `${jefe?.grado_jerarquia || ''} ${jefe?.nombre_apellido_jefe || jefe?.jefe || ''}`.trim().toUpperCase(),
        funcionario_rango: jefe?.grado_jerarquia || jefe?.rango || 'Funcionario',
        funcionario_telefono: jefe?.telefono_cuadrante || jefe?.telefono || 'S/N',
        organismos_presentes: [],
        estatus: 'PENDIENTE'
      };

      const { error } = await supabase.from('centros_registrados_organismos').insert([payload]);
      if (error) throw error;

      alert(`✅ Centro registrado con éxito bajo tu jurisdicción (${municipioConPrefijo}).`);
      setMostrarModalNueva(false);
      window.location.reload(); 
    } catch (err: any) {
      alert("Error al registrar el centro: " + err.message);
    } finally {
      setGuardandoNueva(false);
    }
  };

  if (loading) return <div className="p-8 text-center font-bold animate-pulse text-[#00529b]">Cargando centros...</div>;

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
              <p className="flex items-center gap-2"><Shield size={16} className="text-amber-500" /> Organismo: <span className="text-gray-900">{jefe?.organismo_responsable || jefe?.organismo}</span></p>
              <p className="flex items-center gap-2"><UserCheck size={16} className="text-blue-500" /> Funcionario: <span className="text-gray-900">{jefe?.grado_jerarquia || jefe?.rango} {jefe?.nombre_apellido_jefe || jefe?.jefe}</span></p>
              <p className="flex items-center gap-2"><MapPin size={16} className="text-emerald-500" /> Jurisdicción: <span className="text-gray-900">{jefe?.municipio} - {jefe?.parroquia}</span></p>
            </div>
            <div className="inline-block bg-gray-100 text-gray-800 text-xs px-3 py-1 rounded-md font-black border uppercase mt-1">
              Circuito Comunal: {jefe?.comuna_o_circuito_comunal || jefe?.circuito || 'N/A'}
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 px-6 py-4 rounded-xl flex flex-col items-center shadow-inner">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Llave SITUR</span>
            <span className="text-2xl font-mono font-black text-[#00529b]">{jefe?.codigo_situr || jefe?.situr || 'SIN LLAVE'}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <button 
            onClick={() => {
              setNombreBusqueda('');
              setCneVirtualModal(`${jefe?.codigo_situr || jefe?.situr || 'SITUR'}-${escuelas.length + 1}`);
              setDireccionModal('');
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
              <p className="text-xs text-gray-400 mt-1">Presiona el botón superior para agregar los centros electorales de tu circuito.</p>
            </div>
          ) : (
            escuelas.map((esc, index) => {
              const estaSincronizado = esc.estatus === 'CERRADO';
              const estaEditando = editandoId === esc.id;
              const isLocked = estaSincronizado && !estaEditando;
              const listaOrganismosSeleccionados: string[] = esc.organismos_presentes || [];
              
              return (
                <div key={esc.id} className={`bg-white rounded-2xl border p-6 shadow-sm flex flex-col gap-6 relative overflow-hidden transition-all ${estaSincronizado ? 'border-emerald-200 bg-emerald-50/5' : 'border-gray-200'} ${estaEditando ? 'ring-2 ring-amber-300' : ''}`}>
                  
                  <div className={`absolute top-0 right-0 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl flex items-center gap-2 ${estaSincronizado ? (estaEditando ? 'bg-amber-500' : 'bg-emerald-600') : 'bg-amber-500'}`}>
                    {estaSincronizado ? (estaEditando ? 'MODO EDICIÓN' : 'REGISTRADO') : `CENTRO ${index + 1} DE ${escuelas.length}`}
                  </div>

                  <div className="border-b pb-4 flex justify-between items-start mt-2">
                    <div>
                      <div className="flex items-center gap-2 text-[#00529b] mb-1">
                        <School size={20} />
                        <span className="text-xs font-black">CNE: {esc.cod_centro}</span>
                      </div>
                      <h3 className="text-base font-black text-gray-800 uppercase">{esc.nombre_centro}</h3>
                      <p className="text-xs text-gray-500 font-medium">{esc.direccion}</p>
                    </div>
                    
                    <button 
                      onClick={() => eliminarEscuela(esc.id, esc.nombre_centro)}
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
                            onChange={e => handleInputChange(esc.id, 'responsable_cne', e.target.value)} 
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
                            onChange={e => handleInputChange(esc.id, 'responsable_mesa', e.target.value)} 
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
                              onClick={() => handleInputChange(esc.id, 'entrega_cotillon', 'SI')}
                              className={`flex-1 p-2.5 rounded-xl text-xs font-black transition-all border ${esc.entrega_cotillon === 'SI' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-gray-400 border-gray-200'} ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              SÍ
                            </button>
                            <button 
                              type="button"
                              disabled={isLocked}
                              onClick={() => handleInputChange(esc.id, 'entrega_cotillon', 'NO')}
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
                              onChange={e => handleInputChange(esc.id, 'motivo_no_cotillon', e.target.value)}
                            />
                          </div>
                        )}

                        <div className="pt-2">
                          <label className="block text-[10px] font-black text-gray-600 uppercase mb-2 flex items-center gap-1">
                            <Building2 size={12} className="text-[#00529b]" /> Organismos Presentes en el Centro <span className="text-red-500">*</span>
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {LISTA_ORGANISMOS.map(org => {
                              const seleccionado = listaOrganismosSeleccionados.includes(org);
                              return (
                                <button
                                  key={org}
                                  type="button"
                                  disabled={isLocked}
                                  onClick={() => toggleOrganismoPresente(esc.id, org)}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black border transition-all ${
                                    seleccionado 
                                      ? 'bg-[#00529b] text-white border-[#00529b] shadow-sm' 
                                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                                  } ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                                >
                                  {seleccionado ? `✓ ${org}` : `+ ${org}`}
                                </button>
                              );
                            })}
                          </div>
                        </div>

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
                          onChange={e => handleInputChange(esc.id, 'minuta', e.target.value)}
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
                          onClick={() => setEditandoId(esc.id)}
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
                            disabled={guardandoId === esc.id}
                            onClick={() => guardarCambiosCentro(esc)}
                            className="flex-1 sm:flex-none px-8 py-3.5 font-black rounded-xl text-xs uppercase transition-all shadow-md flex items-center justify-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                          >
                            {guardandoId === esc.id ? 'Guardando...' : <><Save size={16}/> Actualizar Cambios</>}
                          </button>
                        </div>
                      )
                    ) : (
                      <button 
                        type="button"
                        disabled={guardandoId === esc.id}
                        onClick={() => guardarCambiosCentro(esc)}
                        className="w-full sm:w-auto px-8 py-3.5 font-black rounded-xl text-xs uppercase transition-all shadow-md flex items-center justify-center gap-2 bg-[#00529b] text-white hover:bg-[#003d73]"
                      >
                        <Save size={16} /> {guardandoId === esc.id ? 'Sincronizando...' : 'Guardar Reporte'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL CON CAMPOS MANUALES DE CNE Y DIRECCIÓN */}
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
                  <p className="font-mono text-sm font-black text-gray-800">{jefe?.codigo_situr || jefe?.situr}</p>
                </div>
                
                {/* CÓDIGO CNE MANUAL / EDITABLE */}
                <div className="bg-white p-2.5 rounded-xl border border-gray-300 focus-within:border-[#00529b]">
                  <label className="block text-[9px] font-bold text-gray-500 uppercase">CÓDIGO CNE</label>
                  <input 
                    type="text"
                    required
                    placeholder="Ej. 11-01-0001"
                    className="w-full font-mono text-xs font-black text-[#00529b] outline-none uppercase bg-transparent mt-0.5"
                    value={cneVirtualModal}
                    onChange={e => setCneVirtualModal(e.target.value)}
                  />
                </div>
              </div>

              <div className="relative">
                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">NOMBRE DEL CENTRO</label>
                <div className="relative">
                  <input 
                    type="text" 
                    required
                    placeholder="Escriba 3 letras para buscar o nombre manual..."
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

                {sugerenciasCentros.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto divide-y divide-gray-100">
                    {sugerenciasCentros.map((item, idx) => {
                      const nombreC = item['NOMBRE CENTRO'] || item.nombre_centro;
                      const codC = item.COD_CENTRO || item.cod_centro;
                      return (
                        <div 
                          key={idx}
                          onClick={() => seleccionarSugerencia(item)}
                          className="p-3 hover:bg-blue-50 cursor-pointer transition-colors flex flex-col"
                        >
                          <span className="font-black text-xs text-gray-800 uppercase">{nombreC}</span>
                          <span className="text-[10px] text-blue-600 font-bold">CNE: {codC}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* CAMPO DE DIRECCIÓN MANUAL / EDITABLE */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">DIRECCIÓN DEL CENTRO</label>
                <textarea 
                  required
                  rows={2}
                  placeholder="Escriba la dirección o ubicación detallada..."
                  className="w-full p-3 border rounded-xl text-xs font-medium uppercase text-gray-800 outline-none focus:ring-2 focus:ring-[#00529b] resize-none"
                  value={direccionModal}
                  onChange={e => setDireccionModal(e.target.value)}
                />
              </div>

              {centroExistenteSeleccionado && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-bold">
                  ✓ Seleccionado del catálogo CNE.
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
