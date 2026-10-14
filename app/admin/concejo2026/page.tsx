'use client';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart3, Shield, MapPin, CheckCircle2, AlertTriangle, Eye, X, Clock, ArrowLeft, FileText, Download, FileSpreadsheet, SearchCheck, Building, UserCheck } from 'lucide-react';
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
  const [filtroCotillon, setFiltroCotillon] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('');
  const [centroSeleccionado, setCentroSeleccionado] = useState<any | null>(null);

  useEffect(() => {
    const descargarTodo = async () => {
      try {
        setLoading(true);

        // 1. Obtener el correo desde localStorage
        let correoLogueado = '';
        const sessionData = localStorage.getItem('user_session');
        if (sessionData) {
          try {
            const parsed = JSON.parse(sessionData);
            if (parsed?.email) correoLogueado = parsed.email;
          } catch (e) {
            console.error("Error leyendo user_session:", e);
          }
        }

        let perfilEncontrado = null;
        if (correoLogueado) {
          const { data: adminByEmail } = await supabase
            .from('directorio_operativo')
            .select('*')
            .ilike('email', correoLogueado)
            .maybeSingle();

          if (adminByEmail) {
            perfilEncontrado = adminByEmail;
          }
        }

        if (!perfilEncontrado) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.email) {
            const { data: authByEmail } = await supabase
              .from('directorio_operativo')
              .select('*')
              .ilike('email', user.email)
              .maybeSingle();
            if (authByEmail) perfilEncontrado = authByEmail;
          }
        }

        setAdminProfile(perfilEncontrado);

        // 2. Cargar centros de votación
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

        // 3. Cargar reportes
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
            } else { hayMas = false; }
          }
          return todosLosReportes;
        };

        const [resCentros, resUsuarios, resReportes] = await Promise.all([
          fetchTodosLosCentros(),
          supabase.from('directorio_operativo').select('*').limit(5000),
          fetchTodosLosReportes()
        ]);

        if (resCentros) setCentros(resCentros);
        if (resUsuarios.data) setUsuarios(resUsuarios.data);
        if (resReportes) setReportes(resReportes);
      } catch (err) {
        console.error('Error al cargar datos:', err);
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
      if (u.situr) mapa.set(u.situr.toString().trim(), u);
    });
    return mapa;
  }, [usuarios]);

  const mapaReportesExactos = useMemo(() => {
    const mapaExacto = new Map();
    [...reportes].reverse().forEach(r => {
      if (r.cod_centro) mapaExacto.set(r.cod_centro.toString().trim(), r);
    });
    return mapaExacto;
  }, [reportes]);

  // Únicamente VEN 911 o SUPERUSUARIO pueden ver todo los organismos
  const orgUser = (adminProfile?.organismo_responsable || adminProfile?.organismo || '').toUpperCase();
  const rolUser = (adminProfile?.rol || '').toUpperCase();
  
  const isVen911OrSuper = rolUser === 'SUPERUSUARIO' || 
                          orgUser.includes('VEN 911') || 
                          orgUser.includes('VEN-911') ||
                          orgUser === 'VEN 911';

  // Si no es VEN 911 ni SUPERUSUARIO, se restringe estrictamente a su organismo asignado
  const organismoSeguro = isVen911OrSuper 
    ? filtroOrganismo 
    : (adminProfile?.organismo_responsable || adminProfile?.organismo || '');

  const municipiosUnicos = useMemo(() => {
    const mCentros = centros.map(c => c.MUNICIPIO || c.municipio).filter(Boolean);
    const mUsers = usuarios.map(u => u.municipio).filter(Boolean);
    return Array.from(new Set([...mCentros, ...mUsers])).sort();
  }, [centros, usuarios]);

  const organismosUnicos = useMemo(() => {
    return Array.from(new Set(usuarios.map(u => u.organismo_responsable || u.organismo))).filter(Boolean).sort();
  }, [usuarios]);

  const centrosProcesados = useMemo(() => {
    return centros.map(c => {
      const codigoSiturLimpio = (c.CODIGO_CIRCUITO_COMUNAL || c.SITUR || c.situr || '')?.toString().trim();
      const jefe = mapaJefes.get(codigoSiturLimpio);
      const codigoCentroLimpio = (c.COD_CENTRO || c.cod_centro || '')?.toString().trim();
      let reporte = mapaReportesExactos.get(codigoCentroLimpio);
      
      const municipioCentro = c.MUNICIPIO || c.municipio || jefe?.municipio || 'SIN MUNICIPIO';
      const parroquiaCentro = c.PARROQUIA || c.parroquia || jefe?.parroquia || 'SIN PARROQUIA';
      const organismoCentro = jefe?.organismo_responsable || jefe?.organismo || c.organismo || 'SIN ORGANISMO';

      return {
        ...c,
        COD_CENTRO: codigoCentroLimpio,
        CODIGO_CIRCUITO_COMUNAL: codigoSiturLimpio,
        nombre_centro: c['NOMBRE CENTRO'] || c.nombre_centro || c.NOMBRE_CENTRO || 'CENTRO ELECTORAL',
        municipio: municipioCentro,
        parroquia: parroquiaCentro,
        organismo: organismoCentro,
        jefe_nombre: jefe?.nombre_apellido_jefe || jefe?.jefe || 'POR ASIGNAR',
        jefe_telefono: jefe?.telefono_cuadrante || jefe?.telefono || 'S/N',
        jefe_jerarquia: jefe?.grado_jerarquia || jefe?.rango || 'Funcionario',
        comuna: jefe?.comuna_o_circuito_comunal || jefe?.circuito || 'N/A',
        
        responsable_cne: reporte?.responsable_cne || 'NO REGISTRADO',
        responsable_mesa: reporte?.responsable_mesa || 'NO REGISTRADO',
        entrega_cotillon: reporte?.entrega_cotillon || 'PENDIENTE',
        motivo_no_cotillon: reporte?.motivo_no_cotillon || '',
        minuta: reporte?.minuta || '',
        
        cierre_mesas: reporte?.cierre_mesas || 'PENDIENTE', 
        fecha_reporte: reporte?.fecha_reporte ? new Date(reporte.fecha_reporte).toLocaleString('es-VE') : 'Sin reporte'
      };
    }).filter(c => {
      const matchMuni = !filtroMunicipio || c.municipio.toUpperCase() === filtroMunicipio.toUpperCase();
      const matchOrganismo = !organismoSeguro || c.organismo.toUpperCase().includes(organismoSeguro.toUpperCase());
      const matchCotillon = !filtroCotillon || c.entrega_cotillon === filtroCotillon;
      const matchEstatus = !filtroEstatus || c.cierre_mesas === filtroEstatus;
      return matchMuni && matchOrganismo && matchCotillon && matchEstatus;
    });
  }, [centros, mapaJefes, mapaReportesExactos, filtroMunicipio, organismoSeguro, filtroCotillon, filtroEstatus]);

  const stats = useMemo(() => {
    const total = centrosProcesados.length;
    const inspeccionadasReal = centrosProcesados.filter(c => c.cierre_mesas === 'CERRADO' || c.responsable_cne !== 'NO REGISTRADO').length;
    const cotillonSi = centrosProcesados.filter(c => c.entrega_cotillon === 'SI').length;
    const cotillonNo = centrosProcesados.filter(c => c.entrega_cotillon === 'NO').length;
    const pendientesCalculados = Math.max(0, total - inspeccionadasReal);
    return { total, inspeccionadas: inspeccionadasReal, pendientes: pendientesCalculados, cotillonSi, cotillonNo };
  }, [centrosProcesados]);

  const generarPDF = () => {
    const doc = new jsPDF('landscape'); 
    doc.setFontSize(16);
    doc.text('Reporte Oficial - Segunda Consulta Popular Nacional 2026', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Organismo: ${organismoSeguro || 'TODOS'} | Municipio: ${filtroMunicipio || 'TODOS'}`, 14, 28);
    doc.text(`Total Centros: ${stats.total} | Reportados: ${stats.inspeccionadas} | Cotillón SÍ: ${stats.cotillonSi} | Cotillón NO: ${stats.cotillonNo}`, 14, 34);

    if(centrosProcesados.length === 0) {
      alert("No hay reportes registrados con este filtro para generar el PDF.");
      return;
    }

    const tableColumn = ["Municipio", "Plantel / Escuela", "Resp. CNE", "Resp. Mesa", "Cotillón?", "Minuta / Novedades"];
    const tableRows = centrosProcesados.map(c => [
      c.municipio, 
      c.nombre_centro, 
      c.responsable_cne, 
      c.responsable_mesa, 
      c.entrega_cotillon === 'SI' ? ' SÍ' : c.entrega_cotillon === 'NO' ? `NO (${c.motivo_no_cotillon || 'Sin motivo'})` : 'PENDIENTE', 
      c.minuta || 'Sin minuta registrada.'
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
      headStyles: { fillColor: [0, 82, 155], textColor: [255, 255, 255] },
      columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 45 }, 2: { cellWidth: 35 }, 3: { cellWidth: 35 }, 4: { cellWidth: 25 }, 5: { cellWidth: 'auto' } }
    });
    doc.save('Consulta_Popular_2026_Reporte.pdf');
  };

  const generarExcel = () => {
    if (centrosProcesados.length === 0) {
      alert("No hay reportes registrados con este filtro para generar el Excel.");
      return;
    }

    const wsData: any[][] = [
      ["REPORTE OFICIAL - SEGUNDA CONSULTA POPULAR NACIONAL 2026"],
      [],
      ["ESTADÍSTICAS GENERALES"],
      [`Organismo: ${organismoSeguro || 'TODOS'}`, `Municipio: ${filtroMunicipio || 'TODOS'}`],
      [`Total Centros: ${stats.total}`, `Reportados: ${stats.inspeccionadas}`, `Cotillón SÍ: ${stats.cotillonSi}`, `Cotillón NO: ${stats.cotillonNo}`],
      [],
      ["Municipio", "Nombre del Plantel", "Responsable CNE", "Responsable de Mesa", "Entrega Cotillón", "Motivo (Si aplica)", "Minuta del Plantel"]
    ];

    centrosProcesados.forEach(c => {
      wsData.push([
        c.municipio, 
        c.nombre_centro, 
        c.responsable_cne, 
        c.responsable_mesa, 
        c.entrega_cotillon, 
        c.motivo_no_cotillon || 'N/A', 
        c.minuta || ''
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];
    ws['!cols'] = [{ wch: 20 }, { wch: 45 }, { wch: 30 }, { wch: 30 }, { wch: 15 }, { wch: 30 }, { wch: 80 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Consulta Popular 2026');
    XLSX.writeFile(wb, 'Consulta_Popular_2026_Reporte.xlsx');
  };

  if (loading) return <div className="p-8 text-center font-bold animate-pulse text-[#00529b]">Cargando Sala Analítica de la Consulta Popular...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-6 space-y-4">
      {/* CABECERA DE USUARIO AUTENTICADO */}
      <div className="bg-white p-4 rounded-2xl border shadow-sm flex justify-between items-center flex-wrap gap-4">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-[#00529b] font-bold text-xs uppercase bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-200 transition-colors">
          <ArrowLeft size={16} /> Volver a Inicio Admin
        </Link>

        {adminProfile && (
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 px-4 py-2 rounded-2xl">
            <div className="p-2 bg-blue-100 text-[#00529b] rounded-full">
              <UserCheck size={18} />
            </div>
            <div>
              <p className="text-xs font-black text-gray-900 uppercase">
                {adminProfile.nombre_apellido_jefe || adminProfile.nombre || 'USUARIO CONECTADO'} 
                <span className="ml-2 text-[10px] bg-blue-100 text-[#00529b] px-2 py-0.5 rounded font-bold uppercase">
                  {adminProfile.grado_jerarquia || adminProfile.cargo || 'FUNCIONARIO'}
                </span>
              </p>
              <p className="text-[10px] text-gray-500 font-bold uppercase">
                {adminProfile.rol || 'USUARIO'} - {adminProfile.organismo_responsable || adminProfile.organismo || 'ORGANISMO'}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <button onClick={generarExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-colors uppercase">
            <FileSpreadsheet size={16} /> Descargar Excel
          </button>
          <button onClick={generarPDF} className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-colors uppercase">
            <Download size={16} /> Descargar PDF
          </button>
        </div>
      </div>

      {/* TITULO SALA SITUACIONAL */}
      <div className="bg-gradient-to-r from-[#00529b] to-blue-900 p-6 rounded-3xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-md">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wide flex items-center gap-2"><BarChart3 /> Segunda Consulta Popular Nacional 2026</h1>
          <p className="text-xs text-blue-100 font-medium mt-1">Monitoreo y control centralizado de centros electorales y entrega de cotillones</p>
        </div>
      </div>

      {/* METRICAS Y TARJETAS */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 pt-2">
        <div className="bg-white border rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div><p className="text-[10px] font-bold text-gray-400 uppercase">Centros Asignados</p><p className="text-2xl font-black text-gray-800 mt-1">{stats.total}</p></div>
          <div className="bg-blue-50 text-[#00529b] p-3 rounded-full"><MapPin size={24}/></div>
        </div>
        <div className="bg-white border rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div><p className="text-[10px] font-bold text-gray-400 uppercase">Reportados</p><p className="text-2xl font-black text-indigo-600 mt-1">{stats.inspeccionadas}</p></div>
          <div className="bg-indigo-50 text-indigo-600 p-3 rounded-full"><SearchCheck size={24}/></div>
        </div>
        <div className="bg-white border rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div><p className="text-[10px] font-bold text-gray-400 uppercase">Cotillón SÍ</p><p className="text-2xl font-black text-emerald-600 mt-1">{stats.cotillonSi}</p></div>
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-full"><CheckCircle2 size={24}/></div>
        </div>
        <div className="bg-white border rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div><p className="text-[10px] font-bold text-gray-400 uppercase">Cotillón NO</p><p className="text-2xl font-black text-red-600 mt-1">{stats.cotillonNo}</p></div>
          <div className="bg-red-50 text-red-600 p-3 rounded-full"><AlertTriangle size={24}/></div>
        </div>
        <div className="bg-white border rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div><p className="text-[10px] font-bold text-gray-400 uppercase">Pendientes</p><p className="text-2xl font-black text-amber-500 mt-1">{stats.pendientes}</p></div>
          <div className="bg-amber-50 text-amber-500 p-3 rounded-full"><Clock size={24}/></div>
        </div>
      </div>

      {/* FILTROS INTERACTIVOS */}
      <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex flex-col">
          <label className="text-[10px] font-bold text-gray-400 mb-1 uppercase">Municipio</label>
          <select value={filtroMunicipio} onChange={e => setFiltroMunicipio(e.target.value)} className="p-2 border rounded-lg bg-white text-xs outline-none font-bold text-gray-700">
            <option value="">Todos los Municipios</option>
            {municipiosUnicos.map((m, i) => <option key={i} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Solo visible si el usuario pertenece al VEN 911 o es SUPERUSUARIO */}
        {isVen911OrSuper && (
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 mb-1 uppercase">Organismo</label>
            <select value={filtroOrganismo} onChange={e => setFiltroOrganismo(e.target.value)} className="p-2 border rounded-lg bg-white text-xs outline-none font-bold text-gray-700">
              <option value="">Todos los Organismos</option>
              {organismosUnicos.map((o, i) => <option key={i} value={o}>{o}</option>)}
            </select>
          </div>
        )}

        <div className="flex flex-col">
          <label className="text-[10px] font-bold text-gray-400 mb-1 uppercase">Entrega Cotillón</label>
          <select value={filtroCotillon} onChange={e => setFiltroCotillon(e.target.value)} className="p-2 border rounded-lg bg-white text-xs outline-none font-bold text-gray-700">
            <option value="">Todos</option>
            <option value="SI">SÍ</option>
            <option value="NO">NO</option>
            <option value="PENDIENTE">PENDIENTE</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-[10px] font-bold text-gray-400 mb-1 uppercase">Estatus General</label>
          <select value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)} className="p-2 border rounded-lg bg-white text-xs outline-none font-bold text-gray-700">
            <option value="">Todas</option>
            <option value="CERRADO">COMPLETADA</option>
            <option value="PENDIENTE">PENDIENTE</option>
          </select>
        </div>
      </div>

      {/* TABLA DE RESULTADOS */}
      <div className="bg-white rounded-2xl border shadow-inner overflow-hidden">
        <div className="overflow-x-auto max-h-[55vh]">
          <table className="w-full text-left bg-white text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px] border-b sticky top-0 z-10">
              <tr>
                <th className="p-3">CNE / SITUR</th>
                <th className="p-3">Plantel / Centro Electoral</th>
                <th className="p-3">Asignación</th>
                <th className="p-3">Responsables (CNE / Mesa)</th>
                <th className="p-3 text-center">Cotillón</th>
                <th className="p-3 text-center">Progreso</th>
                <th className="p-3 text-center">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {centrosProcesados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-500 font-bold">
                    No se encontraron centros registrados para este organismo o filtros seleccionados.
                  </td>
                </tr>
              ) : (
                centrosProcesados.map((c, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-gray-500">
                      CNE: {c.COD_CENTRO || 'N/A'}<br/>
                      STR: {c.CODIGO_CIRCUITO_COMUNAL || 'N/A'}
                    </td>
                    <td className="p-3 font-black text-gray-800 uppercase max-w-[200px] truncate" title={c.nombre_centro}>
                      {c.nombre_centro}<br/>
                      <span className="text-[10px] text-gray-400 font-medium">{c.municipio} ({c.parroquia})</span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-[#00529b] block">{c.organismo}</span>
                      <span className="text-[10px] text-gray-500">{c.jefe_jerarquia} {c.jefe_nombre}</span>
                    </td>
                    <td className="p-3 text-gray-700 font-bold uppercase">
                      CNE: {c.responsable_cne}<br/>
                      Mesa: {c.responsable_mesa}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black ${
                        c.entrega_cotillon === 'SI' ? 'text-emerald-700 bg-emerald-100 border border-emerald-200' : 
                        c.entrega_cotillon === 'NO' ? 'text-red-700 bg-red-100 border border-red-200' : 'text-gray-500 bg-gray-100'
                      }`}>
                        {c.entrega_cotillon}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DETALLE / EXPEDIENTE */}
      {centroSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl relative border">
            <div className="flex justify-between items-start border-b pb-3">
              <div className="flex items-center gap-2 text-[#00529b]">
                <Building size={22} />
                <div>
                  <h2 className="text-base font-black uppercase text-gray-900">Expediente de Consulta Popular 2026</h2>
                  <p className="text-[11px] font-mono text-gray-500 font-bold">CNE: {centroSeleccionado.COD_CENTRO} | Fecha: {centroSeleccionado.fecha_reporte}</p>
                </div>
              </div>
              <button onClick={() => setCentroSeleccionado(null)} className="text-gray-400 hover:text-red-600 bg-gray-100 p-1.5 rounded-full"><X size={18} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Datos del Centro</h3>
                  <p className="text-sm font-black text-gray-800 uppercase leading-snug">{centroSeleccionado.nombre_centro}</p>
                  <p className="text-xs text-gray-500 mt-1">{centroSeleccionado.DIRECCION || centroSeleccionado.direccion || 'Sin dirección registrada'}</p>
                  <p className="text-[11px] font-bold text-gray-700 mt-2">{centroSeleccionado.municipio} - {centroSeleccionado.parroquia}</p>
                </div>

                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <h3 className="text-[10px] font-black text-[#00529b] uppercase tracking-wider mb-2 flex items-center gap-1"><Shield size={12}/> Responsable de Cuadrante ({centroSeleccionado.organismo})</h3>
                  <div className="text-xs font-medium text-gray-700 space-y-1">
                    <p><strong>Comuna/Circuito:</strong> {centroSeleccionado.comuna}</p>
                    <p><strong>Funcionario:</strong> {centroSeleccionado.jefe_jerarquia} {centroSeleccionado.jefe_nombre}</p>
                    <p><strong>Teléfono:</strong> {centroSeleccionado.jefe_telefono}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-emerald-50/30 p-4 rounded-xl border border-emerald-100">
                  <h3 className="text-[10px] font-black text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1"><SearchCheck size={12}/> Datos de la Elección</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center border-b pb-1">
                      <span className="font-bold text-gray-500 uppercase">Resp. CNE:</span>
                      <span className="font-bold text-gray-800 uppercase">{centroSeleccionado.responsable_cne}</span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-1">
                      <span className="font-bold text-gray-500 uppercase">Resp. Mesa:</span>
                      <span className="font-bold text-gray-800 uppercase">{centroSeleccionado.responsable_mesa}</span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-1">
                      <span className="font-bold text-gray-500 uppercase">Entrega Cotillón:</span>
                      <span className={`font-black px-2 py-0.5 rounded ${centroSeleccionado.entrega_cotillon === 'SI' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{centroSeleccionado.entrega_cotillon}</span>
                    </div>
                    {centroSeleccionado.entrega_cotillon === 'NO' && (
                      <div>
                        <span className="font-bold text-red-600 uppercase block mb-1">Motivo de no entrega:</span>
                        <p className="bg-white p-2 rounded border text-gray-800">{centroSeleccionado.motivo_no_cotillon}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-amber-50/30 p-4 rounded-xl border border-amber-100">
                  <h3 className="text-[10px] font-black text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1"><FileText size={12}/> Minuta Informativa</h3>
                  <div className="bg-white rounded-xl border p-3 min-h-[90px] max-h-40 overflow-y-auto space-y-2">
                    <p className="text-[11px] text-gray-700 font-medium leading-relaxed whitespace-pre-line">
                      {centroSeleccionado.minuta || 'Sin minuta registrada.'}
                    </p>
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
