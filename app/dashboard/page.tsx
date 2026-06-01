'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ShieldCheck, Loader2, AlertCircle, CheckCircle2, MapPin, FileText, Users, HelpCircle, ChevronDown, Activity } from 'lucide-react';

// ==========================================
// LISTA EXTRAÍDA DE TU ARCHIVO EXCEL
// ==========================================
const LISTA_ORGANISMOS = [
  "Cuerpo de Investigaciones Científicas Penales y Criminalísticas",
  "Dirección de Atención Integral Penitenciaria",
  "Dirección General de Bomberos y Bomberas",
  "Direccion General de Cuadrantes de Paz",
  "Dirección General de los Centros de Comando, Control y Telecomunicaciones",
  "Dirección General de Prevención del Delito",
  "Guardia Nacional bolivariana",
  "Instituto Nacional Contra la Discriminación Racial",
  "Instituto Nacional de Meteorología e Hidrología",
  "Instituto Nacional de Transporte Terrestre",
  "Oficina Nacional Contra la Delincuencia Organizada y Financiamiento al Terrorismo",
  "Oficina Nacional para La Atención Integral de las Victimas",
  "Otros",
  "Policía Estadal",
  "Policía Municipal",
  "Policía Nacional Bolivariana",
  "Protección Civil y Administración de Desastre",
  "Servicio Autónomo de Identificación, Migración y Extranjería",
  "Servicio Autónomo de Registros y Notarias",
  "Servicio Nacional para el Desarme",
  "Sistema Nacional de Medicina Forense",
  "Superintendencia Nacional Antidrogas",
  "Universidad Nacional Experimental de la Seguridad"
];

