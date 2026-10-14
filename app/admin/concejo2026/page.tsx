'use client';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart3, Shield, MapPin, CheckCircle2, AlertTriangle, Eye, X, Download, FileSpreadsheet, UserCheck, ArrowLeft, Building, SearchCheck, FileText } from 'lucide-react';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function SalaSituacionalConcejoPage() {
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [centrosRegistrados, setCentrosRegistrados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filtroMunicipio, setFiltroMunicipio] = useState('');
  const [filtroOrganismo, setFiltroOrganismo] = useState('');
  const [filtroCotillon, setFiltroCotillon] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('');
  const [centroSeleccionado, setCentroSeleccionado] = useState<any | null>(null);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);

        let correoLogueado = '';
        const sessionData = localStorage.getItem('user_session');
        if (sessionData) {
          try {
            const parsed = JSON.parse(sessionData);
            if (parsed?.email) correoLogueado = parsed.email;
          } catch (e) {}
        }

        let perfilEncontrado = null;
        if (correoLogueado) {
          const { data: adminByEmail } = await supabase
            .from('directorio_operativo')
            .select('*')
            .ilike('email', correoLogueado)
            .maybeSingle();

          if (adminByEmail) perfilEncontrado = adminByEmail;
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

        let todosLosRegistros: any[] = [];
        let limite = 1000;
        let inicio = 0;
        let hayMas = true;

        while (hayMas) {
          const { data: batch } = await supabase
            .from('centros_registrados_organismos')
            .select('*')
            .order('created_at', { ascending: false })
            .range(inicio, inicio + limite - 1);

          if (batch && batch.length > 0) {
            todosLosRegistros = [...todosLosRegistros, ...batch];
            inicio += limite;
            if (batch.length < limite) hayMas = false;
          } else {
            hayMas = false;
          }
        }

        setCentrosRegistrados(todosLosRegistros);

      } catch (err) {
        console.error('Error al cargar Sala Situacional:', err);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  const orgUser = (adminProfile?.organismo_responsable || adminProfile?.organismo || '').toUpperCase();
  const rolUser = (adminProfile?.rol || '').toUpperCase();
  
  const isVen911OrSuper = rolUser === 'SUPERUSUARIO' || 
                         orgUser.includes('VEN 911') || 
                         orgUser.includes('VEN-911') ||
                         orgUser === 'VEN 911';

  const organismoSeguro = isVen911OrSuper 
    ? filtroOrganismo 
    : (adminProfile?.organismo_responsable || adminProfile?.organismo || '');

  const municipiosUnicos = useMemo(() => {
    const listaRaw = centrosRegistrados.map(c => c.municipio).filter(Boolean);
    const normalizados = listaRaw.map(m => {
      const u = m.toString().trim().toUpperCase();
      return u.startsWith('MP.') ? u : `MP. ${u}`;
    });
    return Array.from(new Set(normalizados)).sort();
  }, [centrosRegistrados]);

  const organismosUnicos = useMemo(() => {
    return Array.from(new Set(centrosRegistrados.map(c => c.organismo))).filter(Boolean).sort();
  }, [centrosRegistrados]);

  const centrosProcesados = useMemo(() => {
    return centrosRegistrados.map(c => {
      let muni = (c.municipio || 'MP. ACOSTA').toString().trim().toUpperCase();
      if (!muni.startsWith('MP.')) muni = `MP. ${muni}`;

      return {
        ...c,
        municipio: muni,
        parroquia: c.parroquia || 'SIN PARROQUIA',
        organismo: c.organismo || 'SIN ORGANISMO',
        responsable_cne: c.responsable_cne || 'NO REGISTRADO',
        responsable_mesa: c.responsable_mesa || 'NO REGISTRADO',
        entrega_cotillon: c.entrega_cotillon || 'PENDIENTE',
        estatus: c.estatus || 'PENDIENTE',
        organismos_presentes: c.organismos_presentes || [],
        fecha_reporte: c.updated_at ? new Date(c.updated_at).toLocaleString('es-VE') : 'Sin reporte'
      };
    }).filter(c => {
      const matchMuni = !filtroMunicipio || c.municipio.toUpperCase() === filtroMunicipio.toUpperCase();
      const matchOrganismo = !organismoSeguro || c.organismo.toUpperCase().includes(organismoSeguro.toUpperCase());
      const matchCotillon = !filtroCotillon || c.entrega_cotillon === filtroCotillon;
      const matchEstatus = !filtroEstatus || c.estatus === filtroEstatus;
      
      return matchMuni && matchOrganismo && matchCotillon && matchEstatus;
    });
  }, [centrosRegistrados, filtroMunicipio, organismoSeguro, filtroCotillon, filtroEstatus]);

  const stats = useMemo(() => {
    const total = centrosProcesados.length;
    const reportados = centrosProcesados.filter(c => c.estatus === 'CERRADO').length;
    const cotillonSi = centrosProcesados.filter(c => c.entrega_cotillon === 'SI').length;
    const cotillonNo = centrosProcesados.filter(c => c.entrega_cotillon === 'NO').length;
    const pendientes = Math.max(0, total - reportados);
    return { total, reportados, pendientes, cotillonSi, cotillonNo };
  }, [centrosProcesados]);

  const generarPDF = () => {
    if (centrosProcesados.length === 0) {
      alert("No hay registros para exportar.");
      return;
    }
    const doc = new jsPDF('landscape'); 
    doc.setFontSize(16);
    doc.text('Reporte Sala Situacional - Segunda Consulta Popular Nacional 2026', 14, 20);
    doc.setFontSize(10);
    doc.text(`Organismo: ${organismoSeguro || 'TODOS'} | Municipio: ${filtroMunicipio || 'TODOS'}`, 14, 28);

    const tableColumn = ["Municipio", "Plantel / Escuela", "Organismo", "Resp. CNE", "Resp. Mesa", "Cotillón", "Estatus"];
    const tableRows = centrosProcesados.map(c => [
      c.municipio, 
      c.nombre_centro, 
      c.organismo,
      c.responsable_cne, 
      c.responsable_mesa, 
      c.entrega_cotillon,
      c.estatus === 'CERRADO' ? 'COMPLETADO' : 'PENDIENTE'
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [0, 82, 155] }
    });
    doc.save('Consulta_Popular_Sala_Situacional.pdf');
  };

  const generarExcel = () => {
    if (centrosProcesados.length === 0) {
      alert("No hay registros para exportar.");
      return;
    }
    const wsData = [
      ["REPORTE OFICIAL SALA SITUACIONAL - CONSULTA POPULAR 2026"],
      [],
      ["Municipio", "Nombre del Plantel", "Organismo", "Funcionario", "Responsable CNE", "Responsable Mesa", "Entrega Cotillón", "Motivo No Cotillón", "Organismos Presentes", "Minuta"],
      ...centrosProcesados.map(c => [
        c.municipio,
        c.nombre_centro,
        c.organismo,
        c.funcionario_nombre,
        c.responsable_cne,
        c.responsable_mesa,
        c.entrega_cotillon,
        c.motivo_no_cotillon || 'N/A',
        (c.organismos_presentes || []).join(', '),
        c.minuta || ''
      ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sala Situacional');
    XLSX.writeFile(wb, 'Consulta_Popular_Sala_Situacional.xlsx');
  };

  if (loading) return <div className="p-8 text-center font-bold animate-pulse text-[#00529b]">Cargando Sala Situacional...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-6 space-y-4">
      {/* CABECERA */}
      <div className="bg-white p-4 rounded-2xl border shadow-sm flex justify-between items-center flex-wrap gap-4">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-[#00529b] font-bold text-xs uppercase bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-200 transition-colors">
          <ArrowLeft size={16} /> Volver a Inicio
        </Link>

        {adminProfile && (
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 px-4 py-2 rounded-2xl">
            <div className="p-2 bg-blue-100 text-[#00529b] rounded-full">
              <UserCheck size={18} />
            </div>
            <div>
              <p className="text-xs font-black text-gray-900 uppercase">
                {adminProfile.nombre_apellido_jefe || adminProfile.nombre || 'ADMINISTRADOR'} 
              </p>
              <p className="text-[10px] text-gray-500 font-bold uppercase">
                {adminProfile.rol || 'USUARIO'} - {adminProfile.organismo_responsable || adminProfile.organismo || 'ORGANISMO'}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <button onClick={generarExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm uppercase">
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button onClick={generarPDF} className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm uppercase">
            <Download size={16} /> PDF
          </button>
        </div>
      </div>

      {/* TÍTULO */}
      <div className="bg-gradient-to-r from-[#00529b] to-blue-900 p-6 rounded-3xl text-white shadow-md">
        <h1 className="text-2xl font-black uppercase tracking-wide flex items-center gap-2"><BarChart3 /> Segunda Consulta Popular Nacional 2026</h1>
        <p className="text-xs text-blue-100 font-medium mt-1">Sala Situacional de Centros Registrados por Organismos</p>
      </div>

      {/* TARJETAS DE MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 pt-2">
        <div className="bg-white border rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div><p className="text-[10px] font-bold text-gray-400 uppercase">Centros Registrados</p><p className="text-2xl font-black text-gray-800 mt-1">{stats.total}</p></div>
          <div className="bg-blue-50 text-[#00529b] p-3 rounded-full"><MapPin size={24}/></div>
        </div>
        <div className="bg-white border rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div><p className="text-[10px] font-bold text-gray-400 uppercase">Completados</p><p className="text-2xl font-black text-indigo-600 mt-1">{stats.reportados}</p></div>
          <div className="bg-indigo-50 text-indigo-600 p-3 rounded-full"><CheckCircle2 size={24}/></div>
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
          <div className="bg-amber-50 text-amber-500 p-3 rounded-full"><Shield size={24}/></div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex flex-col">
          <label className="text-[10px] font-bold text-gray-400 mb-1 uppercase">Municipio</label>
          <select value={filtroMunicipio} onChange={e => setFiltroMunicipio(e.target.value)} className="p-2 border rounded-lg bg-white text-xs font-bold text-gray-700 outline-none">
            <option value="">Todos los Municipios</option>
            {municipiosUnicos.map((m, i) => <option key={i} value={m}>{m}</option>)}
          </select>
        </div>

        {isVen911OrSuper && (
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 mb-1 uppercase">Organismo</label>
            <select value={filtroOrganismo} onChange={e => setFiltroOrganismo(e.target.value)} className="p-2 border rounded-lg bg-white text-xs font-bold text-gray-700 outline-none">
              <option value="">Todos los Organismos</option>
              {organismosUnicos.map((o, i) => <option key={i} value={o}>{o}</option>)}
            </select>
          </div>
        )}

        <div className="flex flex-col">
          <label className="text-[10px] font-bold text-gray-400 mb-1 uppercase">Entrega Cotillón</label>
          <select value={filtroCotillon} onChange={e => setFiltroCotillon(e.target.value)} className="p-2 border rounded-lg bg-white text-xs font-bold text-gray-700 outline-none">
            <option value="">Todos</option>
            <option value="SI">SÍ</option>
            <option value="NO">NO</option>
            <option value="PENDIENTE">PENDIENTE</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-[10px] font-bold text-gray-400 mb-1 uppercase">Estatus General</label>
          <select value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)} className="p-2 border rounded-lg bg-white text-xs font-bold text-gray-700 outline-none">
            <option value="">Todas</option>
            <option value="CERRADO">COMPLETADA</option>
            <option value="PENDIENTE">PENDIENTE</option>
          </select>
        </div>
      </div>

      {/* TABLA PRINCIPAL */}
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
                <th className="p-3 text-center">Estatus</th>
                <th className="p-3 text-center">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {centrosProcesados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-gray-400 font-bold">
                    <p className="text-base">Sin Centros Registrados Por Organismos</p>
                    <p className="text-xs font-normal text-gray-400 mt-1">Los centros aparecerán aquí dinámicamente a medida que los funcionarios los vayan registrando desde sus circuitos.</p>
                  </td>
                </tr>
              ) : (
                centrosProcesados.map((c, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-gray-500">
                      CNE: {c.cod_centro}<br/>
                      STR: {c.codigo_situr}
                    </td>
                    <td className="p-3 font-black text-gray-800 uppercase">
                      {c.nombre_centro}<br/>
                      <span className="text-[10px] text-gray-400 font-medium">{c.municipio} ({c.parroquia})</span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-[#00529b] block">{c.organismo}</span>
                      <span className="text-[10px] text-gray-500">{c.funcionario_nombre}</span>
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
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${c.estatus === 'CERRADO' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>
                        {c.estatus === 'CERRADO' ? 'COMPLETADO' : 'PENDIENTE'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => setCentroSeleccionado(c)} className="bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-[#00529b] p-2 rounded-xl border font-bold text-[10px] uppercase flex items-center gap-1 mx-auto">
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
                  <p className="text-[11px] font-mono text-gray-500 font-bold">CNE: {centroSeleccionado.cod_centro} | Actualizado: {centroSeleccionado.fecha_reporte}</p>
                </div>
              </div>
              <button onClick={() => setCentroSeleccionado(null)} className="text-gray-400 hover:text-red-600 bg-gray-100 p-1.5 rounded-full"><X size={18} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Datos del Centro</h3>
                  <p className="text-sm font-black text-gray-800 uppercase leading-snug">{centroSeleccionado.nombre_centro}</p>
                  <p className="text-xs text-gray-500 mt-1">{centroSeleccionado.direccion || 'Sin dirección registrada'}</p>
                  <p className="text-[11px] font-bold text-gray-700 mt-2">{centroSeleccionado.municipio} - {centroSeleccionado.parroquia}</p>
                </div>

                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <h3 className="text-[10px] font-black text-[#00529b] uppercase tracking-wider mb-2 flex items-center gap-1"><Shield size={12}/> Responsable de Cuadrante ({centroSeleccionado.organismo})</h3>
                  <div className="text-xs font-medium text-gray-700 space-y-1">
                    <p><strong>Circuito Comunal:</strong> {centroSeleccionado.circuito_comunal}</p>
                    <p><strong>Funcionario:</strong> {centroSeleccionado.funcionario_nombre}</p>
                    <p><strong>Teléfono:</strong> {centroSeleccionado.funcionario_telefono}</p>
                  </div>
                </div>

                {/* NUEVA SECCIÓN DE ORGANISMOS PRESENTES EN EL EXPEDIENTE */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Building size={12} className="text-[#00529b]" /> Organismos Presentes en el Centro
                  </h3>
                  {centroSeleccionado.organismos_presentes && centroSeleccionado.organismos_presentes.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {centroSeleccionado.organismos_presentes.map((org: string, idx: number) => (
                        <span key={idx} className="bg-[#00529b] text-white font-black text-[10px] px-2.5 py-1 rounded-lg uppercase shadow-sm">
                          {org}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 font-medium italic">No se registraron organismos presentes.</p>
                  )}
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
