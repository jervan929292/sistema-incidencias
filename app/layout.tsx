'use client';
import { useEffect, useState, useMemo } from 'react';
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
  
  const [filtroMunicipio, setFiltroMunicipio] = useState('');
  const [filtroOrganismo, setFiltroOrganismo] = useState('');
  const [filtroCotillon, setFiltroCotillon] = useState('');
  
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

  const isSuperAdmin = adminProfile?.rol === 'superusuario' || adminProfile?.organismo_responsable?.toUpperCase() === 'VEN 911';
  const organismoSeguro = isSuperAdmin ? filtroOrganismo : adminProfile?.organismo_responsable;

  const municipiosUnicos = useMemo(() => Array.from(new Set(usuarios.map(u => u.municipio))).filter(Boolean).sort(), [usuarios]);
  const organismosUnicos = useMemo(() => Array.from(new Set(usuarios.map(u => u.organismo_responsable))).filter(Boolean).sort(), [usuarios]);

  const centrosProcesados = useMemo(() => {
    return centros.map(c => {
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
        
        coord_centro_votacion: reporte?.coord_centro_votacion || 'No registrado',
        presidenta_centro: reporte?.presidenta_centro || 'No registrado',
        presidenta_mesa: reporte?.presidenta_mesa || 'No registrado',
        secretaria: reporte?.secretaria || 'No registrado',
        entrega_cotillon: reporte?.entrega_cotillon || 'PENDIENTE',
        toma_centro: reporte?.toma_centro || 'PENDIENTE',
        instalacion_mesas: reporte?.instalacion_mesas || 'PENDIENTE',
        apertura: reporte?.apertura || 'PENDIENTE',
        cierre_mesas: reporte?.cierre_mesas || 'PENDIENTE',
        resena: reporte?.resena || 'Sin reseña.',
        observaciones: reporte?.observaciones || 'Sin observaciones.',
        fecha_reporte: reporte?.fecha_reporte ? new Date(reporte.fecha_reporte).toLocaleString('es-VE') : 'Sin reporte'
      };
    }).filter(c => {
      const matchMuni = !filtroMunicipio || c.municipio === filtroMunicipio;
      const matchOrganismo = !organismoSeguro || c.organismo === organismoSeguro;
      const matchCotillon = !filtroCotillon || c.entrega_cotillon === filtroCotillon;
      return matchMuni && matchOrganismo && matchCotillon;
    });
  }, [centros, mapaJefes, mapaReportes, filtroMunicipio, organismoSeguro, filtroCotillon]);

  const stats = useMemo(() => {
    const total = centrosProcesados.length;
    const recibidos = centrosProcesados.filter(c => c.entrega_cotillon === 'RECIBIDO').length;
    const pendientes = total - recibidos;
    return { total, recibidos, pendientes };
  }, [centrosProcesados]);

  const generarPDF = () => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.text('Reporte General - Operativo Concejo Popular 2026', 14, 20);
    doc.setFontSize(10);
    doc.text(`Organismo: ${organismoSeguro || 'TODOS'} | Municipio: ${filtroMunicipio || 'TODOS'}`, 14, 28);
    const tableColumn = ["CNE", "Centro de Votación", "Municipio", "Custodia", "Cotillón", "Apertura"];
    const tableRows = centrosProcesados.map(c => [c.COD_CENTRO, c['NOMBRE CENTRO'], `${c.municipio} (${c.parroquia})`, c.organismo, c.entrega_cotillon, c.apertura]);
    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 40 });
    doc.save('Reporte_Electoral.pdf');
  };

  if (loading) return <div className="p-8 text-center font-bold animate-pulse text-[#00529b]">Cargando Sala...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-6 space-y-4">
      <div className="flex justify-between items-center">
        <Link href="/admin" className="flex items-center gap-1.5 text-gray-500 hover:text-[#00529b] font-bold text-xs uppercase bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200">
          <ArrowLeft size={16} /> Volver
        </Link>
        <button onClick={generarPDF} className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 uppercase">
          <Download size={16} /> PDF
        </button>
      </div>

      <div className="bg-gradient-to-r from-[#00529b] to-blue-900 p-6 rounded-3xl text-white shadow-md">
        <h1 className="text-2xl font-black uppercase"><BarChart3 className="inline mr-2" /> Sala Situacional: Consulta Popular 2026</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border rounded-2xl p-4 shadow-sm"><div><p className="text-[10px] font-bold text-gray-400 uppercase">Centros</p><p className="text-2xl font-black">{stats.total}</p></div></div>
        <div className="bg-white border rounded-2xl p-4 shadow-sm"><div><p className="text-[10px] font-bold text-gray-400 uppercase">Recibido</p><p className="text-2xl font-black text-emerald-600">{stats.recibidos}</p></div></div>
        <div className="bg-white border rounded-2xl p-4 shadow-sm"><div><p className="text-[10px] font-bold text-gray-400 uppercase">Pendiente</p><p className="text-2xl font-black text-red-600">{stats.pendientes}</p></div></div>
      </div>

      <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-wrap gap-4">
        <div className="flex flex-col"><label className="text-[10px] font-bold text-gray-400 mb-1 uppercase">Municipio</label><select value={filtroMunicipio} onChange={e => setFiltroMunicipio(e.target.value)} className="p-2 border rounded-lg bg-white text-xs font-bold"><option value="">Todos</option>{municipiosUnicos.map((m, i) => <option key={i} value={m}>{m}</option>)}</select></div>
        {isSuperAdmin && <div className="flex flex-col"><label className="text-[10px] font-bold text-gray-400 mb-1 uppercase">Organismo</label><select value={filtroOrganismo} onChange={e => setFiltroOrganismo(e.target.value)} className="p-2 border rounded-lg bg-white text-xs font-bold"><option value="">Todos</option>{organismosUnicos.map((o, i) => <option key={i} value={o}>{o}</option>)}</select></div>}
        <div className="flex flex-col"><label className="text-[10px] font-bold text-gray-400 mb-1 uppercase">Cotillón</label><select value={filtroCotillon} onChange={e => setFiltroCotillon(e.target.value)} className="p-2 border rounded-lg bg-white text-xs font-bold"><option value="">Todos</option><option value="PENDIENTE">PENDIENTE</option><option value="RECIBIDO">RECIBIDO</option></select></div>
      </div>

      <div className="bg-white rounded-2xl border shadow-inner overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 border-b"><tr><th className="p-3">CNE</th><th className="p-3">Centro</th><th className="p-3">Custodia</th><th className="p-3 text-center">Auditoría</th></tr></thead>
          <tbody className="divide-y">{centrosProcesados.map((c, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="p-3 font-mono">{c.COD_CENTRO}</td>
              <td className="p-3 font-bold uppercase">{c['NOMBRE CENTRO']}</td>
              <td className="p-3 text-[#00529b] font-bold">{c.organismo}</td>
              <td className="p-3 text-center"><button onClick={() => setCentroSeleccionado(c)} className="bg-gray-100 p-2 rounded-lg font-bold"><Eye size={14} /></button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {centroSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4">
             <div className="flex justify-between items-center"><h2 className="text-lg font-black">Detalle: {centroSeleccionado['NOMBRE CENTRO']}</h2><button onClick={() => setCentroSeleccionado(null)}><X /></button></div>
             <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-gray-50 p-3 rounded"><strong>Coord:</strong> {centroSeleccionado.coord_centro_votacion}</div>
                <div className="bg-gray-50 p-3 rounded"><strong>Pdte. Centro:</strong> {centroSeleccionado.presidenta_centro}</div>
                <div className="bg-gray-50 p-3 rounded"><strong>Apertura:</strong> {centroSeleccionado.apertura}</div>
                <div className="bg-gray-50 p-3 rounded"><strong>Cierre:</strong> {centroSeleccionado.cierre_mesas}</div>
                <div className="col-span-2 bg-amber-50 p-3 rounded"><strong>Reseña:</strong> {centroSeleccionado.resena}</div>
             </div>
             <button onClick={() => setCentroSeleccionado(null)} className="w-full bg-gray-800 text-white p-3 rounded-xl font-bold">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}