export default function UserDashboardPage() {
  const router = useRouter();
  const [usuarioLogueado, setUsuarioLogueado] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  
  // ESTADO NUEVO: Contador de reportes del circuito
  const [totalReportes, setTotalReportes] = useState(0);

  // Catálogos descargados de la Base de Datos
  const [clasificaciones, setClasificaciones] = useState<any[]>([]);
  const [allIncidencias, setAllIncidencias] = useState<any[]>([]);
  const [allActividades, setAllActividades] = useState<any[]>([]);
  const [misSectores, setMisSectores] = useState<any[]>([]);

  // Desplegables en Cascada Filtrados
  const [incidenciasFiltradas, setIncidenciasFiltradas] = useState<any[]>([]);
  const [actividadesFiltradas, setActividadesFiltradas] = useState<any[]>([]);

  // Mensajes de Interfaz
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ESTADO DEL FORMULARIO DE REPORTE
  const [reporteEspecial, setReporteEspecial] = useState(false);
  const [dropdownOrganismosAbierto, setDropdownOrganismosAbierto] = useState(false);
  const [form, setForm] = useState({
    clasificacion: '',
    incidencia: '',
    actividad: '',
    cantidad: 1,
    circuito_comunal: '',
    sector_especifico: '',
    organismos_involucrados: [] as string[],
    lugar_actividad: '',
    resena: '',
    observacion: ''
  });

  useEffect(() => {
    const initDashboard = async () => {
      // 1. Verificar sesión activa
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      // 2. Obtener datos de la ficha del usuario logueado
      const { data: userData } = await supabase.from('directorio_operativo').select('*').eq('id', user.id).single();
      if (!userData) { router.push('/login'); return; }
      
      setUsuarioLogueado(userData);
      setForm(prev => ({ ...prev, circuito_comunal: userData.comuna_o_circuito_comunal || '' }));

      // NUEVO: Consultar cuántos reportes tiene este circuito comunal en la BD
      if (userData.comuna_o_circuito_comunal) {
        const { count } = await supabase
          .from('incidencias')
          .select('*', { count: 'exact', head: true })
          .eq('circuito_comunal', userData.comuna_o_circuito_comunal);
        
        if (count !== null) setTotalReportes(count);
      }

      // 3. Descargar Catálogos del Excel desde Supabase
      const { data: catClas } = await supabase.from('catalogo_clasificacion').select('*').order('nombre', { ascending: true });
      const { data: catInc } = await supabase.from('catalogo_incidencia').select('*').order('nombre', { ascending: true });
      const { data: catAct } = await supabase.from('catalogo_actividad').select('*').order('nombre', { ascending: true });
      
      // Descargar sectores asignados a este SITUR
      const { data: secs } = await supabase.from('sectores').select('*').eq('codigo_situr', userData.codigo_situr);

      if (catClas) setClasificaciones(catClas);
      if (catInc) setAllIncidencias(catInc);
      if (catAct) setAllActividades(catAct);
      if (secs) setMisSectores(secs);

      setLoading(false);
    };

    initDashboard();
  }, [router]);

  // ==========================================
  // MANEJADORES DE CASCADA (FILTRADO DINÁMICO)
  // ==========================================
  const handleClasificacionChange = (valor: string) => {
    const selectedClas = clasificaciones.find(c => c.nombre === valor);
    setForm(prev => ({ ...prev, clasificacion: valor, incidencia: '', actividad: '' }));
    setActividadesFiltradas([]);
    
    if (selectedClas) {
      const filtradas = allIncidencias.filter(i => i.clasificacion_id === selectedClas.id);
      setIncidenciasFiltradas(filtradas);
    } else {
      setIncidenciasFiltradas([]);
    }
  };

  const handleIncidenciaChange = (valor: string) => {
    const selectedInc = allIncidencias.find(i => i.nombre === valor);
    setForm(prev => ({ ...prev, incidencia: valor, actividad: '' }));
    
    if (selectedInc) {
      const filtradas = allActividades.filter(a => a.incidencia_id === selectedInc.id);
      setActividadesFiltradas(filtradas);
    } else {
      setActividadesFiltradas([]);
    }
  };

  // Función para agregar o quitar organismos de la lista
  const toggleOrganismo = (org: string) => {
    setForm(prev => {
      const actual = prev.organismos_involucrados;
      if (actual.includes(org)) {
        return { ...prev, organismos_involucrados: actual.filter(o => o !== org) };
      } else {
        return { ...prev, organismos_involucrados: [...actual, org] };
      }
    });
  };

  // ==========================================
  // ENVÍO DEL REPORTE DIARIO A SUPABASE
  // ==========================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (reporteEspecial && !form.observacion.trim()) {
      setErrorMsg("Al activar un 'Reporte Especial' debe justificar obligatoriamente en el cuadro de observaciones por qué realizó la actividad fuera de su sector.");
      setEnviando(false);
      return;
    }

    if (form.organismos_involucrados.length === 0) {
      setErrorMsg("Debe seleccionar al menos un Organismo Involucrado en la lista desplegable.");
      setEnviando(false);
      return;
    }

    try {
      const lugarCompleto = `${form.lugar_actividad} (Sector: ${form.sector_especifico})`;
      const organismosTexto = form.organismos_involucrados.join(' - ').toUpperCase();

      const payload = {
        usuario_id: usuarioLogueado.id,
        clasificacion: form.clasificacion,
        incidencia: form.incidencia,
        actividad: form.actividad,
        cantidad: Number(form.cantidad),
        circuito_comunal: form.circuito_comunal.toUpperCase().trim(),
        organismos_involucrados: organismosTexto,
        lugar_actividad: lugarCompleto,
        resena: form.resena,
        observacion: form.observacion
      };

      const { error } = await supabase.from('incidencias').insert([payload]);
      if (error) throw error;

      setSuccessMsg("¡Reporte de Incidencia enviado con éxito al Centro de Comando VEN 911!");
      
      // Sumar 1 al contador visual de reportes en tiempo real
      if (!reporteEspecial) {
        setTotalReportes(prev => prev + 1);
      }
      
      setForm({
        clasificacion: '',
        incidencia: '',
        actividad: '',
        cantidad: 1,
        circuito_comunal: usuarioLogueado.comuna_o_circuito_comunal || '',
        sector_especifico: '',
        organismos_involucrados: [],
        lugar_actividad: '',
        resena: '',
        observacion: ''
      });
      setReporteEspecial(false);
      setDropdownOrganismosAbierto(false);

    } catch (error: any) {
      setErrorMsg("Fallo al guardar reporte: " + error.message);
    } finally {
      setEnviando(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5]"><p className="text-xl font-bold text-gray-700 animate-pulse">Cargando Panel Operativo...</p></div>;

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <div className="max-w-screen-xl mx-auto p-6">
        
        {/* CABECERA INSTITUCIONAL CON EL NUEVO CONTADOR */}
        <div className="bg-white rounded-3xl shadow-sm p-6 mb-6 flex flex-col md:flex-row justify-between items-center gap-6 border-b-4 border-[#00529b]">
          <div className="flex gap-8 items-center">
            <img src="/logo1.png" alt="VEN 911" className="h-16 w-auto object-contain" />
            <img src="/logo2.png" alt="CUPAZ" className="h-16 w-auto object-contain" />
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-gray-50 p-3 rounded-2xl border w-full md:w-auto">
            <div className="text-center sm:text-right w-full sm:w-auto">
              <p className="text-sm font-black text-gray-800">{usuarioLogueado?.grado_jerarquia} {usuarioLogueado?.nombre_apellido_jefe}</p>
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wide">SITUR: {usuarioLogueado?.codigo_situr}</p>
              
              {/* ETIQUETA CONTADOR DE REPORTES */}
              <div className="mt-2 inline-flex items-center gap-1.5 bg-emerald-100 border border-emerald-200 text-emerald-800 px-3 py-1 rounded-full shadow-sm">
                <Activity size={14} className="text-emerald-600" />
                <span className="text-[10px] font-black uppercase tracking-wider">{totalReportes} Novedades Registradas</span>
              </div>

            </div>
            <button onClick={handleLogout} className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-100 transition-all shadow-sm w-full sm:w-auto mt-2 sm:mt-0">Cerrar Sesión</button>
          </div>
        </div>

        {/* CONTENEDOR CENTRAL DE CARGA DE INCIDENCIAS */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-gray-100 max-w-4xl mx-auto">
          
          <div className="border-b pb-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                <ShieldCheck className="text-[#00529b]" size={26} />
                Formulario de Novedades Diarias
              </h2>
              <p className="text-xs text-gray-500 font-semibold mt-1">Carga cuantitativa de actividades ejecutadas en territorio</p>
            </div>

            {/* BOTÓN / SWITCH DE REPORTE ESPECIAL */}
            <label className="flex items-center gap-2 bg-amber-50 border border-amber-200 p-2.5 rounded-xl cursor-pointer hover:bg-amber-100/70 transition-all select-none">
              <input 
                type="checkbox" 
                className="w-4 h-4 accent-amber-600 cursor-pointer" 
                checked={reporteEspecial} 
                onChange={(e) => {
                  setReporteEspecial(e.target.checked);
                  setForm(prev => ({
                    ...prev,
                    circuito_comunal: e.target.checked ? '' : (usuarioLogueado?.comuna_o_circuito_comunal || ''),
                    observacion: ''
                  }));
                }} 
              />
              <div className="text-left">
                <p className="text-[11px] font-black text-amber-800 leading-none">REPORTE ESPECIAL</p>
                <p className="text-[9px] text-amber-600 font-medium mt-0.5">Actividades fuera de jurisdicción</p>
              </div>
            </label>
          </div>

          {/* MENSAJES INFORMATIVOS */}
          {errorMsg && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 animate-fade-in">
              <AlertCircle size={18} className="shrink-0" /> <p>{errorMsg}</p>
            </div>
          )}
          {successMsg && (
            <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 animate-fade-in">
              <CheckCircle2 size={18} className="shrink-0" /> <p>{successMsg}</p>
            </div>
          )}

          {/* CUERPO DEL FORMULARIO */}
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* BLOQUE TERRITORIAL */}
            <div className="p-4 bg-slate-50 border rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                  <MapPin size={14} className="text-[#00529b]" /> Circuito Comunal Responsable
                </label>
                <input 
                  type="text" 
                  required
                  disabled={!reporteEspecial}
                  className="w-full p-2.5 border rounded-lg font-bold bg-white text-gray-800 uppercase disabled:bg-gray-100 disabled:text-gray-500 outline-none"
                  placeholder="Ej: SOCIALISTA LA GRAN VICTORIA"
                  value={form.circuito_comunal}
                  onChange={e => setForm({ ...form, circuito_comunal: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                  <Users size={14} className="text-[#00529b]" /> Sector de la Actividad
                </label>
                {reporteEspecial ? (
                  <input 
                    type="text" 
                    required
                    className="w-full p-2.5 border rounded-lg font-bold bg-white text-gray-800 uppercase outline-none focus:ring-2 focus:ring-[#00529b]"
                    placeholder="Escriba el sector ajeno..."
                    value={form.sector_especifico}
                    onChange={e => setForm({ ...form, sector_especifico: e.target.value })}
                  />
                ) : (
                  <select 
                    required
                    className="w-full p-2.5 border rounded-lg bg-white text-sm font-bold text-gray-700 outline-none cursor-pointer focus:ring-2 focus:ring-[#00529b]"
                    value={form.sector_especifico}
                    onChange={e => setForm({ ...form, sector_especifico: e.target.value })}
                  >
                    <option value="">Seleccione uno de sus sectores ({misSectores.length})</option>
                    {misSectores.map((s, i) => <option key={i} value={s.nombre_sector}>{s.nombre_sector}</option>)}
                  </select>
                )}
              </div>
            </div>

            {/* SELECCIÓN DINÁMICA EN CASCADA */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">1. Clasificación</label>
                <select 
                  required
                  className="w-full p-2.5 border rounded-lg bg-white text-xs font-bold text-gray-700 outline-none cursor-pointer focus:ring-2 focus:ring-[#00529b]"
                  value={form.clasificacion}
                  onChange={e => handleClasificacionChange(e.target.value)}
                >
                  <option value="">Seleccione Clasificación</option>
                  {clasificaciones.map((c, i) => <option key={i} value={c.nombre}>{c.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">2. Incidencia</label>
                <select 
                  required
                  disabled={incidenciasFiltradas.length === 0}
                  className="w-full p-2.5 border rounded-lg bg-white text-xs font-bold text-gray-700 outline-none cursor-pointer disabled:bg-gray-50 focus:ring-2 focus:ring-[#00529b]"
                  value={form.incidencia}
                  onChange={e => handleIncidenciaChange(e.target.value)}
                >
                  <option value="">Seleccione Incidencia</option>
                  {incidenciasFiltradas.map((i, idx) => <option key={idx} value={i.nombre}>{i.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">3. Actividad Detallada</label>
                <select 
                  required
                  disabled={actividadesFiltradas.length === 0}
                  className="w-full p-2.5 border rounded-lg bg-white text-xs font-bold text-gray-700 outline-none cursor-pointer disabled:bg-gray-50 focus:ring-2 focus:ring-[#00529b]"
                  value={form.actividad}
                  onChange={e => setForm({ ...form, actividad: e.target.value })}
                >
                  <option value="">Seleccione Actividad</option>
                  {actividadesFiltradas.map((a, idx) => <option key={idx} value={a.nombre}>{a.nombre}</option>)}
                </select>
              </div>
            </div>

            {/* CANTIDAD Y ORGANISMOS MULTI-SELECCIÓN */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-gray-600 mb-1">Cantidad de Actividades</label>
                <input 
                  type="number" 
                  required 
                  min={1} 
                  className="w-full p-2.5 border rounded-lg bg-white text-sm font-bold text-gray-800 focus:ring-2 focus:ring-[#00529b]" 
                  value={form.cantidad}
                  onChange={e => setForm({ ...form, cantidad: Number(e.target.value) })}
                />
              </div>

              <div className="md:col-span-2 relative">
                <label className="block text-xs font-bold text-gray-600 mb-1">Organismos Involucrados</label>
                
                <div 
                  onClick={() => setDropdownOrganismosAbierto(!dropdownOrganismosAbierto)}
                  className={`w-full p-2.5 border rounded-lg bg-white text-sm font-bold cursor-pointer flex justify-between items-center transition-all ${dropdownOrganismosAbierto ? 'ring-2 ring-[#00529b] border-[#00529b]' : 'border-gray-300'} ${form.organismos_involucrados.length > 0 ? 'text-[#00529b]' : 'text-gray-500'}`}
                >
                  <span className="truncate">
                    {form.organismos_involucrados.length > 0 
                      ? `${form.organismos_involucrados.length} Organismo(s) seleccionado(s)` 
                      : "Seleccione organismos (Obligatorio)..."}
                  </span>
                  <ChevronDown size={18} className={`transition-transform duration-200 ${dropdownOrganismosAbierto ? 'rotate-180 text-[#00529b]' : 'text-gray-400'}`} />
                </div>

                {dropdownOrganismosAbierto && (
                  <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] overflow-hidden">
                    <div className="max-h-56 overflow-y-auto p-1 divide-y divide-gray-50">
                      {LISTA_ORGANISMOS.map((org, idx) => (
                        <label key={idx} className="flex items-center gap-3 p-3 hover:bg-blue-50 cursor-pointer transition-colors group">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 accent-[#00529b] cursor-pointer rounded border-gray-300"
                            checked={form.organismos_involucrados.includes(org)}
                            onChange={() => toggleOrganismo(org)}
                          />
                          <span className="text-[11px] font-bold text-gray-700 group-hover:text-[#00529b] leading-tight">{org}</span>
                        </label>
                      ))}
                    </div>
                    <div className="p-3 bg-gray-50 border-t text-center">
                      <button 
                        type="button" 
                        onClick={() => setDropdownOrganismosAbierto(false)} 
                        className="text-xs font-black tracking-wide text-[#00529b] uppercase hover:underline w-full"
                      >
                        Confirmar y Cerrar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* LUGAR PRE_DISEÑADO */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                <MapPin size={14} className="text-gray-400" /> Dirección o Punto de Referencia
              </label>
              <input 
                type="text" 
                required 
                placeholder="Ej: Av. Principal Rafael Gallardo frente a la pasarela" 
                className="w-full p-2.5 border rounded-lg bg-white text-sm font-medium text-gray-800 focus:ring-2 focus:ring-[#00529b]" 
                value={form.lugar_actividad}
                onChange={e => setForm({ ...form, lugar_actividad: e.target.value })}
              />
            </div>

            {/* TEXTAREAS DE DETALLES */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                <FileText size={14} className="text-gray-400" /> Reseña Informativa
              </label>
              <textarea 
                rows={3} 
                required
                placeholder="Describa brevemente cómo se llevó a cabo el despliegue..."
                className="w-full p-2.5 border rounded-lg bg-white text-sm font-medium text-gray-800 focus:ring-2 focus:ring-[#00529b]"
                value={form.resena}
                onChange={e => setForm({ ...form, resena: e.target.value })}
              />
            </div>

            {/* CUADRO DE OBSERVACIONES OBLIGATORIO PARA REPORTES ESPECIALES */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                <HelpCircle size={14} className={reporteEspecial ? "text-amber-600" : "text-gray-400"} /> 
                Observaciones / Justificación de la Incidencia {reporteEspecial && <span className="text-amber-600 font-extrabold">(REQUERIDO)</span>}
              </label>
              <textarea 
                rows={2} 
                required={reporteEspecial}
                placeholder={reporteEspecial ? "Escriba aquí la justificación (Ej: Por orden del Comisario Garcés en apoyo al circuito vecino...)" : "Notas u observaciones adicionales (Opcional)..."}
                className={`w-full p-2.5 border rounded-lg bg-white text-sm font-medium text-gray-800 focus:ring-2 outline-none transition-all ${reporteEspecial ? 'border-amber-400 focus:ring-amber-500 bg-amber-50/20' : 'focus:ring--[#00529b]'}`}
                value={form.observacion}
                onChange={e => setForm({ ...form, observacion: e.target.value })}
              />
            </div>

            {/* BOTÓN DE GUARDADO */}
            <button 
              type="submit" 
              disabled={enviando}
              className="w-full bg-[#00529b] text-white p-4 rounded-xl font-black uppercase tracking-wide hover:bg-[#003d73] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
            >
              {enviando ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Transmitiendo Novedad...
                </>
              ) : (
                'TRANSMITIR REPORTE AL VEN 911'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}