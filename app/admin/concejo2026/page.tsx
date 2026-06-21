'use client';
import { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart3, Shield, MapPin, CheckCircle2, AlertTriangle, Eye, X, UserCheck, Clock, School, ArrowLeft, Flag, FileText, Download } from 'lucide-react';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function SalaSituacionalConcejoPage() {
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [centros, setCentros] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [reportes, setReportes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ESTADOS DE FILTROS 
  const [filtroMunicipio, setFiltroMunicipio] = useState('');
  const [filtroOrganismo, setFiltroOrganismo] = useState('');
  const [filtroCotillon, setFiltroCotillon] = useState('');
  const [filtroToma, setFiltroToma] = useState('');
  const [filtroInstalacion, setFiltroInstalacion] = useState('');
  const [filtroApertura, setFiltroApertura] = useState('');
  
  const [centroSeleccionado, setCentroSeleccionado] = useState<any | null>(null);

  useEffect(() => {
    const descargarTodo = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: adminData } = await supabase.from('directorio_operativo').select('*').eq('id', user.id).single();
        setAdminProfile(adminData);

        const [resCentros, resUsuarios, resReportes] = await Promise.all([
          supabase.from('centros_votacion_2026').select('*'),
          supabase.from('directorio_operativo').select('*').neq('rol', 'admin').neq('rol', 'superusuario'),
          supabase.from('reportes_concejo_2026').select('*').order('fecha_reporte', { ascending: false })
        ]);

        if (resCentros.data) setCentros(resCentros.data);
        if (resUsuarios.data) setUsuarios(resUsuarios.data);
        if (resReportes.data) setReportes(resReportes.data);
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

  const mapaReportes = useMemo(() => {
    const mapa = new Map();
    reportes.forEach(r => {
      if (r.cod_centro && !mapa.has(r.cod_centro)) {
        mapa.set(r.cod_centro, r);
      }
    });
    return mapa;
  }, [reportes]);

  // SEGURIDAD: ¿Es VEN 911 o Superusuario?
  const isSuperAdmin = adminProfile?.rol === 'superusuario' || adminProfile?.organismo_responsable?.toUpperCase() === 'VEN 911';
  // Si no es VEN 911, forzamos su organismo
  const organismoSeguro = isSuperAdmin ? filtroOrganismo : adminProfile?.organismo_responsable;

  const municipiosUnicos = useMemo(() => Array.from(new Set(usuarios.map(u => u.municipio))).filter(Boolean).sort(), [usuarios]);
  const organismosUnicos = useMemo(() => Array.from(new Set(usuarios.map(u => u.organismo_responsable))).filter(Boolean).sort(), [usuarios]);

  const centrosProcesados = useMemo(() => {
    // FILTRO ANTI-DUPLICADOS: Agrupamos las escuelas por Código CNE
    const centrosUnicosMap = new Map();
    centros.forEach(c => {
      if (!centrosUnicosMap.has(c.COD_CENTRO)) {
        centrosUnicosMap.set(c.COD_CENTRO, c);
      }
    });
    const centrosUnicos = Array.from(centrosUnicosMap.values());

    // Ahora mapeamos sobre los centros únicos, no sobre toda la base de datos
    return centrosUnicos.map(c => {
      const jefe = mapaJefes.get(c.CODIGO_CIRCUITO_COMUNAL?.toString().trim());
      const reporte = mapaReportes.get(c.COD_CENTRO);
      
      return {
        ...c,
        municipio: jefe?.municipio || 'SIN ENLAZAR',
        parroquia: jefe?.parroquia || 'SIN ENLAZAR',
        organismo: jefe?.organismo_responsable || 'SIN ORGANISMO',
        jefe_nombre: jefe?.nombre_apellido_jefe || 'POR ASIGNAR',
        jefe_telefono: jefe?.telefono_cuadrante || 'S/N',
        jefe_jerarquia: jefe?.grado_jerarquia || 'Funcionario',
        comuna: jefe?.comuna_o_circuito_comunal || 'N/A',
        
        coord_centro_votacion: reporte?.coord_centro_votacion || 'Por asignar',
        presidenta_centro: reporte?.presidenta_centro || 'Por asignar',
        presidenta_mesa: reporte?.presidenta_mesa || 'Por asignar',
        secretaria: reporte?.secretaria || 'Por asignar',
        entrega_cotillon: reporte?.entrega_cotillon || 'PENDIENTE',
        toma_centro: reporte?.toma_centro || 'PENDIENTE',
        instalacion_mesas: reporte?.instalacion_mesas || 'PENDIENTE',
        apertura: reporte?.apertura || 'PENDIENTE',
        cierre_mesas: reporte?.cierre_mesas || 'PENDIENTE',
        resena: reporte?.resena || 'Sin reseña registrada.',
        observaciones: reporte?.observaciones || 'Sin observaciones.',
        fecha_reporte: reporte?.fecha_reporte ? new Date(reporte.fecha_reporte).toLocaleString('es-VE') : 'Sin reporte'
      };
    }).filter(c => {
      const matchMuni = !filtroMunicipio || c.municipio === filtroMunicipio;
      const matchOrganismo = !organismoSeguro || c.organismo === organismoSeguro;
      const matchCotillon = !filtroCotillon || c.entrega_cotillon === filtroCotillon;
      const matchToma = !filtroToma || c.toma_centro === filtroToma;
      const matchInstalacion = !filtroInstalacion || c.instalacion_mesas === filtroInstalacion;
      const matchApertura = !filtroApertura || c.apertura === filtroApertura;
      
      return matchMuni && matchOrganismo && matchCotillon && matchToma && matchInstalacion && matchApertura;
    });
  }, [centros, mapaJefes, mapaReportes, filtroMunicipio, organismoSeguro, filtroCotillon, filtroToma, filtroInstalacion, filtroApertura]);

  const stats = useMemo(() => {
    const total = centrosProcesados.length;
    const recibidos = centrosProcesados.filter(c => c.entrega_cotillon === 'RECIBIDO').length;
    const pendientes = total - recibidos;
    return { total, recibidos, pendientes };
  }, [centrosProcesados]);

  // FUNCIÓN PARA GENERAR EL PDF ORDENADO
  const generarPDF = () => {
    const doc = new jsPDF('landscape'); 
    
    // Título
    doc.setFontSize(16);
    doc.text('Reporte General - Operativo Consulta Popular 2026', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    let subtitulo = `Organismo: ${organismoSeguro || 'TODOS'} | Municipio: ${filtroMunicipio || 'TODOS'}`;
    doc.text(subtitulo, 14, 28);
    doc.text(`Totales: ${stats.total} Centros | Cotillón Recibido: ${stats.recibidos} | Pendientes: ${stats.pendientes}`, 14, 34);

    const tableColumn = ["CNE", "Centro", "SITUR", "Toma", "Cotillón", "Instalación", "Apertura", "Cierre"];
    const tableRows = centrosProcesados.map(c => [
      c.COD_CENTRO,
      c['NOMBRE CENTRO'],
      c.CODIGO_CIRCUITO_COMUNAL,
      c.toma_centro,
      c.entrega_cotillon,
      c.instalacion_mesas,
      c.apertura,
      c.cierre_mesas
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 82, 155] }
    });

    doc.save('Reporte_Electoral_VEN911.pdf');
  };

  if (loading) return <div className="p-8 text-center font-bold animate-pulse text-[#00529b]">Cargando Sala Analítica Regional...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-6 space-y-4">
      
      <div className="flex justify-between items-center">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-[#00529b] font-bold text-xs uppercase bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200 transition-colors w-fit">
          <ArrowLeft size={16} /> Volver a Inicio Admin
        </Link>
        
        {/* BOTÓN DESCARGAR PDF */}
        <button onClick={generarPDF} className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition-colors uppercase">
          <Download size={16} /> Descargar Reporte PDF
        </button>
      </div>

      <div className="bg-gradient-to-r from-[#00529b] to-blue-900 p-6 rounded-3xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-md">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wide flex items-center gap-2"><BarChart3 /> Sala Situacional Operativa</h1>
          <p className="text-xs text-blue-100 font-medium mt-1">Monitoreo y auditoría analítica de despliegues y material electoral en Falcón</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div className="bg-white border rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div><p className="text-[10px] font-bold text-gray-400 uppercase">Centros Filtrados</p><p className="text-2xl font-black text-gray-800 mt-1">{stats.total}</p></div>
          <div className="bg-blue-50 text-[#00529b] p-3 rounded-full"><MapPin size={24}/></div>
        </div>
        <div className="bg-white border rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div><p className="text-[10px] font-bold text-gray-400 uppercase">Cotillón Recibido</p><p className="text-2xl font-black text-emerald-600 mt-1">{stats.recibidos}</p></div>
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-full"><CheckCircle2 size={24}/></div>
        </div>
        <div className="bg-white border rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div><p className="text-[10px] font-bold text-gray-400 uppercase">Despliegue Pendiente</p><p className="text-2xl font-black text-red-600 mt-1">{stats.pendientes}</p></div>
          <div className="bg-red-50 text-red-600 p-3 rounded-full"><AlertTriangle size={24}/></div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex flex-col"><label className="text-[10px] font-bold text-gray-400 mb-1 uppercase">Municipio</label><select value={filtroMunicipio} onChange={e => setFiltroMunicipio(e.target.value)} className="p-2 border rounded-lg bg-white text-xs outline-none font-bold text-gray-700"><option value="">Todos los Municipios</option>{municipiosUnicos.map((m, i) => <option key={i} value={m}>{m}</option>)}</select></div>
        
        {/* CANDADO DE SEGURIDAD: Solo el VEN 911 puede cambiar este filtro */}
        {isSuperAdmin && (
          <div className="flex flex-col"><label className="text-[10px] font-bold text-gray-400 mb-1 uppercase">Organismo</label><select value={filtroOrganismo} onChange={e => setFiltroOrganismo(e.target.value)} className="p-2 border rounded-lg bg-white text-xs outline-none font-bold text-gray-700"><option value="">Todos los Organismos</option>{organismosUnicos.map((o, i) => <option key={i} value={o}>{o}</option>)}</select></div>
        )}

        <div className="flex flex-col"><label className="text-[10px] font-bold text-gray-400 mb-1 uppercase">Estatus Cotillón</label><select value={filtroCotillon} onChange={e => setFiltroCotillon(e.target.value)} className="p-2 border rounded-lg bg-white text-xs outline-none font-bold text-gray-700"><option value="">Todos</option><option value="PENDIENTE">PENDIENTE</option><option value="RECIBIDO">RECIBIDO</option></select></div>
        
        <div className="flex flex-col"><label className="text-[10px] font-bold text-gray-400 mb-1 uppercase">Toma de Centro</label><select value={filtroToma} onChange={e => setFiltroToma(e.target.value)} className="p-2 border rounded-lg bg-white text-xs outline-none font-bold text-gray-700"><option value="">Todos</option><option value="PENDIENTE">PENDIENTE</option><option value="REALIZADA">REALIZADA</option></select></div>
        
        <div className="flex flex-col"><label className="text-[10px] font-bold text-gray-400 mb-1 uppercase">Instalación Mesas</label><select value={filtroInstalacion} onChange={e => setFiltroInstalacion(e.target.value)} className="p-2 border rounded-lg bg-white text-xs outline-none font-bold text-gray-700"><option value="">Todos</option><option value="PENDIENTE">PENDIENTE</option><option value="REALIZADA">REALIZADA</option></select></div>
        
        <div className="flex flex-col"><label className="text-[10px] font-bold text-gray-400 mb-1 uppercase">Apertura</label><select value={filtroApertura} onChange={e => setFiltroApertura(e.target.value)} className="p-2 border rounded-lg bg-white text-xs outline-none font-bold text-gray-700"><option value="">Todos</option><option value="PENDIENTE">PENDIENTE</option><option value="REALIZADA">REALIZADA</option></select></div>
      </div>

      <div className="bg-white rounded-2xl border shadow-inner overflow-hidden">
        <div className="overflow-x-auto max-h-[55vh]">
          <table className="w-full text-left bg-white text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px] border-b sticky top-0 z-10">
              <tr>
                <th className="p-3">CNE / SITUR</th>
                <th className="p-3">Centro de Votación</th>
                <th className="p-3">Organismo / Jefe</th>
                <th className="p-3 text-center">Toma</th>
                <th className="p-3 text-center">Cotillón</th>
                <th className="p-3 text-center">Instalación</th>
                <th className="p-3 text-center">Apertura</th>
                <th className="p-3 text-center">Cierre</th>
                <th className="p-3 text-center">Auditoría</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {centrosProcesados.map((c, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="p-3 font-mono font-bold text-gray-500">CNE: {c.COD_CENTRO}<br/>STR: {c.CODIGO_CIRCUITO_COMUNAL}</td>
                  <td className="p-3 font-black text-gray-800 uppercase max-w-[200px] truncate" title={c['NOMBRE CENTRO']}>{c['NOMBRE CENTRO']}<br/><span className="text-[10px] text-gray-400 font-medium">{c.municipio} ({c.parroquia})</span></td>
                  <td className="p-3"><span className="font-bold text-[#00529b] block">{c.organismo}</span><span className="text-[10px] text-gray-500">{c.jefe_jerarquia} {c.jefe_nombre}</span></td>
                  
                  <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded text-[10px] font-black ${c.toma_centro === 'REALIZADA' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>{c.toma_centro}</span></td>
                  <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded text-[10px] font-black ${c.entrega_cotillon === 'RECIBIDO' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>{c.entrega_cotillon}</span></td>
                  <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded text-[10px] font-black ${c.instalacion_mesas === 'REALIZADA' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>{c.instalacion_mesas}</span></td>
                  <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded text-[10px] font-black ${c.apertura === 'REALIZADA' ? 'text-blue-600 bg-blue-50' : 'text-gray-400 bg-gray-50'}`}>{c.apertura}</span></td>
                  <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded text-[10px] font-black ${c.cierre_mesas === 'CERRADO' ? 'text-red-600 bg-red-50' : 'text-gray-400 bg-gray-50'}`}>{c.cierre_mesas}</span></td>
                  
                  <td className="p-3 text-center">
                    <button onClick={() => setCentroSeleccionado(c)} className="bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-[#00529b] p-2 rounded-xl transition-all border border-gray-200 hover:border-blue-200 shadow-sm inline-flex items-center gap-1 font-bold text-[10px] uppercase">
                      <Eye size={14} /> Detalle
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
                <School size={22} />
                <div>
                  <h2 className="text-base font-black uppercase text-gray-900">Expediente Operativo Electoral</h2>
                  <p className="text-[11px] font-mono text-gray-500 font-bold">CNE: {centroSeleccionado.COD_CENTRO} | Última Actualización: {centroSeleccionado.fecha_reporte}</p>
                </div>
              </div>
              <button onClick={() => setCentroSeleccionado(null)} className="text-gray-400 hover:text-red-600 bg-gray-100 p-1.5 rounded-full"><X size={18} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Datos del Centro</h3>
                  <p className="text-sm font-black text-gray-800 uppercase leading-snug">{centroSeleccionado['NOMBRE CENTRO']}</p>
                  <p className="text-xs text-gray-500 mt-1">{centroSeleccionado.DIRECCION}</p>
                  <p className="text-[11px] font-bold text-gray-700 mt-2">{centroSeleccionado.municipio} - {centroSeleccionado.parroquia} (Mesas: {centroSeleccionado.MESA})</p>
                </div>

                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <h3 className="text-[10px] font-black text-[#00529b] uppercase tracking-wider mb-2 flex items-center gap-1"><Shield size={12}/> Custodia ({centroSeleccionado.organismo})</h3>
                  <div className="text-xs font-medium text-gray-700 space-y-1">
                    <p><strong>Circuito:</strong> {centroSeleccionado.comuna}</p>
                    <p><strong>Funcionario:</strong> {centroSeleccionado.jefe_jerarquia} {centroSeleccionado.jefe_nombre}</p>
                    <p><strong>Teléfono:</strong> {centroSeleccionado.jefe_telefono}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-emerald-50/30 p-4 rounded-xl border border-emerald-100">
                  <h3 className="text-[10px] font-black text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1"><Flag size={12}/> Fases del Evento</h3>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-black">
                    <div className="bg-white p-2 rounded border">Toma: <span className={centroSeleccionado.toma_centro === 'REALIZADA' ? 'text-emerald-600' : 'text-amber-500'}>{centroSeleccionado.toma_centro}</span></div>
                    <div className="bg-white p-2 rounded border">Cotillón: <span className={centroSeleccionado.entrega_cotillon === 'RECIBIDO' ? 'text-emerald-600' : 'text-amber-500'}>{centroSeleccionado.entrega_cotillon}</span></div>
                    <div className="bg-white p-2 rounded border col-span-2">Instalación: <span className={centroSeleccionado.instalacion_mesas === 'REALIZADA' ? 'text-emerald-600' : 'text-amber-500'}>{centroSeleccionado.instalacion_mesas}</span></div>
                    <div className="bg-white p-2 rounded border">Apertura: <span className={centroSeleccionado.apertura === 'REALIZADA' ? 'text-emerald-600' : 'text-gray-400'}>{centroSeleccionado.apertura}</span></div>
                    <div className="bg-white p-2 rounded border border-red-100">Cierre: <span className={centroSeleccionado.cierre_mesas === 'CERRADO' ? 'text-red-600' : 'text-gray-400'}>{centroSeleccionado.cierre_mesas}</span></div>
                  </div>
                </div>
                
                {/* MOSTRANDO LAS AUTORIDADES FALTANTES AHORA SÍ */}
                <div className="bg-indigo-50/30 p-4 rounded-xl border border-indigo-100">
                  <h3 className="text-[10px] font-black text-indigo-700 uppercase tracking-wider mb-2 flex items-center gap-1"><UserCheck size={12}/> Autoridades Asignadas</h3>
                  <div className="space-y-1.5 text-[10px] text-gray-700 uppercase">
                    <p><strong className="text-gray-500">Director de Plantel:</strong> <span className="font-bold bg-white px-1 border rounded">{centroSeleccionado.coord_centro_votacion}</span></p>
                    <p><strong className="text-gray-500">Representante CNE:</strong> <span className="font-bold bg-white px-1 border rounded">{centroSeleccionado.presidenta_centro}</span></p>
                    <p><strong className="text-gray-500">Representante Comunal:</strong> <span className="font-bold bg-white px-1 border rounded">{centroSeleccionado.presidenta_mesa}</span></p>
                    <p><strong className="text-gray-500">Secretario CNE:</strong> <span className="font-bold bg-white px-1 border rounded">{centroSeleccionado.secretaria}</span></p>
                  </div>
                </div>

                <div className="bg-amber-50/30 p-4 rounded-xl border border-amber-100">
                  <h3 className="text-[10px] font-black text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1"><FileText size={12}/> Novedades Reportadas</h3>
                  <div className="space-y-2 text-xs">
                    <div><span className="font-bold text-gray-500">Reseña:</span><p className="bg-white p-2 rounded border mt-0.5 text-gray-800 whitespace-pre-wrap">{centroSeleccionado.resena}</p></div>
                    <div><span className="font-bold text-gray-500">Observaciones:</span><p className="bg-white p-2 rounded border mt-0.5 text-gray-800">{centroSeleccionado.observaciones}</p></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button onClick={() => setCentroSeleccionado(null)} className="bg-gray-800 hover:bg-gray-900 text-white font-bold text-xs px-6 py-2.5 rounded-xl uppercase transition-colors shadow-sm">
                Cerrar Expediente
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
