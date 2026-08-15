'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, FileSpreadsheet, FileText, Filter, ShieldAlert, Activity, ShieldCheck, Siren, Target, Eye, X, Info, Loader2, Wifi, Database } from 'lucide-react';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';

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

export default function TabIncidencias({ adminUser, esSuperUser, isReadOnlyVen911 }: any) {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [incidenciasDB, setIncidenciasDB] = useState<any[]>([]);
  const [sectoresDB, setSectoresDB] = useState<any[]>([]);
  
  const [loadingData, setLoadingData] = useState(true);
  const [progress, setProgress] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isLive, setIsLive] = useState(false);

  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroIncidenciaMuni, setFiltroIncidenciaMuni] = useState('');
  const [filtroIncidenciaParro, setFiltroIncidenciaParro] = useState('');
  const [filtroIncidenciaCircuito, setFiltroIncidenciaCircuito] = useState(''); 
  const [filtroIncidenciaClasificacion, setFiltroIncidenciaClasificacion] = useState('');
  const [filtroIncidenciaTipo, setFiltroIncidenciaTipo] = useState('');
  const [filtroIncidenciaOrganismo, setFiltroIncidenciaOrganismo] = useState('');

  const [incidenciaSeleccionada, setIncidenciaSeleccionada] = useState<any | null>(null);
  const [circuitoInfoSeleccionado, setCircuitoInfoSeleccionado] = useState<string | null>(null);

  const channelRef = useRef<any>(null);

  useEffect(() => {
    iniciarCargaProgresiva();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  const iniciarCargaProgresiva = async () => {
    setLoadingData(true);
    setProgress(0);
    setTotalRecords(0); 

    const isSuper = adminUser.rol === 'superusuario';
    const isReadVen911 = adminUser.organismo_responsable === 'VEN 911' && !isSuper;
    const veTodo = isSuper || isReadVen911;

    // Cargar Usuarios
    const { data: usersData } = await supabase.from('directorio_operativo').select('id, comuna_o_circuito_comunal, organismo_responsable, municipio, parroquia, nombre_apellido_jefe, grado_jerarquia, telefono_celular_jefe, codigo_situr');
    let usuariosProcesados = usersData || [];
    
    if (!veTodo && adminUser.organismo_responsable) {
      usuariosProcesados = usuariosProcesados.filter(u => matchesOrganismo(u.organismo_responsable, adminUser.organismo_responsable));
    }
    setUsuarios(usuariosProcesados);
    const circuitosPermitidos = new Set(usuariosProcesados.map(u => u.comuna_o_circuito_comunal));

    supabase.from('sectores').select('*').then(({ data }) => { if (data) setSectoresDB(data); });

    // Cargar total esperado
    const { count } = await supabase.from('incidencias').select('*', { count: 'exact', head: true });
    const totalEsperado = count || 0;

    if (totalEsperado === 0) {
      setLoadingData(false);
      setProgress(100);
      activarTiempoReal(veTodo, circuitosPermitidos);
      return;
    }

    let descargados: any[] = [];
    let loteSize = 1000; 
    let inicio = 0;
    let intentosFallo = 0; 

    while (inicio < totalEsperado) {
      const { data: batch, error } = await supabase
        .from('incidencias')
        .select('*')
        .order('fecha_registro', { ascending: false })
        .range(inicio, inicio + loteSize - 1);

      if (error) {
        intentosFallo++;
        if (intentosFallo > 3) {
          console.error("Error crítico de red:", error);
          break; 
        }
        await new Promise(res => setTimeout(res, 1000)); 
        continue;
      }

      if (batch && batch.length > 0) {
        intentosFallo = 0; 
        
        const validBatch = veTodo ? batch : batch.filter(inc => circuitosPermitidos.has(inc.circuito_comunal));
        descargados = [...descargados, ...validBatch];
        
        setIncidenciasDB(descargados);
        setTotalRecords(descargados.length); 
        
        inicio += batch.length; 
        setProgress(Math.min(100, Math.round((inicio / totalEsperado) * 100)));
        
        if (batch.length < loteSize) break; 
      } else {
        break;
      }
    }

    setProgress(100);
    setLoadingData(false);
    activarTiempoReal(veTodo, circuitosPermitidos);
  };

  const activarTiempoReal = (veTodo: boolean, circuitosPermitidos: Set<string>) => {
    setIsLive(true);
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    
    const channelName = `incidencias_live_${Date.now()}`;
    const channel = supabase.channel(channelName);

    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'incidencias' }, (payload) => {
      if (payload.eventType === 'INSERT') {
        if (veTodo || circuitosPermitidos.has(payload.new.circuito_comunal)) {
          setIncidenciasDB(prev => [payload.new, ...prev]);
          setTotalRecords(prev => prev + 1);
        }
      }
      if (payload.eventType === 'UPDATE') {
        if (veTodo || circuitosPermitidos.has(payload.new.circuito_comunal)) {
          setIncidenciasDB(prev => prev.map(inc => inc.id === payload.new.id ? payload.new : inc));
        }
      }
      if (payload.eventType === 'DELETE') {
        setIncidenciasDB(prev => prev.filter(inc => inc.id !== payload.old.id));
        setTotalRecords(prev => prev > 0 ? prev - 1 : 0);
      }
    });

    channel.subscribe();
    channelRef.current = channel;
  };

  const municipiosUnicos = Array.from(new Set(usuarios.map(u => u.municipio))).filter(Boolean).sort();
  const parroquiasIncidenciaUnicas = Array.from(new Set(usuarios.filter(u => filtroIncidenciaMuni === '' || u.municipio === filtroIncidenciaMuni).map(u => u.parroquia))).filter(Boolean).sort();
  const incidenciasTipoUnicas = Array.from(new Set(incidenciasDB.map(i => i.incidencia))).filter(Boolean).sort();
  const circuitosIncidenciaUnicos = Array.from(new Set(usuarios.filter(u => (filtroIncidenciaMuni === '' || u.municipio === filtroIncidenciaMuni) && (filtroIncidenciaParro === '' || u.parroquia === filtroIncidenciaParro)).map(u => u.comuna_o_circuito_comunal))).filter(Boolean).sort();

  const incidenciasFiltradas = incidenciasDB.filter(inc => {
    if (fechaDesde || fechaHasta) {
      if (!inc.fecha_registro) return false;
      const incTime = new Date(inc.fecha_registro).getTime();
      if (fechaDesde && incTime < new Date(`${fechaDesde}T00:00:00`).getTime()) return false;
      if (fechaHasta && incTime > new Date(`${fechaHasta}T23:59:59`).getTime()) return false;
    }
    const jefe = usuarios.find(u => u.comuna_o_circuito_comunal === inc.circuito_comunal);
    if (filtroIncidenciaMuni && jefe?.municipio !== filtroIncidenciaMuni) return false;
    if (filtroIncidenciaParro && jefe?.parroquia !== filtroIncidenciaParro) return false;
    if (filtroIncidenciaCircuito && inc.circuito_comunal !== filtroIncidenciaCircuito) return false;
    if (filtroIncidenciaClasificacion && inc.clasificacion !== filtroIncidenciaClasificacion) return false;
    if (filtroIncidenciaTipo && inc.incidencia !== filtroIncidenciaTipo) return false;
    if (filtroIncidenciaOrganismo) {
      const orgDelCircuito = jefe?.organismo_responsable || '';
      if (!matchesOrganismo(orgDelCircuito, filtroIncidenciaOrganismo)) return false;
    }
    return true;
  });

  const getCant = (val: any) => (val == null || val === '') ? 1 : Number(val);
  
  const totalActividades = incidenciasFiltradas.reduce((sum, item) => sum + getCant(item.cantidad), 0);
  const totalPreventiva = incidenciasFiltradas.filter(i => i.clasificacion?.toUpperCase().includes('PREVENTIVA')).reduce((sum, item) => sum + getCant(item.cantidad), 0);
  const totalPatrullaje = incidenciasFiltradas.filter(i => i.clasificacion?.toUpperCase().includes('PATRULLAJE')).reduce((sum, item) => sum + getCant(item.cantidad), 0);
  const totalEfectividad = incidenciasFiltradas.filter(i => i.clasificacion?.toUpperCase().includes('OPERATIVIDAD') || i.clasificacion?.toUpperCase().includes('EFECTIVIDAD')).reduce((sum, item) => sum + getCant(item.cantidad), 0);

  const handleGenerarExcelIncidencias = () => {
    if (incidenciasFiltradas.length === 0) { alert("No hay registros para exportar."); return; }
    const wsData: any[][] = [
      ["REPORTE GENERAL DE INCIDENCIAS OPERATIVAS - VEN 911 FALCÓN"], [],
      ["Total Actividades Computadas:", totalActividades, "Total Preventiva:", totalPreventiva],
      ["Total Patrullaje:", totalPatrullaje, "Efectividad y Rendimiento:", totalEfectividad], [],
      ['FECHA / HORA', 'ESTADO', 'MUNICIPIO', 'PARROQUIA', 'CIRCUITO COMUNAL', 'CLASIFICACIÓN', 'INCIDENCIA', 'ACTIVIDAD DETALLADA', 'ORGANISMO REPORTANTE', 'APOYO / INVOLUCRADOS', 'RESEÑA INFORMATIVA', 'OBSERVACIONES', 'ID DESPACHADOR']
    ];
    incidenciasFiltradas.forEach(inc => {
      const jefe = usuarios.find(u => u.comuna_o_circuito_comunal === inc.circuito_comunal);
      wsData.push([
        new Date(inc.fecha_registro).toLocaleString(),
        jefe?.estado || 'FALCÓN', jefe?.municipio || 'N/A', jefe?.parroquia || 'N/A',
        inc.circuito_comunal || 'N/A', inc.clasificacion || 'N/A', inc.incidencia || 'N/A', inc.actividad || 'N/A',
        jefe?.organismo_responsable || inc.organismo_responsable || 'N/A',
        inc.organismos_involucrados || 'NINGUNO', inc.resena_informativa || inc.resena || 'N/A', inc.observaciones || inc.observacion || 'No aplica', inc.usuario_id || 'N/A'
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte_Incidencias');
    XLSX.writeFile(wb, 'Reporte_Incidencias_VEN911.xlsx');
  };

  const handleGenerarPDFIncidencias = () => {
    if (incidenciasFiltradas.length === 0) { 
      alert("No hay registros para exportar."); 
      return; 
    }

    // 1. Construir las filas de la tabla
    const filasHtml = incidenciasFiltradas.map(inc => {
      const jefe = usuarios.find(u => u.comuna_o_circuito_comunal === inc.circuito_comunal);
      const resena = inc.resena_informativa || inc.resena || 'N/A';
      const obs = inc.observaciones || inc.observacion || 'No aplica';
      const orgA_Mostrar = jefe?.organismo_responsable || inc.organismo_responsable || 'N/A';
      return `
      <tr>
        <td style="padding: 6px; border: 1px solid #cbd5e1;">${new Date(inc.fecha_registro).toLocaleString()}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1;"><strong>${inc.circuito_comunal}</strong></td>
        <td style="padding: 6px; border: 1px solid #cbd5e1;">${jefe?.municipio || 'N/A'} / ${jefe?.parroquia || 'N/A'}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1;">${inc.clasificacion}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1;">${inc.incidencia}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1;"><b>${orgA_Mostrar}</b><br/><span style="color:#666; font-size:8px;">Apoyo: ${inc.organismos_involucrados || 'Ninguno'}</span></td>
        <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: justify;">${resena}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: justify;">${obs}</td>
      </tr>
      `;
    }).join('');

    const fechaReporte = new Date().toLocaleString();

    // 2. Crear el contenedor principal para el PDF
    const contenedor = document.createElement('div');
    // IMPORTANTE: Asegúrate de que las imágenes estén en la carpeta public con estos nombres
    contenedor.innerHTML = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; font-size: 10px; color: #333; background: white; width: 100%;">
        
        <!-- ENCABEZADO CON LOGOS -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #00529b; padding-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 15px;">
            <img src="/logo1.png" alt="Cuadrantes de Paz" style="height: 50px; object-fit: contain;">
            <img src="/logo2.png" alt="Ministerio" style="height: 50px; object-fit: contain;">
          </div>
          <div style="text-align: right;">
            <h1 style="margin: 0; color: #00529b; font-size: 16px; text-transform: uppercase;">Reporte General de Incidencias</h1>
            <p style="margin: 2px 0 0 0; color: #666; font-size: 10px;">Estado Falcón - Sistema VEN 911</p>
            <p style="margin: 2px 0 0 0; color: #666; font-size: 10px;">Generado el: ${fechaReporte}</p>
          </div>
        </div>

        <!-- RESUMEN CUANTITATIVO (Tarjetas) -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px; gap: 10px;">
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; flex: 1; text-align: center; background-color: #f8fafc;">
            <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: bold; margin-bottom: 5px;">Total Registradas</div>
            <div style="font-size: 18px; font-weight: 900; color: #1e293b; margin: 0;">${totalActividades}</div>
          </div>
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; flex: 1; text-align: center; background-color: #f8fafc;">
            <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: bold; margin-bottom: 5px;">Preventiva</div>
            <div style="font-size: 18px; font-weight: 900; color: #2563eb; margin: 0;">${totalPreventiva}</div>
          </div>
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; flex: 1; text-align: center; background-color: #f8fafc;">
            <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: bold; margin-bottom: 5px;">Patrullaje</div>
            <div style="font-size: 18px; font-weight: 900; color: #d97706; margin: 0;">${totalPatrullaje}</div>
          </div>
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; flex: 1; text-align: center; background-color: #f8fafc;">
            <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: bold; margin-bottom: 5px;">Efectividad y Rend.</div>
            <div style="font-size: 18px; font-weight: 900; color: #059669; margin: 0;">${totalEfectividad}</div>
          </div>
        </div>

        <!-- INDICADOR DE FILTROS -->
        <div style="margin-bottom: 15px; font-size: 9px; color: #475569; background: #f1f5f9; padding: 8px; border-radius: 4px;">
          <strong>Filtros aplicados:</strong> 
          ${fechaDesde ? `Desde: ${fechaDesde}` : ''} 
          ${fechaHasta ? `| Hasta: ${fechaHasta}` : ''}
          ${filtroIncidenciaCircuito ? `| Circuito: ${filtroIncidenciaCircuito}` : ''}
          ${filtroIncidenciaMuni ? `| Municipio: ${filtroIncidenciaMuni}` : ''}
          ${!fechaDesde && !fechaHasta && !filtroIncidenciaCircuito && !filtroIncidenciaMuni ? 'Ninguno (Mostrando todos los registros)' : ''}
        </div>

        <!-- TABLA DE DATOS -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr>
              <th style="width: 8%; background-color: #00529b; color: white; padding: 6px; border: 1px solid #cbd5e1; font-size: 9px; text-align: left;">FECHA / HORA</th>
              <th style="width: 12%; background-color: #00529b; color: white; padding: 6px; border: 1px solid #cbd5e1; font-size: 9px; text-align: left;">CIRCUITO COMUNAL</th>
              <th style="width: 12%; background-color: #00529b; color: white; padding: 6px; border: 1px solid #cbd5e1; font-size: 9px; text-align: left;">MUNI / PARROQ</th>
              <th style="width: 10%; background-color: #00529b; color: white; padding: 6px; border: 1px solid #cbd5e1; font-size: 9px; text-align: left;">CLASIFICACIÓN</th>
              <th style="width: 10%; background-color: #00529b; color: white; padding: 6px; border: 1px solid #cbd5e1; font-size: 9px; text-align: left;">INCIDENCIA</th>
              <th style="width: 12%; background-color: #00529b; color: white; padding: 6px; border: 1px solid #cbd5e1; font-size: 9px; text-align: left;">ORGANISMOS</th>
              <th style="width: 18%; background-color: #00529b; color: white; padding: 6px; border: 1px solid #cbd5e1; font-size: 9px; text-align: left;">RESEÑA INFORMATIVA</th>
              <th style="width: 18%; background-color: #00529b; color: white; padding: 6px; border: 1px solid #cbd5e1; font-size: 9px; text-align: left;">OBSERVACIONES</th>
            </tr>
          </thead>
          <tbody>${filasHtml}</tbody>
        </table>
      </div>
    `;

    // 3. Configuración para descargar el PDF usando html2pdf
    const opciones = {
      margin:       10, // Margen en milímetros
      filename:     `Reporte_Incidencias_${new Date().getTime()}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true }, // scale: 2 mejora la calidad de la foto
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' } // Formato A4 horizontal
    };

    // 4. Generar y descargar
    (html2pdf() as any).from(contenedor).set(opciones).save();
  };

  return (
    <div className="animate-fade-in w-full space-y-6">
      
      {/* BARRA DE CARGA PROGRESIVA Y STATUS EN TIEMPO REAL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white rounded-2xl border p-4 shadow-sm">
        <div className="flex items-center gap-4 w-full md:w-auto flex-1">
          <div className="bg-blue-100 p-3 rounded-xl border border-blue-200">
            <ShieldAlert className="text-[#00529b]" size={28}/>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              Panel de Incidencias y Novedades
              {isLive && <span className="flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-300 tracking-wider animate-pulse"><Wifi size={12}/> EN VIVO</span>}
            </h2>
            
            {loadingData ? (
              <div className="mt-2 w-full max-w-md">
                <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
                  <span className="flex items-center gap-1"><Database size={12} className="animate-bounce text-blue-500"/> Sincronizando Servidor...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden border border-gray-200 shadow-inner">
                  <div className="bg-gradient-to-r from-[#00529b] to-blue-400 h-2 rounded-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 font-bold mt-0.5 flex items-center gap-1">
                <Database size={14}/> {totalRecords.toLocaleString()} Registros descargados
              </p>
            )}
          </div>
        </div>
      </div>

      {/* TARJETAS DE ESTADISTICAS RÁPIDAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="bg-blue-50 p-3 rounded-full text-[#00529b]"><Activity size={28} /></div>
          <div><p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Registradas</p><p className="text-2xl font-black text-gray-800 leading-none mt-1">{totalActividades}</p></div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="bg-blue-50 p-3 rounded-full text-blue-600"><ShieldCheck size={28} /></div>
          <div><p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Preventiva</p><p className="text-2xl font-black text-gray-800 leading-none mt-1">{totalPreventiva}</p></div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="bg-amber-50 p-3 rounded-full text-amber-500"><Siren size={28} /></div>
          <div><p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Patrullaje</p><p className="text-2xl font-black text-gray-800 leading-none mt-1">{totalPatrullaje}</p></div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="bg-emerald-50 p-3 rounded-full text-emerald-500"><Target size={28} /></div>
          <div><p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Efectividad y Rend.</p><p className="text-2xl font-black text-gray-800 leading-none mt-1">{totalEfectividad}</p></div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-gray-50 p-5 rounded-2xl shadow-sm border border-gray-200">
        <div className="font-bold text-gray-700 flex items-center gap-2 mb-4 border-b border-gray-200 pb-3"><Filter size={18} className="text-[#00529b]" /> Filtros de Búsqueda de Base de Datos</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-5">
          <div className="lg:col-span-1"><label className="block text-xs font-bold text-gray-500 mb-1">Desde</label><input type="date" className="w-full p-2 border rounded-lg bg-white text-sm" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} /></div>
          <div className="lg:col-span-1"><label className="block text-xs font-bold text-gray-500 mb-1">Hasta</label><input type="date" className="w-full p-2 border rounded-lg bg-white text-sm" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} /></div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-bold text-gray-500 mb-1">Filtrar Municipio</label>
            <select className="w-full p-2 border rounded-lg bg-white text-sm" value={filtroIncidenciaMuni} onChange={e => { setFiltroIncidenciaMuni(e.target.value); setFiltroIncidenciaParro(''); setFiltroIncidenciaCircuito(''); }}>
              <option value="">Todos los Municipios</option>
              {municipiosUnicos.map((m,i) => <option key={i} value={m as string}>{m}</option>)}
            </select>
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-bold text-gray-500 mb-1">Filtrar Parroquia</label>
            <select className="w-full p-2 border rounded-lg bg-white text-sm disabled:bg-gray-100" value={filtroIncidenciaParro} onChange={e => { setFiltroIncidenciaParro(e.target.value); setFiltroIncidenciaCircuito(''); }} disabled={!filtroIncidenciaMuni}>
              <option value="">Todas las Parroquias</option>
              {parroquiasIncidenciaUnicas.map((p,i) => <option key={i} value={p as string}>{p}</option>)}
            </select>
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-bold text-gray-500 mb-1">Filtrar Circuito</label>
            <select className="w-full p-2 border rounded-lg bg-white text-sm disabled:bg-gray-100" value={filtroIncidenciaCircuito} onChange={e => setFiltroIncidenciaCircuito(e.target.value)} disabled={!filtroIncidenciaParro}>
              <option value="">Todos los Circuitos</option>
              {circuitosIncidenciaUnicos.map((c, i) => <option key={i} value={c as string}>{c}</option>)}
            </select>
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-bold text-gray-500 mb-1">Filtrar Clasificación</label>
            <select className="w-full p-2 border rounded-lg bg-white text-sm" value={filtroIncidenciaClasificacion} onChange={e => setFiltroIncidenciaClasificacion(e.target.value)}>
              <option value="">Todas</option><option value="PREVENTIVA">PREVENTIVA</option><option value="PATRULLAJE">PATRULLAJE</option><option value="OPERATIVIDAD Y RENDIMIENTO OPERATIVO">EFECTIVIDAD Y RENDIMIENTO</option>
            </select>
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-bold text-gray-500 mb-1">Filtrar Incidencia</label>
            <select className="w-full p-2 border rounded-lg bg-white text-sm" value={filtroIncidenciaTipo} onChange={e => setFiltroIncidenciaTipo(e.target.value)}>
              <option value="">Todas</option>
              {incidenciasTipoUnicas.map((t, i) => <option key={i} value={t as string}>{t}</option>)}
            </select>
          </div>
          {(esSuperUser || isReadOnlyVen911) && (
            <div className="lg:col-span-1">
              <label className="block text-xs font-bold text-gray-500 mb-1">Filtrar Organismo</label>
              <select className="w-full p-2 border rounded-lg bg-white text-sm" value={filtroIncidenciaOrganismo} onChange={e => setFiltroIncidenciaOrganismo(e.target.value)}>
                <option value="">Todos</option>
                {LISTA_ORGANISMOS.map((org, i) => <option key={i} value={org}>{org}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
          <button onClick={handleGenerarExcelIncidencias} className="bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold shadow-sm hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"><FileSpreadsheet size={18} /> Excel (Tabla)</button>
          <button onClick={handleGenerarPDFIncidencias} className="bg-red-500 text-white px-6 py-2 rounded-lg font-bold shadow-sm hover:bg-red-600 transition-all flex items-center justify-center gap-2"><FileText size={18} /> PDF (Reporte)</button>
        </div>
      </div>

      {/* TABLA PRINCIPAL DE INCIDENCIAS */}
      <div className="overflow-x-auto overflow-y-auto max-h-[50vh] rounded-xl border border-gray-200 w-full shadow-inner relative bg-white">
        <table className="w-full min-w-max text-left text-xs">
          <thead className="text-gray-700 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-3 sticky left-0 top-0 bg-gray-200 z-30 font-bold w-12 text-center shadow-[0_1px_0_0_#e5e7eb]">Ver</th>
              <th className="p-3 sticky top-0 bg-gray-100 z-20 font-bold w-32 shadow-[0_1px_0_0_#e5e7eb]">Fecha / Hora</th>
              <th className="p-3 sticky top-0 bg-amber-100 text-amber-800 z-20 font-bold shadow-[0_1px_0_0_#e5e7eb]">Circuito Comunal</th>
              <th className="p-3 sticky top-0 bg-gray-100 z-20 font-bold shadow-[0_1px_0_0_#e5e7eb]">Municipio / Parr.</th>
              <th className="p-3 sticky top-0 bg-gray-100 z-20 font-bold shadow-[0_1px_0_0_#e5e7eb]">Clasificación</th>
              <th className="p-3 sticky top-0 bg-gray-100 z-20 font-bold shadow-[0_1px_0_0_#e5e7eb]">Incidencia</th>
              <th className="p-3 sticky top-0 bg-gray-100 z-20 font-bold shadow-[0_1px_0_0_#e5e7eb]">Actividad Detallada</th>
              <th className="p-3 sticky top-0 bg-gray-100 z-20 font-bold shadow-[0_1px_0_0_#e5e7eb]">Organismos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loadingData && incidenciasDB.length === 0 ? (
              <tr><td colSpan={8} className="p-16 text-center"><Loader2 size={36} className="animate-spin text-[#00529b] mx-auto mb-2"/><p className="font-bold text-gray-500">Descargando Base de Datos Histórica...</p></td></tr>
            ) : incidenciasFiltradas.length > 0 ? (
              incidenciasFiltradas.map((incidencia, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="p-3 text-center sticky left-0 bg-white z-10"><button onClick={() => setIncidenciaSeleccionada(incidencia)} className="bg-blue-100 text-[#00529b] p-1.5 rounded-lg hover:bg-[#00529b] hover:text-white transition-all shadow-sm"><Eye size={16} /></button></td>
                  <td className="p-3">{new Date(incidencia.fecha_registro).toLocaleString()}</td>
                  <td className="p-3 font-bold text-gray-800">
                    <div className="flex flex-col">
                      <div className="flex items-center justify-between gap-1.5 w-full max-w-[180px]">
                        <span className="truncate flex-1 min-w-0" title={incidencia.circuito_comunal}>{incidencia.circuito_comunal}</span>
                        <button onClick={() => setCircuitoInfoSeleccionado(incidencia.circuito_comunal)} className="text-blue-500 hover:text-blue-700 transition-colors shrink-0" title="Ver circuito"><Info size={14} /></button>
                      </div>
                      <span className="text-[9px] font-black text-[#00529b] uppercase tracking-wider mt-0.5">
                        {usuarios.find(u => u.comuna_o_circuito_comunal === incidencia.circuito_comunal)?.organismo_responsable ? getSiglas(usuarios.find(u => u.comuna_o_circuito_comunal === incidencia.circuito_comunal)!.organismo_responsable) : 'N/A'}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-gray-600">{usuarios.find(u => u.comuna_o_circuito_comunal === incidencia.circuito_comunal)?.municipio || 'N/A'} / {usuarios.find(u => u.comuna_o_circuito_comunal === incidencia.circuito_comunal)?.parroquia || 'N/A'}</td>
                  <td className="p-3 text-gray-700">{incidencia.clasificacion}</td>
                  <td className="p-3 text-gray-700">{incidencia.incidencia}</td>
                  <td className="p-3 text-gray-600 max-w-[200px] truncate" title={incidencia.actividad}>{incidencia.actividad}</td>
                  <td className="p-3">
                    <div className="flex flex-col">
                      <span className="font-bold text-[#00529b] text-[11px] leading-tight">{incidencia.organismo_responsable || incidencia.organismo_reportante || 'N/A'}</span>
                      {incidencia.organismos_involucrados && incidencia.organismos_involucrados !== 'NINGUNO' && (<span className="text-[9px] text-gray-500 mt-0.5 leading-tight">Apoyo: {incidencia.organismos_involucrados}</span>)}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={8} className="p-16 text-center"><ShieldAlert size={56} className="mb-4 opacity-20 text-gray-400 mx-auto" /><p className="text-lg font-bold text-gray-500">No hay incidencias que coincidan con los filtros</p></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DETALLES DEL REPORTE */}
      {incidenciaSeleccionada && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-6 max-w-3xl w-full shadow-2xl border flex flex-col max-h-[90vh] overflow-hidden relative">
            <div className="flex justify-between items-start border-b pb-4 mb-4">
              <div><h3 className="text-xl font-black text-[#00529b] flex items-center gap-2"><ShieldAlert size={24} className="text-amber-500" /> Detalles del Reporte</h3><p className="text-xs text-gray-500 mt-1 font-bold">Registrado el {new Date(incidenciaSeleccionada.fecha_registro).toLocaleString()}</p></div>
              <button onClick={() => setIncidenciaSeleccionada(null)} className="text-gray-400 hover:text-red-500 bg-gray-100 hover:bg-red-50 p-2 rounded-full transition-all"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto pr-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100"><p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Clasificación</p><p className="text-base font-black text-gray-800">{incidenciaSeleccionada.clasificacion}</p></div>
                <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100"><p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Tipo de Incidencia</p><p className="text-base font-black text-gray-800">{incidenciaSeleccionada.incidencia}</p></div>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200"><p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Actividad Específica</p><div className="bg-white p-3 rounded-lg border"><p className="text-sm font-bold text-gray-700">{incidenciaSeleccionada.actividad}</p></div></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200"><p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Reseña Informativa</p><div className="bg-white p-4 rounded-lg border text-sm text-gray-700 whitespace-pre-wrap leading-relaxed h-[120px] overflow-y-auto">{incidenciaSeleccionada.resena_informativa || incidenciaSeleccionada.resena || 'Sin reseña registrada.'}</div></div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200"><p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Observaciones</p><div className="bg-white p-4 rounded-lg border text-sm text-gray-700 whitespace-pre-wrap leading-relaxed h-[120px] overflow-y-auto">{incidenciaSeleccionada.observaciones || incidenciaSeleccionada.observacion || 'No aplica'}</div></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200"><p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Ubicación / Circuito</p><p className="text-sm font-bold text-gray-800 mb-1">{incidenciaSeleccionada.circuito_comunal}</p><p className="text-xs text-gray-500"><strong>Municipio:</strong> {usuarios.find(u => u.comuna_o_circuito_comunal === incidenciaSeleccionada.circuito_comunal)?.municipio || 'N/A'} <br/> <strong>Parroquia:</strong> {usuarios.find(u => u.comuna_o_circuito_comunal === incidenciaSeleccionada.circuito_comunal)?.parroquia || 'N/A'}</p></div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200"><p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Organismo Reportante</p><p className="text-sm font-black text-[#00529b] mb-2">{incidenciaSeleccionada.organismo_responsable || incidenciaSeleccionada.organismo_reportante || 'N/A'}</p><p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Apoyo / Involucrados</p><div className="flex gap-2 flex-wrap mt-1">{incidenciaSeleccionada.organismos_involucrados && incidenciaSeleccionada.organismos_involucrados !== 'NINGUNO' ? (incidenciaSeleccionada.organismos_involucrados.split('-').map((org: string, i: number) => (<span key={i} className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-md border border-emerald-200 uppercase tracking-wide">{org.trim()}</span>))) : (<span className="text-xs font-bold text-gray-400">Ninguno especificado</span>)}</div></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLES DEL CIRCUITO */}
      {circuitoInfoSeleccionado && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border flex flex-col relative">
            <div className="flex justify-between items-start border-b pb-4 mb-4"><div><h3 className="text-lg font-black text-[#00529b] flex items-center gap-2"><Info size={20} className="text-blue-500" /> Detalles del Circuito</h3></div><button onClick={() => setCircuitoInfoSeleccionado(null)} className="text-gray-400 hover:text-red-500 bg-gray-100 hover:bg-red-50 p-2 rounded-full transition-all"><X size={20} /></button></div>
            {(() => {
              const jefe = usuarios.find(u => u.comuna_o_circuito_comunal === circuitoInfoSeleccionado);
              const sectores = sectoresDB.filter(s => s.codigo_situr === jefe?.codigo_situr);
              return (
                <div className="space-y-4">
                  <div><p className="text-[10px] text-gray-500 font-bold uppercase">Circuito Comunal</p><p className="text-sm font-bold text-gray-800">{circuitoInfoSeleccionado}</p></div>
                  <div className="grid grid-cols-2 gap-4"><div><p className="text-[10px] text-gray-500 font-bold uppercase">Municipio</p><p className="text-sm font-bold text-gray-800">{jefe?.municipio || 'N/A'}</p></div><div><p className="text-[10px] text-gray-500 font-bold uppercase">Parroquia</p><p className="text-sm font-bold text-gray-800">{jefe?.parroquia || 'N/A'}</p></div></div>
                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-100"><p className="text-[10px] text-blue-600 font-bold uppercase mb-1">Jefe de Cuadrante / Circuito</p><p className="text-sm font-black text-gray-800">{jefe?.nombre_apellido_jefe || 'No asignado'}</p><p className="text-xs text-gray-600">{jefe?.grado_jerarquia} | {jefe?.telefono_celular_jefe}</p></div>
                  <div><p className="text-[10px] text-gray-500 font-bold uppercase mb-2">Sectores ({sectores.length})</p><div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto p-2 bg-gray-50 rounded-lg border">{sectores.length > 0 ? sectores.map((s, idx) => (<span key={idx} className="bg-white border text-gray-700 text-[10px] font-bold px-2 py-1 rounded shadow-sm">{s.nombre_sector}</span>)) : <span className="text-xs text-gray-400">Sin sectores</span>}</div></div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

    </div>
  );
};
//prueva
