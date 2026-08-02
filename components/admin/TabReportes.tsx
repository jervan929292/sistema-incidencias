'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, ShieldAlert, Activity, ShieldCheck, Siren, Target, Award, TrendingUp, TrendingDown, Info, Loader2, Database, X } from 'lucide-react';

const LISTA_ORGANISMOS = [
  "CICPC",
  "CUERPO DE POLICIA NACIONAL BOLIVARIANA",
  "GUARDIA NACIONAL BOLIVARIANA",
  "POLICIA DEL ESTADO FALCON",
  "POLICIA MUNICIPAL DE CARIRUBANA",
  "POLICIA MUNICIPAL DE MIRANDA"
];

const getSiglas = (organismo: string) => {
  const orgLow = (organismo || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (orgLow.includes('cicpc')) return 'CICPC';
  if (orgLow.includes('cuerpo de policia nacional bolivariana') || orgLow.includes('pnb') || orgLow.includes('cpnb')) return 'CPNB';
  if (orgLow.includes('guardia nacional bolivariana') || orgLow.includes('gnb')) return 'GNB';
  if (orgLow.includes('policia del estado falcon') || orgLow.includes('estadal') || orgLow.includes('polifalcon')) return 'POLIFALCÓN';
  if (orgLow.includes('policia municipal de carirubana')) return 'POLICARIRUBANA';
  if (orgLow.includes('policia municipal de miranda')) return 'POLIMIRANDA';
  return organismo || 'SIN ORGANISMO';
};

const matchesOrganismo = (dbValue: string, targetOrg: string) => {
  if (!targetOrg) return true;
  const normalize = (s: string) => (s || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  return normalize(dbValue) === normalize(targetOrg);
};

export default function TabReportes({ adminUser, esSuperUser, isReadOnlyVen911 }: any) {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [incidenciasDB, setIncidenciasDB] = useState<any[]>([]);
  
  // Estados de Carga Progresiva
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filtros de Reportes
  const [fechaRepDesde, setFechaRepDesde] = useState('');
  const [fechaRepHasta, setFechaRepHasta] = useState('');
  const [filtroRepOrganismo, setFiltroRepOrganismo] = useState('');
  const [circuitoInfoSeleccionado, setCircuitoInfoSeleccionado] = useState<string | null>(null);

  useEffect(() => {
    fetchDatosAnaliticos();
  }, []);

  const fetchDatosAnaliticos = async () => {
    setLoading(true);
    setProgress(0);
    setTotalRecords(0);

    const isSuper = adminUser.rol === 'superusuario';
    const isReadVen911 = adminUser.organismo_responsable === 'VEN 911' && !isSuper;
    const veTodo = isSuper || isReadVen911;

    // 1. Cargar Usuarios para cruzar organismos
    const { data: usersData } = await supabase.from('directorio_operativo').select('comuna_o_circuito_comunal, organismo_responsable, municipio, parroquia, nombre_apellido_jefe, grado_jerarquia, telefono_celular_jefe');
    let usuariosProcesados = usersData || [];
    
    if (!veTodo && adminUser.organismo_responsable) {
      usuariosProcesados = usuariosProcesados.filter(u => matchesOrganismo(u.organismo_responsable, adminUser.organismo_responsable));
    }
    setUsuarios(usuariosProcesados);
    const circuitosPermitidos = new Set(usuariosProcesados.map(u => u.comuna_o_circuito_comunal));

    // 2. Cargar total esperado
    const { count } = await supabase.from('incidencias').select('*', { count: 'exact', head: true });
    const totalEsperado = count || 0;
    setTotalRecords(totalEsperado);

    if (totalEsperado === 0) {
      setLoading(false);
      setProgress(100);
      return;
    }

    // 3. Carga Progresiva Segura (1000 en 1000)
    let todasLasIncidencias: any[] = [];
    let loteSize = 1000;
    let inicio = 0;
    let intentosFallo = 0;

    while (inicio < totalEsperado) {
      const { data: batch, error } = await supabase
        .from('incidencias')
        .select('cantidad, clasificacion, circuito_comunal, fecha_registro')
        .order('fecha_registro', { ascending: false })
        .range(inicio, inicio + loteSize - 1);

      if (error) {
        intentosFallo++;
        if (intentosFallo > 3) break;
        await new Promise(res => setTimeout(res, 1000));
        continue;
      }

      if (batch && batch.length > 0) {
        intentosFallo = 0;
        todasLasIncidencias = [...todasLasIncidencias, ...batch];
        
        // Actualizamos en vivo para que los gráficos se animen
        const validBatch = veTodo ? todasLasIncidencias : todasLasIncidencias.filter(inc => circuitosPermitidos.has(inc.circuito_comunal));
        setIncidenciasDB(validBatch);

        inicio += batch.length;
        setProgress(Math.min(100, Math.round((inicio / totalEsperado) * 100)));

        if (batch.length < loteSize) break;
      } else {
        break;
      }
    }

    setProgress(100);
    setLoading(false);
  };

  // LÓGICA DE FILTRADO PARA REPORTES
  const incidenciasReporte = incidenciasDB.filter(inc => {
    if (fechaRepDesde || fechaRepHasta) {
      if (!inc.fecha_registro) return false;
      const incTime = new Date(inc.fecha_registro).getTime();
      if (fechaRepDesde && incTime < new Date(`${fechaRepDesde}T00:00:00`).getTime()) return false;
      if (fechaRepHasta && incTime > new Date(`${fechaRepHasta}T23:59:59`).getTime()) return false;
    }

    if (filtroRepOrganismo) {
      const jefe = usuarios.find(u => u.comuna_o_circuito_comunal === inc.circuito_comunal);
      const orgDelCircuito = jefe?.organismo_responsable || '';
      if (!matchesOrganismo(orgDelCircuito, filtroRepOrganismo)) return false;
    }

    return true;
  });

  // CORRECCIÓN MATEMÁTICA: Si la cantidad es nula, vale 1
  const getCant = (val: any) => (val == null || val === '') ? 1 : Number(val);

  // MATEMÁTICAS Y ESTADÍSTICAS
  const repTotal = incidenciasReporte.reduce((sum, item) => sum + getCant(item.cantidad), 0);
  const repPreventiva = incidenciasReporte.filter(i => i.clasificacion?.toUpperCase().includes('PREVENTIVA')).reduce((sum, item) => sum + getCant(item.cantidad), 0);
  const repPatrullaje = incidenciasReporte.filter(i => i.clasificacion?.toUpperCase().includes('PATRULLAJE')).reduce((sum, item) => sum + getCant(item.cantidad), 0);
  const repEfectividad = incidenciasReporte.filter(i => i.clasificacion?.toUpperCase().includes('OPERATIVIDAD') || i.clasificacion?.toUpperCase().includes('EFECTIVIDAD')).reduce((sum, item) => sum + getCant(item.cantidad), 0);

  const pctPreventiva = repTotal > 0 ? Math.round((repPreventiva / repTotal) * 100) : 0;
  const pctPatrullaje = repTotal > 0 ? Math.round((repPatrullaje / repTotal) * 100) : 0;
  const pctEfectividad = repTotal > 0 ? Math.round((repEfectividad / repTotal) * 100) : 0;

  // RANKING DE CIRCUITOS
  const conteoCircuitos: { [key: string]: number } = {};
  incidenciasReporte.forEach(inc => {
    if (inc.circuito_comunal) {
      conteoCircuitos[inc.circuito_comunal] = (conteoCircuitos[inc.circuito_comunal] || 0) + getCant(inc.cantidad);
    }
  });
  
  const topCircuitos = Object.entries(conteoCircuitos).sort((a, b) => b[1] - a[1]).slice(0, 5) || [];
  const maxCircuitoValor = topCircuitos[0]?.[1] || 1;

  const circuitosValidosReporte = Array.from(new Set(
    usuarios.filter(u => !filtroRepOrganismo || matchesOrganismo(u.organismo_responsable, filtroRepOrganismo)).map(u => u.comuna_o_circuito_comunal)
  )).filter(Boolean);

  const bottomCircuitos = circuitosValidosReporte
    .map(c => [c, conteoCircuitos[c as string] || 0])
    .sort((a, b) => (a[1] as number) - (b[1] as number))
    .slice(0, 5);

  return (
    <div className="animate-fade-in w-full space-y-6">
      
      {/* ENCABEZADO CON BARRA DE PROGRESO INTEGRADA */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 bg-gradient-to-r from-[#00529b] to-blue-800 p-6 rounded-2xl text-white shadow-md">
        <div className="flex-1 w-full">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/20 flex items-center justify-center">
              <img src="/logo1.png" alt="Logo VEN 911" className="h-10 w-10 object-contain drop-shadow-md" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-wide">Centro de Inteligencia Analítica - Falcón</h2>
              <p className="text-blue-100 text-xs font-medium mt-0.5">Monitoreo estadístico avanzado de cuadrantes de paz y operaciones VEN 911</p>
            </div>
          </div>
          
          {loading ? (
            <div className="mt-4 w-full max-w-md bg-white/10 p-3 rounded-xl border border-white/20">
              <div className="flex justify-between text-[10px] font-bold text-white mb-1">
                <span className="flex items-center gap-1"><Database size={12} className="animate-bounce"/> Procesando Analítica...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-black/20 rounded-full h-2 overflow-hidden border border-white/10 shadow-inner">
                <div className="bg-gradient-to-r from-amber-400 to-amber-300 h-2 rounded-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-blue-100 font-bold mt-3 flex items-center gap-1">
              <Database size={14}/> Base de datos analítica lista ({totalRecords.toLocaleString()} registros computados)
            </p>
          )}
        </div>

        {/* FILTROS HEADER */}
        <div className="bg-white/10 p-3 rounded-xl backdrop-blur-md border border-white/20 flex flex-wrap items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-amber-400" />
            <input type="date" className="bg-transparent text-white text-xs outline-none font-bold cursor-text [color-scheme:dark]" value={fechaRepDesde} onChange={e => setFechaRepDesde(e.target.value)} />
          </div>
          <span className="text-blue-300 font-bold text-xs">HASTA</span>
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-amber-400" />
            <input type="date" className="bg-transparent text-white text-xs outline-none font-bold cursor-text [color-scheme:dark]" value={fechaRepHasta} onChange={e => setFechaRepHasta(e.target.value)} />
          </div>
          
          {(esSuperUser || isReadOnlyVen911) && (
            <>
              <span className="text-white/30 hidden sm:block">|</span>
              <div className="flex items-center gap-2">
                <ShieldAlert size={14} className="text-amber-400" />
                <select className="bg-transparent text-white text-xs outline-none font-bold cursor-pointer [&>option]:text-black max-w-[150px] truncate" value={filtroRepOrganismo} onChange={e => setFiltroRepOrganismo(e.target.value)}>
                  <option value="">TODOS LOS ORGANISMOS</option>
                  {LISTA_ORGANISMOS.map((org, i) => <option key={i} value={org}>{org}</option>)}
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* TARJETAS SUPERIORES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
          <div className="space-y-1">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Despliegue General</p>
            <p className="text-3xl font-black text-gray-800 leading-none">{repTotal}</p>
            <p className="text-[11px] text-blue-600 font-bold flex items-center gap-1"><TrendingUp size={12}/> Actividades totales</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-2xl text-[#00529b]"><Activity size={28} /></div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
          <div className="space-y-1">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Eje Preventivo</p>
            <p className="text-3xl font-black text-blue-600 leading-none">{repPreventiva}</p>
            <p className="text-[11px] text-gray-500 font-semibold">{pctPreventiva}% del impacto total</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-2xl text-blue-600"><ShieldCheck size={28} /></div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
          <div className="space-y-1">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Fuerza de Patrullaje</p>
            <p className="text-3xl font-black text-amber-500 leading-none">{repPatrullaje}</p>
            <p className="text-[11px] text-gray-500 font-semibold">{pctPatrullaje}% presencia territorial</p>
          </div>
          <div className="bg-amber-50 p-4 rounded-2xl text-amber-500"><Siren size={28} /></div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
          <div className="space-y-1">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Efectividad Operativa</p>
            <p className="text-3xl font-black text-emerald-600 leading-none">{repEfectividad}</p>
            <p className="text-[11px] text-gray-500 font-semibold">{pctEfectividad}% operatividad pura</p>
          </div>
          <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-500"><Target size={28} /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LADO IZQUIERDO: Gráfico de Barras */}
        <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Distribución de Carga por Clasificación</h3>
            <span className="text-[10px] bg-blue-100 text-[#00529b] font-black px-2 py-0.5 rounded-full">Porcentual</span>
          </div>
          <div className="space-y-5">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-gray-700"><span>PREVENTIVA</span><span className="text-blue-600">{repPreventiva} ({pctPreventiva}%)</span></div>
              <div className="w-full bg-gray-100 rounded-full h-3.5 overflow-hidden border shadow-inner"><div className="bg-blue-600 h-3.5 rounded-full transition-all duration-500" style={{ width: `${pctPreventiva}%` }}></div></div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-gray-700"><span>PATRULLAJE</span><span className="text-amber-500">{repPatrullaje} ({pctPatrullaje}%)</span></div>
              <div className="w-full bg-gray-100 rounded-full h-3.5 overflow-hidden border shadow-inner"><div className="bg-amber-500 h-3.5 rounded-full transition-all duration-500" style={{ width: `${pctPatrullaje}%` }}></div></div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-gray-700"><span>EFECTIVIDAD Y RENDIMIENTO OPERATIVO</span><span className="text-emerald-600">{repEfectividad} ({pctEfectividad}%)</span></div>
              <div className="w-full bg-gray-100 rounded-full h-3.5 overflow-hidden border shadow-inner"><div className="bg-emerald-500 h-3.5 rounded-full transition-all duration-500" style={{ width: `${pctEfectividad}%` }}></div></div>
            </div>
          </div>
          {repTotal === 0 && !loading && <p className="text-center text-xs font-bold text-gray-400 py-4 shadow-inner bg-gray-50 rounded-xl">No hay registros analíticos para graficar.</p>}
        </div>

        {/* LADO DERECHO: Tarjetas de TOP y BOTTOM */}
        <div className="space-y-6">
          {/* Tarjeta TOP 5 */}
          <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide flex items-center gap-1.5"><Award size={16} className="text-amber-500" />Top 5 Circuitos Comunales con Mayor Despliegue</h3>
              <span className="text-[10px] bg-amber-100 text-amber-800 font-black px-2 py-0.5 rounded-full">Ranking</span>
            </div>
            <div className="space-y-3.5">
              {topCircuitos?.length > 0 ? (
                topCircuitos.map(([circuito, valor], idx) => {
                  const porcentajeCircuito = Math.round(((valor as number) / maxCircuitoValor) * 100);
                  const jefeCircuito = usuarios.find(u => u.comuna_o_circuito_comunal === circuito);
                  const organismo = jefeCircuito?.organismo_responsable ? getSiglas(jefeCircuito.organismo_responsable) : 'N/A';
                  
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-xs font-black text-gray-400 w-5">#{idx + 1}</span>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-end">
                          <div className="flex flex-col w-full pr-2">
                            <div className="flex items-center justify-between gap-1.5 w-full">
                              <span className="text-[11px] font-bold text-gray-700 truncate flex-1 min-w-0" title={circuito as string}>
                                {circuito}
                              </span>
                              <button onClick={() => setCircuitoInfoSeleccionado(circuito as string)} className="text-blue-500 hover:text-blue-700 transition-colors shrink-0" title="Ver detalles del circuito">
                                <Info size={14} />
                              </button>
                            </div>
                            <span className="text-[9px] font-black text-[#00529b] uppercase tracking-wider">{organismo}</span>
                          </div>
                          <span className="text-[11px] text-gray-900 font-extrabold shrink-0">{valor as number} act.</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-md h-2 overflow-hidden border"><div className="bg-gradient-to-r from-[#00529b] to-blue-500 h-2 rounded-md transition-all duration-500" style={{ width: `${porcentajeCircuito}%` }}></div></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                !loading && (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400 bg-gray-50 rounded-2xl shadow-inner border-2 border-dashed">
                    <ShieldAlert size={36} className="opacity-30 mb-2"/><p className="text-xs font-bold">Sin histórico operativo en este rango de fechas</p>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Tarjeta BOTTOM 5 */}
          <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide flex items-center gap-1.5">
                <TrendingDown size={16} className="text-red-500" /> Top 5 Circuitos con Menor Despliegue
              </h3>
              <span className="text-[10px] bg-red-100 text-red-800 font-black px-2 py-0.5 rounded-full">Atención</span>
            </div>
            <div className="space-y-3.5">
              {bottomCircuitos?.length > 0 ? (
                bottomCircuitos.map(([circuito, valor], idx) => {
                  const porcentajeCircuito = Math.round(((valor as number) / maxCircuitoValor) * 100);
                  const jefeCircuito = usuarios.find(u => u.comuna_o_circuito_comunal === circuito);
                  const organismo = jefeCircuito?.organismo_responsable ? getSiglas(jefeCircuito.organismo_responsable) : 'N/A';
                  
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-xs font-black text-gray-400 w-5">#{idx + 1}</span>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-end">
                          <div className="flex flex-col w-full pr-2">
                            <div className="flex items-center justify-between gap-1.5 w-full">
                              <span className="text-[11px] font-bold text-gray-700 truncate flex-1 min-w-0" title={circuito as string}>
                                {circuito}
                              </span>
                              <button onClick={() => setCircuitoInfoSeleccionado(circuito as string)} className="text-blue-500 hover:text-blue-700 transition-colors shrink-0" title="Ver detalles del circuito">
                                <Info size={14} />
                              </button>
                            </div>
                            <span className="text-[9px] font-black text-[#00529b] uppercase tracking-wider">{organismo}</span>
                          </div>
                          <span className="text-[11px] text-gray-900 font-extrabold shrink-0">{valor as number} act.</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-md h-2 overflow-hidden border">
                          <div className="bg-gradient-to-r from-red-500 to-orange-400 h-2 rounded-md transition-all duration-500" style={{ width: `${Math.max(porcentajeCircuito, 1)}%` }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                !loading && (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400 bg-gray-50 rounded-2xl shadow-inner border-2 border-dashed">
                    <ShieldAlert size={36} className="opacity-30 mb-2"/><p className="text-xs font-bold">Sin histórico operativo en este rango de fechas</p>
                  </div>
                )
              )}
            </div>
          </div>

        </div>
      </div>

      {/* MODAL DETALLES DEL CIRCUITO */}
      {circuitoInfoSeleccionado && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border flex flex-col relative">
            <div className="flex justify-between items-start border-b pb-4 mb-4"><div><h3 className="text-lg font-black text-[#00529b] flex items-center gap-2"><Info size={20} className="text-blue-500" /> Detalles del Circuito</h3></div><button onClick={() => setCircuitoInfoSeleccionado(null)} className="text-gray-400 hover:text-red-500 bg-gray-100 hover:bg-red-50 p-2 rounded-full transition-all"><X size={20} /></button></div>
            {(() => {
              const jefe = usuarios.find(u => u.comuna_o_circuito_comunal === circuitoInfoSeleccionado);
              return (
                <div className="space-y-4">
                  <div><p className="text-[10px] text-gray-500 font-bold uppercase">Circuito Comunal</p><p className="text-sm font-bold text-gray-800">{circuitoInfoSeleccionado}</p></div>
                  <div className="grid grid-cols-2 gap-4"><div><p className="text-[10px] text-gray-500 font-bold uppercase">Municipio</p><p className="text-sm font-bold text-gray-800">{jefe?.municipio || 'N/A'}</p></div><div><p className="text-[10px] text-gray-500 font-bold uppercase">Parroquia</p><p className="text-sm font-bold text-gray-800">{jefe?.parroquia || 'N/A'}</p></div></div>
                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-100"><p className="text-[10px] text-blue-600 font-bold uppercase mb-1">Jefe de Cuadrante / Circuito</p><p className="text-sm font-black text-gray-800">{jefe?.nombre_apellido_jefe || 'No asignado'}</p><p className="text-xs text-gray-600">{jefe?.grado_jerarquia} | {jefe?.telefono_celular_jefe}</p></div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

    </div>
  );
}
