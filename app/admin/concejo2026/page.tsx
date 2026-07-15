'use client';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart3, Shield, MapPin, CheckCircle2, AlertTriangle, Eye, X, Clock, ArrowLeft, FileText, Download, FileSpreadsheet, SearchCheck, Building } from 'lucide-react';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function SalaSituacionalConcejoPage() {
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [centros, setCentros] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [reportes, setReportes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroMunicipio, setFiltroMunicipio] = useState('');
  const [filtroOrganismo, setFiltroOrganismo] = useState('');
  const [filtroAptitud, setFiltroAptitud] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('');
  const [centroSeleccionado, setCentroSeleccionado] = useState<any | null>(null);

  useEffect(() => {
    const descargarTodo = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: adminData } = await supabase.from('directorio_operativo').select('*').eq('id', user.id).single();
        setAdminProfile(adminData);
        const fetchTodosLosCentros = async () => {
          let todosLosCentros: any[] = [];
          let limite = 1000;
          let inicio = 0;
          let hayMas = true;
          while (hayMas) {
            const { data: batch } = await supabase.from('centros_votacion_2026').select('*').range(inicio, inicio + limite - 1);
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
        const fetchTodosLosReportes = async () => {
          let todosLosReportes: any[] = [];
          let limite = 1000;
          let inicio = 0;
          let hayMas = true;
          while (hayMas) {
            const { data: batch } = await supabase.from('reportes_concejo_2026').select('*').order('fecha_reporte', { ascending: false }).range(inicio, inicio + limite - 1);
            if (batch && batch.length > 0) {
              todosLosReportes = [...todosLosReportes, ...batch];
              inicio += limite;
              if (batch.length < limite) hayMas = false; 
            } else { 
              hayMas = false; 
            }
          }
          return todosLosReportes;
        };
        const [resCentros, resUsuarios, resReportes] = await Promise.all([
          fetchTodosLosCentros(),
          supabase.from('directorio_operativo').select('*').neq('rol', 'admin').neq('rol', 'superusuario').limit(5000),
          fetchTodosLosReportes()
        ]);
        if (resCentros) setCentros(resCentros);
        if (resUsuarios.data) setUsuarios(resUsuarios.data);
        if (resReportes) setReportes(resReportes);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    descargarTodo();
  }, []);

  const mapaJefes = useMemo(() => {
    const mapa = new Map();
    usuarios.forEach(u => {
      if (u.codigo_situr) mapa.set(u.codigo_situr.toString().trim(), u);
    });
    return mapa;
  }, [usuarios]);

  // Lógica purgada: Solo acepta enlaces directos y exactos. Adiós a los "huérfanos".
  const mapaReportesExactos = useMemo(() => {
    const mapaExacto = new Map();
    [...reportes].reverse().forEach(r => {
      if (r.cod_centro) mapaExacto.set(r.cod_centro.toString().trim(), r);
    });
    return mapaExacto;
  }, [reportes]);

  const isSuperAdmin = adminProfile?.rol === 'superusuario' || 
                       adminProfile?.organismo_responsable?.toUpperCase() === 'VEN 911' || 
                       adminProfile?.organismo_responsable?.toUpperCase() === 'GUARDIA NACIONAL BOLIVARIANA';
  const organismoSeguro = isSuperAdmin ? filtroOrganismo : adminProfile?.organismo_responsable;

  const municipiosUnicos = useMemo(() => Array.from(new Set(usuarios.map(u => u.municipio))).filter(Boolean).sort(), [usuarios]);
  const organismosUnicos = useMemo(() => Array.from(new Set(usuarios.map(u => u.organismo_responsable))).filter(Boolean).sort(), [usuarios]);

  const centrosProcesados = useMemo(() => {
    return centros.map(c => {
      const codigoSiturLimpio = c.CODIGO_CIRCUITO_COMUNAL?.toString().trim();
      const jefe = mapaJefes.get(codigoSiturLimpio);
      
      // SOLO SE ACEPTA EL REPORTE SI SU CNE ES IDÉNTICO EN AMBAS TABLAS
      let reporte = mapaReportesExactos.get(c.COD_CENTRO?.toString().trim());
      
      return {
        ...c,
        municipio: jefe?.municipio || 'SIN ENLAZAR',
        parroquia: jefe?.parroquia || 'SIN ENLAZAR',
        organismo: jefe?.organismo_responsable || 'SIN ORGANISMO',
        jefe_nombre: jefe?.nombre_apellido_jefe || 'POR ASIGNAR',
        jefe_telefono: jefe?.telefono_cuadrante || 'S/N',
        jefe_jerarquia: jefe?.grado_jerarquia || 'Funcionario',
        comuna: jefe?.comuna_o_circuito_comunal || 'N/A',
        escuela_apta: reporte?.escuela_apta || 'PENDIENTE',
        responsable_inspeccion: reporte?.responsable_inspeccion || 'NO REGISTRADO',
        organismos_presentes: reporte?.organismos_presentes || 'NO REGISTRADOS',
        cierre_mesas: reporte?.cierre_mesas || 'PENDIENTE', 
        resena: reporte?.resena || '',
        fecha_reporte: reporte?.fecha_reporte ? new Date(reporte.fecha_reporte).toLocaleString('es-VE') : 'Sin reporte'
      };
    }).filter(c => {
      const matchMuni = !filtroMunicipio || c.municipio === filtroMunicipio;
      const matchOrganismo = !organismoSeguro || c.organismo === organismoSeguro;
      const matchAptitud = !filtroAptitud || c.escuela_apta === filtroAptitud;
      const matchEstatus = !filtroEstatus || c.cierre_mesas === filtroEstatus;
      return matchMuni && matchOrganismo && matchAptitud && matchEstatus;
    });
  }, [centros, mapaJefes, mapaReportesExactos, filtroMunicipio, organismoSeguro, filtroAptitud, filtroEstatus]);

  const stats = useMemo(() => {
    const total = centrosProcesados.length;
    const inspeccionadasReal = centrosProcesados.filter(c => c.cierre_mesas === 'CERRADO').length;
    const aptasReal = centrosProcesados.filter(c => c.cierre_mesas === 'CERRADO' && c.escuela_apta === 'APTA').length;
    const noAptasReal = centrosProcesados.filter(c => c.cierre_mesas === 'CERRADO' && c.escuela_apta === 'NO APTA').length;
    const pendientesCalculados = Math.max(0, total - inspeccionadasReal);
    return { total, inspeccionadas: inspeccionadasReal, pendientes: pendientesCalculados, aptas: aptasReal, noAptas: noAptasReal };
  }, [centrosProcesados]);

  const generarPDF = () => {
    const doc = new jsPDF('landscape'); 
    doc.setFontSize(16);
    doc.text('Expedientes de Infraestructura Escolar (Inspecciones Realizadas)', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    let subtitulo = `Organismo: ${organismoSeguro || 'TODOS'} | Municipio: ${filtroMunicipio || 'TODOS'}`;
    doc.text(subtitulo, 14, 28);
    doc.text(`Total Inspeccionadas en este reporte: ${stats.inspeccionadas} | Aptas: ${stats.aptas} | No Aptas: ${stats.noAptas} | Pendientes: ${stats.pendientes}`, 14, 34);

    const escuelasInspeccionadas = centrosProcesados.filter(c => c.cierre_mesas === 'CERRADO');
    if(escuelasInspeccionadas.length === 0) {
      alert("No hay escuelas inspeccionadas con este filtro para generar el PDF.");
      return;
    }

    const tableColumn = ["Municipio", "Nombre de la Escuela", "Comuna", "Organismo", "Apta/No Apta", "Reseña Escrita por el Funcionario"];
    const tableRows = escuelasInspeccionadas.map(c => {
      let textoResena = c.resena ? c.resena.trim() : '';
      if (textoResena === 'Sin novedades registradas.' || textoResena === 'null' || textoResena === 'undefined') {
        textoResena = ''; 
      }
      return [c.municipio, c['NOMBRE CENTRO'], c.comuna, c.organismo, c.escuela_apta, textoResena];
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
      headStyles: { fillColor: [0, 82, 155], textColor: [255, 255, 255] },
      columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 45 }, 2: { cellWidth: 35 }, 3: { cellWidth: 30 }, 4: { cellWidth: 20 }, 5: { cellWidth: 'auto' } }
    });
    doc.save('Expedientes_Completos_Escuelas.pdf');
  };

  const generarExcel = () => {
    const escuelasInspeccionadas = centrosProcesados.filter(c => c.cierre_mesas === 'CERRADO');
    if (escuelasInspeccionadas.length === 0) {
      alert("No hay escuelas inspeccionadas con este filtro para generar el Excel.");
      return;
    }
    const wsData: any[][] = [
      ["EXPEDIENTES DE INFRAESTRUCTURA ESCOLAR - INSPECCIONES REALIZADAS"],
      [],
      ["ESTADÍSTICAS DEL REPORTE"],
      [`Organismo: ${organismoSeguro || 'TODOS'}`, `Municipio: ${filtroMunicipio || 'TODOS'}`],
      [`Total Inspeccionadas: ${stats.inspeccionadas}`, `Aptas: ${stats.aptas}`, `No Aptas: ${stats.noAptas}`, `Pendientes: ${stats.pendientes}`],
      [],
      ["Municipio", "Nombre de la Escuela", "Comuna", "Organismo", "Apta/No Apta", "Reseña Escrita por el Funcionario"]
    ];

    escuelasInspeccionadas.forEach(c => {
      let textoResena = c.resena ? c.resena.trim() : '';
      if (textoResena === 'Sin novedades registradas.' || textoResena === 'null' || textoResena === 'undefined') {
        textoResena = ''; 
      }
      wsData.push([c.municipio, c['NOMBRE CENTRO'], c.comuna, c.organismo, c.escuela_apta, textoResena]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
    ws['!cols'] = [{ wch: 15 }, { wch: 50 }, { wch: 35 }, { wch: 25 }, { wch: 15 }, { wch: 100 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expedientes');
    XLSX.writeFile(wb, 'Expedientes_Completos_Escuelas.xlsx');
  };

  if (loading) return <div className="p-8 text-center font-bold animate-pulse text-[#00529b]">Cargando Sala Analítica Regional...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-6 space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-[#00529b] font-bold text-xs uppercase bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200 transition-colors w-fit">
          <ArrowLeft size={16} /> Volver a Inicio Admin
        </Link>
        <div className="flex gap-2 flex-wrap">
          <button onClick={generarExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition-colors uppercase">
            <FileSpreadsheet size={16} /> Descargar Excel
          </button>
          <button onClick={generarPDF} className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition-colors uppercase">
            <Download size={16} /> Descargar PDF
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-[#00529b] to-blue-900 p-6 rounded-3xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-md">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wide flex items-center gap-2"><BarChart3 /> Monitor de Inspecciones Escolares</h1>
          <p className="text-xs text-blue-100 font-medium mt-1">Sala situacional para el diagnóstico y auditoría de la infraestructura de planteles en Falcón</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 pt-2">
        <div className="bg-white border rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div><p className="text-[10px] font-bold text-gray-400 uppercase">Planteles Filtrados</p><p className="text-2xl font-black text-gray-800 mt-1">{stats.total}</p></div>
          <div className="bg-blue-50 text-[#00529b] p-3 rounded-full"><MapPin size={24}/></div>
        </div>
        <div className="bg-white border rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div><p className="text-[10px] font-bold text-gray-400 uppercase">Inspeccionadas</p><p className="text-2xl font-black text-indigo-600 mt-1">{stats.inspeccionadas}</p></div>
          <div className="bg-indigo-50 text-indigo-600 p-3 rounded-full"><SearchCheck size={24}/></div>
        </div>
        <div className="bg-white border rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div><p className="text-[10px] font-bold text-gray-400 uppercase">Escuelas Aptas</p><p className="text-2xl font-black text-emerald-600 mt-1">{stats.aptas}</p></div>
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-full"><CheckCircle2 size={24}/></div>
        </div>
        <div className="bg-white border rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div><p className="text-[10px] font-bold text-gray-400 uppercase">No Aptas</p><p className="text-2xl font-black text-red-600 mt-1">{stats.noAptas}</p></div>
          <div className="bg-red-50 text-red-600 p-3 rounded-full"><AlertTriangle size={24}/></div>
        </div>
        <div className="bg-white border rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div><p className="text-[10px] font-bold text-gray-400 uppercase">Pendientes</p><p className="text-2xl font-black text-amber-500 mt-1">{stats.pendientes}</p></div>
          <div className="bg-amber-50 text-amber-500 p-3 rounded-full"><Clock size={24}/></div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex flex-col"><label className="text-[10px] font-bold text-gray-400 mb-1 uppercase">Municipio</label><select value={filtroMunicipio} onChange={e => setFiltroMunicipio(e.target.value)} className="p-2 border rounded-lg bg-white text-xs outline-none font-bold text-gray-700"><option value="">Todos los Municipios</option>{municipiosUnicos.map((m, i) => <option key={i} value={m}>{m}</option>)}</select></div>
        {isSuperAdmin && (
          <div className="flex flex-col"><label className="text-[10px] font-bold text-gray-400 mb-1 uppercase">Organismo</label><select value={filtroOrganismo} onChange={e => setFiltroOrganismo(e.target.value)} className="p-2 border rounded-lg bg-white text-xs outline-none font-bold text-gray-700"><option value="">Todos los Organismos</option>{organismosUnicos.map((o, i) => <option key={i} value={o}>{o}</option>)}</select></div>
        )}
        <div className="flex flex-col"><label className="text-[10px] font-bold text-gray-400 mb-1 uppercase">Estado Infraestructura</label><select value={filtroAptitud} onChange={e => setFiltroAptitud(e.target.value)} className="p-2 border rounded-lg bg-white text-xs outline-none font-bold text-gray-700"><option value="">Todas</option><option value="APTA">APTA</option><option value="NO APTA">NO APTA</option><option value="PENDIENTE">PENDIENTE</option></select></div>
        <div className="flex flex-col"><label className="text-[10px] font-bold text-gray-400 mb-1 uppercase">Estatus de Inspección</label><select value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)} className="p-2 border rounded-lg bg-white text-xs outline-none font-bold text-gray-700"><option value="">Todas</option><option value="CERRADO">COMPLETADA</option><option value="PENDIENTE">PENDIENTE</option></select></div>
      </div>

      <div className="bg-white rounded-2xl border shadow-inner overflow-hidden">
        <div className="overflow-x-auto max-h-[55vh]">
          <table className="w-full text-left bg-white text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px] border-b sticky top-0 z-10">
              <tr>
                <th className="p-3">CNE / SITUR</th>
                <th className="p-3">Plantel Educativo</th>
                <th className="p-3">Asignación</th>
                <th className="p-3">Resp. Inspección</th>
                <th className="p-3 text-center">Estatus Físico</th>
                <th className="p-3 text-center">Progreso</th>
                <th className="p-3 text-center">Auditoría</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {centrosProcesados.map((c, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="p-3 font-mono font-bold text-gray-500">CNE: {c.COD_CENTRO}<br/>STR: {c.CODIGO_CIRCUITO_COMUNAL}</td>
                  <td className="p-3 font-black text-gray-800 uppercase max-w-[200px] truncate" title={c['NOMBRE CENTRO']}>{c['NOMBRE CENTRO']}<br/><span className="text-[10px] text-gray-400 font-medium">{c.municipio} ({c.parroquia})</span></td>
                  <td className="p-3"><span className="font-bold text-[#00529b] block">{c.organismo}</span><span className="text-[10px] text-gray-500">{c.jefe_jerarquia} {c.jefe_nombre}</span></td>
                  <td className="p-3 text-gray-700 font-bold uppercase truncate max-w-[150px]">{c.responsable_inspeccion}</td>
                  <td className="p-3 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black ${
                      c.escuela_apta === 'APTA' ? 'text-emerald-700 bg-emerald-100 border border-emerald-200' : 
                      c.escuela_apta === 'NO APTA' ? 'text-red-700 bg-red-100 border border-red-200' : 'text-gray-500 bg-gray-100'
                    }`}>
                      {c.escuela_apta}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${c.cierre_mesas === 'CERRADO' ? 'text-indigo-600 bg-indigo-50' : 'text-amber-600 bg-amber-50'}`}>
                      {c.cierre_mesas === 'CERRADO' ? 'COMPLETADA' : 'PENDIENTE'}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button onClick={() => setCentroSeleccionado(c)} className="bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-[#00529b] p-2 rounded-xl transition-all border border-gray-200 hover:border-blue-200 shadow-sm inline-flex items-center gap-1 font-bold text-[10px] uppercase">
                      <Eye size={14} /> Ficha
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {centroSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl relative border">
            <div className="flex justify-between items-start border-b pb-3">
              <div className="flex items-center gap-2 text-[#00529b]">
                <Building size={22} />
                <div>
                  <h2 className="text-base font-black uppercase text-gray-900">Expediente de Infraestructura</h2>
                  <p className="text-[11px] font-mono text-gray-500 font-bold">CNE: {centroSeleccionado.COD_CENTRO} | Última Actualización: {centroSeleccionado.fecha_reporte}</p>
                </div>
              </div>
              <button onClick={() => setCentroSeleccionado(null)} className="text-gray-400 hover:text-red-600 bg-gray-100 p-1.5 rounded-full"><X size={18} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Datos del Plantel</h3>
                  <p className="text-sm font-black text-gray-800 uppercase leading-snug">{centroSeleccionado['NOMBRE CENTRO']}</p>
                  <p className="text-xs text-gray-500 mt-1">{centroSeleccionado.DIRECCION}</p>
                  <p className="text-[11px] font-bold text-gray-700 mt-2">{centroSeleccionado.municipio} - {centroSeleccionado.parroquia}</p>
                </div>

                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <h3 className="text-[10px] font-black text-[#00529b] uppercase tracking-wider mb-2 flex items-center gap-1"><Shield size={12}/> Responsable de Cuadrante ({centroSeleccionado.organismo})</h3>
                  <div className="text-xs font-medium text-gray-700 space-y-1">
                    <p><strong>Circuito:</strong> {centroSeleccionado.comuna}</p>
                    <p><strong>Funcionario:</strong> {centroSeleccionado.jefe_jerarquia} {centroSeleccionado.jefe_nombre}</p>
                    <p><strong>Teléfono:</strong> {centroSeleccionado.jefe_telefono}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-emerald-50/30 p-4 rounded-xl border border-emerald-100">
                  <h3 className="text-[10px] font-black text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1"><SearchCheck size={12}/> Resumen de la Inspección</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center border-b pb-1">
                      <span className="font-bold text-gray-500 uppercase">Estatus Físico:</span>
                      <span className={`font-black uppercase px-2 py-0.5 rounded ${centroSeleccionado.escuela_apta === 'APTA' ? 'bg-emerald-100 text-emerald-700' : centroSeleccionado.escuela_apta === 'NO APTA' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>{centroSeleccionado.escuela_apta}</span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-1">
                      <span className="font-bold text-gray-500 uppercase">Responsable:</span>
                      <span className="font-bold text-gray-800 uppercase">{centroSeleccionado.responsable_inspeccion}</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-500 uppercase block mb-1">Organismos Presentes:</span>
                      <p className="bg-white p-2 rounded border text-gray-800 uppercase">{centroSeleccionado.organismos_presentes}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50/30 p-4 rounded-xl border border-amber-100">
                  <h3 className="text-[10px] font-black text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1"><FileText size={12}/> Bitácora de Novedades y Necesidades</h3>
                  <div className="bg-white rounded-xl border p-3 min-h-[90px] max-h-40 overflow-y-auto space-y-2 divide-y divide-gray-50">
                    {centroSeleccionado.resena && centroSeleccionado.resena !== 'Sin novedades registradas.' ? (
                      centroSeleccionado.resena.split('\n').map((linea: string, lIdx: number) => (
                        <p key={lIdx} className="text-[11px] text-gray-700 font-medium pt-1.5 first:pt-0 leading-relaxed">
                          <span className="text-[#00529b] font-mono font-bold mr-1.5 inline-flex items-center gap-0.5">
                            <Clock size={10}/> {linea.match(/\[.*?\]/)?.[0] || ''}
                          </span>
                          {linea.replace(/\[.*?\]/, '').trim()}
                        </p>
                      ))
                    ) : (
                      <p className="text-[11px] text-gray-400 italic text-center py-4">No hay novedades registradas.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button onClick={() => setCentroSeleccionado(null)} className="bg-gray-800 hover:bg-gray-900 text-white font-bold text-xs px-6 py-2.5 rounded-xl uppercase transition-colors shadow-sm">
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
