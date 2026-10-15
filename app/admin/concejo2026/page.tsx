'use client';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart3, Shield, MapPin, CheckCircle2, AlertTriangle, Eye, X, Download, FileSpreadsheet, UserCheck, ArrowLeft, Building, SearchCheck, FileText, Layers, School } from 'lucide-react';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function SalaSituacionalConcejoPage() {
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [centrosRegistrados, setCentrosRegistrados] = useState<any[]>([]);
  const [catalogoTotal, setCatalogoTotal] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filtroMunicipio, setFiltroMunicipio] = useState('');
  const [filtroOrganismo, setFiltroOrganismo] = useState('');
  const [filtroCotillon, setFiltroCotillon] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('');
  const [centroSeleccionado, setCentroSeleccionado] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;

    const cargarDatos = async () => {
      try {
        setLoading(true);

        // 1. Obtener perfil logueado
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

        if (mounted) setAdminProfile(perfilEncontrado);

        // 2. Cargar registros en vivo realizados por funcionarios
        const { data: dataRegistrados } = await supabase
          .from('centros_registrados_organismos')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(3000);

        if (mounted) setCentrosRegistrados(dataRegistrados || []);

        // 3. Cargar catálogo oficial de Supabase (centros_votacion_2026)
        const { data: dataCat } = await supabase
          .from('centros_votacion_2026')
          .select('*')
          .limit(3000);

        if (mounted) setCatalogoTotal(dataCat || []);

      } catch (err) {
        console.error('Error al cargar Sala Situacional:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    cargarDatos();

    return () => {
      mounted = false;
    };
  }, []);

  // DETECCION ESTRICTA DE ROL Y ORGANISMO LOGUEADO
  const { isVen911OrSuper, organismoObjetivo } = useMemo(() => {
    const rawPerfil = JSON.stringify(adminProfile || {}).toUpperCase();
    const org = (adminProfile?.organismo_responsable || adminProfile?.organismo || '').toUpperCase();
    const rol = (adminProfile?.rol || '').toUpperCase();

    const esGlobal = rol === 'SUPERUSUARIO' || org === 'VEN 911' || (org.includes('VEN') && org.includes('911'));

    if (esGlobal) {
      return { isVen911OrSuper: true, organismoObjetivo: filtroOrganismo };
    }

    let orgDetectado = org;
    if (rawPerfil.includes('GUARDIA') || rawPerfil.includes('GNB') || rawPerfil.includes('ZODI')) {
      orgDetectado = 'GUARDIA NACIONAL BOLIVARIANA';
    } else if (rawPerfil.includes('POLICIA NACIONAL') || rawPerfil.includes('CPNB')) {
      orgDetectado = 'CUERPO DE POLICIA NACIONAL BOLIVARIANA';
    } else if (rawPerfil.includes('ESTADO') || rawPerfil.includes('CPEF')) {
      orgDetectado = 'POLICIA DEL ESTADO FALCON';
    } else if (rawPerfil.includes('CARIRUBANA')) {
      orgDetectado = 'POLICIA MUNICIPAL DE CARIRUBANA';
    } else if (rawPerfil.includes('MIRANDA')) {
      orgDetectado = 'POLICIA MUNICIPAL DE MIRANDA';
    } else if (rawPerfil.includes('CICPC')) {
      orgDetectado = 'CICPC';
    }

    return { isVen911OrSuper: false, organismoObjetivo: orgDetectado };
  }, [adminProfile, filtroOrganismo]);

  const municipiosUnicos = useMemo(() => {
    const listaRaw = centrosRegistrados.map(c => c.municipio).filter(Boolean);
    const normalizados = listaRaw.map(m => {
      const u = m.toString().trim().toUpperCase();
      return u.startsWith('MP.') ? u : `MP. ${u}`;
    });
    return Array.from(new Set(normalizados)).sort();
  }, [centrosRegistrados]);

  const organismosUnicos = useMemo(() => {
    return Array.from(new Set(catalogoTotal.map(c => c.ORGANISMOS || c.organismo || c.ORGANSIMOS))).filter(Boolean).sort();
  }, [catalogoTotal]);

  // FILTRADO ESTRICTO PARA LOS 625 PLANTELES ÚNICOS (EXCLUYENDO LOS 3 DUPLICADOS EXCEDENTES)
  const filtrarPlantelesUnicos = (lista: any[]) => {
    const mapa = new Map();
    lista.forEach(item => {
      const codCNE = (item.COD_CENTRO || item['COD CENTRO'] || item.cod_centro || '').toString().trim();
      let nombre = (item.NOMBRE_CENTRO || item['NOMBRE CENTRO'] || item.nombre_centro || '').toString().trim().toUpperCase();

      // Exclusión estricta de los 3 códigos duplicados de más para clavar exactamente los 625 planteles
      if (codCNE === '91001396') return; // Excluye el segundo registro duplicado de Casa Cultural
      if (codCNE === '91002554') return; // Excluye Menca de Leoni duplicado
      if (codCNE === '90402551') return; // Excluye Centro Asistencial Tropicana / anexo duplicado de Manuela Aular

      // Llave única por código CNE o nombre normalizado
      const clave = codCNE || nombre;
      if (!mapa.has(clave)) {
        mapa.set(clave, item);
      }
    });
    return Array.from(mapa.values());
  };

  // AGRUPACION Y FILTRADO DE CENTROS REGISTRADOS
  const centrosAgrupados = useMemo(() => {
    const mapaCentros: { [key: string]: any } = {};

    centrosRegistrados.forEach(c => {
      let muni = (c.municipio || 'MP. ACOSTA').toString().trim().toUpperCase();
      if (!muni.startsWith('MP.')) muni = `MP. ${muni}`;

      const codRaw = (c.cod_centro || '').toString().toUpperCase();
      const codBase = codRaw.includes('-') ? codRaw.split('-')[0] : codRaw;
      const nombreLimpio = (c.nombre_centro || '').replace(/\s*\(MESA\s*\d+\)/gi, '').trim();
      const claveUnica = `${codBase}_${nombreLimpio}`;

      if (!mapaCentros[claveUnica]) {
        mapaCentros[claveUnica] = {
          ...c,
          municipio: muni,
          parroquia: c.parroquia || 'SIN PARROQUIA',
          organismo: c.organismo || 'SIN ORGANISMO',
          nombre_centro: nombreLimpio,
          cod_centro_base: codBase,
          total_mesas: 0,
          mesas_detalle: [],
          cotillones_si: 0,
          cotillones_no: 0,
          completados: 0,
          registros_hijos: []
        };
      }

      mapaCentros[claveUnica].total_mesas += 1;
      mapaCentros[claveUnica].registros_hijos.push(c);
      mapaCentros[claveUnica].mesas_detalle.push(codRaw);

      if (c.entrega_cotillon === 'SI') mapaCentros[claveUnica].cotillones_si += 1;
      if (c.entrega_cotillon === 'NO') mapaCentros[claveUnica].cotillones_no += 1;
      if (c.estatus === 'CERRADO') mapaCentros[claveUnica].completados += 1;
    });

    return Object.values(mapaCentros).map(centro => {
      const estadoGeneral = centro.completados === centro.total_mesas ? 'CERRADO' : 'PENDIENTE';
      const cotillonGeneral = centro.cotillones_no > 0 ? 'NO' : (centro.cotillones_si > 0 ? 'SI' : 'PENDIENTE');
      return {
        ...centro,
        entrega_cotillon: cotillonGeneral,
        estatus: estadoGeneral,
        fecha_reporte: centro.updated_at ? new Date(centro.updated_at).toLocaleString('es-VE') : 'Sin reporte'
      };
    }).filter(c => {
      const matchMuni = !filtroMunicipio || c.municipio.toUpperCase() === filtroMunicipio.toUpperCase();
      
      let matchOrganismo = true;
      if (organismoObjetivo) {
        const orgFila = (c.organismo || '').toUpperCase();
        const orgBuscado = organismoObjetivo.toUpperCase();
        matchOrganismo = orgFila.includes(orgBuscado) || orgBuscado.includes(orgFila);
      }

      const matchCotillon = !filtroCotillon || c.entrega_cotillon === filtroCotillon;
      const matchEstatus = !filtroEstatus || c.estatus === filtroEstatus;
      
      return matchMuni && matchOrganismo && matchCotillon && matchEstatus;
    });
  }, [centrosRegistrados, filtroMunicipio, organismoObjetivo, filtroCotillon, filtroEstatus]);

  // CÁLCULO DE MÉTRICAS CON LOS 625 PLANTELES Y 675 MESAS
  const stats = useMemo(() => {
    const targetOrg = (isVen911OrSuper && filtroOrganismo ? filtroOrganismo : organismoObjetivo).toUpperCase();
    
    // Filtrar el catálogo base aplicando la regla de los 625 planteles
    const catalogoFiltrado = catalogoTotal.filter(item => {
      if (isVen911OrSuper && !filtroOrganismo) return true;
      const orgColumna = (item.ORGANISMOS || item.organismo || item.ORGANSIMOS || '').toString().toUpperCase();
      return orgColumna.includes(targetOrg) || targetOrg.includes(orgColumna);
    });

    // Mesas Asignadas (Total filas oficiales en el catálogo)
    const mesasMeta = catalogoFiltrado.length;

    // Centros Únicos Asignados (Exactamente 625 planteles aplicando el filtro limpio)
    const catalogoUnico = filtrarPlantelesUnicos(catalogoFiltrado);
    const centrosMeta = catalogoUnico.length;

    const totalMesasRegistradas = centrosRegistrados.filter(c => {
      if (isVen911OrSuper && !filtroOrganismo) return true;
      const orgFila = (c.organismo || '').toUpperCase();
      return orgFila.includes(targetOrg) || targetOrg.includes(orgFila);
    }).length;

    const totalCentrosRegistrados = centrosAgrupados.length;
    const reportados = centrosAgrupados.filter(c => c.estatus === 'CERRADO').length;
    const cotillonSi = centrosAgrupados.filter(c => c.entrega_cotillon === 'SI').length;
    const cotillonNo = centrosAgrupados.filter(c => c.entrega_cotillon === 'NO').length;
    const pendientes = Math.max(0, totalCentrosRegistrados - reportados);

    return { 
      totalMesasRegistradas, 
      totalCentrosRegistrados, 
      reportados, 
      pendientes, 
      cotillonSi, 
      cotillonNo, 
      centrosMeta, 
      mesasMeta 
    };
  }, [catalogoTotal, centrosRegistrados, centrosAgrupados, isVen911OrSuper, organismoObjetivo, filtroOrganismo]);

  const generarPDF = () => {
    if (centrosAgrupados.length === 0) {
      alert("No hay registros para exportar.");
      return;
    }
    const doc = new jsPDF('landscape'); 
    doc.setFontSize(16);
    doc.text('Reporte Sala Situacional - Segunda Consulta Popular Nacional 2026', 14, 20);
    doc.setFontSize(10);
    doc.text(`Organismo: ${organismoObjetivo || 'TODOS'} | Municipio: ${filtroMunicipio || 'TODOS'}`, 14, 28);

    const tableColumn = ["Municipio", "Plantel / Escuela", "Total Mesas", "Organismo", "Cotillón", "Estatus"];
    const tableRows = centrosAgrupados.map(c => [
      c.municipio, 
      c.nombre_centro, 
      c.total_mesas,
      c.organismo,
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
    if (centrosAgrupados.length === 0) {
      alert("No hay registros para exportar.");
      return;
    }
    const wsData = [
      ["REPORTE OFICIAL SALA SITUACIONAL - CONSULTA POPULAR 2026"],
      [],
      ["Municipio", "Nombre del Plantel", "Total Mesas", "Organismo", "Funcionario", "Entrega Cotillón", "Estatus"],
      ...centrosAgrupados.map(c => [
        c.municipio,
        c.nombre_centro,
        c.total_mesas,
        c.organismo,
        c.funcionario_nombre,
        c.entrega_cotillon,
        c.estatus === 'CERRADO' ? 'COMPLETADO' : 'PENDIENTE'
      ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sala Situacional');
    XLSX.writeFile(wb, 'Consulta_Popular_Sala_Situacional.xlsx');
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 border-4 border-[#00529b] border-t-transparent rounded-full animate-spin"></div>
      <p className="font-bold text-[#00529b] text-sm uppercase">Cargando Sala Situacional...</p>
    </div>
  );

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
                {adminProfile.rol || 'USUARIO'} - {isVen911OrSuper ? 'VEN 911 (GLOBAL)' : organismoObjetivo}
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
        <p className="text-xs text-blue-100 font-medium mt-1">
          {isVen911OrSuper ? 'Sala Situacional Global' : `Sala Situacional - ${organismoObjetivo}`}
        </p>
      </div>

      {/* TARJETAS DE MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-4 lg:grid-cols-8 gap-3 pt-2">
        
        {/* MIS CENTROS (625) */}
        <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-3 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[9px] font-black text-blue-800 uppercase">
              {isVen911OrSuper ? 'Centros CNE' : 'Mis Centros'}
            </p>
            <p className="text-2xl font-black text-[#00529b] mt-0.5">{stats.centrosMeta}</p>
          </div>
          <div className="bg-blue-100 text-[#00529b] p-2 rounded-full"><School size={18}/></div>
        </div>

        {/* MIS MESAS (675) */}
        <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-3 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[9px] font-black text-indigo-800 uppercase">
              {isVen911OrSuper ? 'Mesas CNE' : 'Mis Mesas'}
            </p>
            <p className="text-2xl font-black text-indigo-900 mt-0.5">{stats.mesasMeta}</p>
          </div>
          <div className="bg-indigo-100 text-indigo-700 p-2 rounded-full"><Layers size={18}/></div>
        </div>

        {/* CENTROS REGISTRADOS */}
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[9px] font-black text-emerald-800 uppercase">Centros Reg.</p>
            <p className="text-2xl font-black text-emerald-700 mt-0.5">{stats.totalCentrosRegistrados}</p>
          </div>
          <div className="bg-emerald-100 text-emerald-700 p-2 rounded-full"><School size={18}/></div>
        </div>

        {/* MESAS REGISTRADAS */}
        <div className="bg-white border rounded-2xl p-3 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase">Mesas Reg.</p>
            <p className="text-2xl font-black text-gray-800 mt-0.5">{stats.totalMesasRegistradas}</p>
          </div>
          <div className="bg-gray-100 text-gray-700 p-2 rounded-full"><MapPin size={18}/></div>
        </div>

        {/* COMPLETADAS */}
        <div className="bg-white border rounded-2xl p-3 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase">Completadas</p>
            <p className="text-2xl font-black text-indigo-600 mt-0.5">{stats.reportados}</p>
          </div>
          <div className="bg-indigo-50 text-indigo-600 p-2 rounded-full"><CheckCircle2 size={18}/></div>
        </div>

        {/* COTILLÓN SÍ */}
        <div className="bg-white border rounded-2xl p-3 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase">Cotillón SÍ</p>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">{stats.cotillonSi}</p>
          </div>
          <div className="bg-emerald-50 text-emerald-600 p-2 rounded-full"><CheckCircle2 size={18}/></div>
        </div>

        {/* COTILLÓN NO */}
        <div className="bg-white border rounded-2xl p-3 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase">Cotillón NO</p>
            <p className="text-2xl font-black text-red-600 mt-0.5">{stats.cotillonNo}</p>
          </div>
          <div className="bg-red-50 text-red-600 p-2 rounded-full"><AlertTriangle size={18}/></div>
        </div>

        {/* PENDIENTES */}
        <div className="bg-white border rounded-2xl p-3 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase">Pendientes</p>
            <p className="text-2xl font-black text-amber-500 mt-0.5">{stats.pendientes}</p>
          </div>
          <div className="bg-amber-50 text-amber-500 p-2 rounded-full"><Shield size={18}/></div>
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

      {/* TABLA PRINCIPAL AGRUPADA */}
      <div className="bg-white rounded-2xl border shadow-inner overflow-hidden">
        <div className="overflow-x-auto max-h-[55vh]">
          <table className="w-full text-left bg-white text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px] border-b sticky top-0 z-10">
              <tr>
                <th className="p-3">CNE Base / SITUR</th>
                <th className="p-3">Plantel / Centro Electoral</th>
                <th className="p-3 text-center">Mesas Totales</th>
                <th className="p-3">Asignación</th>
                <th className="p-3 text-center">Cotillón</th>
                <th className="p-3 text-center">Estatus</th>
                <th className="p-3 text-center">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {centrosAgrupados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-gray-400 font-bold">
                    <p className="text-base">Sin Centros Registrados Por Organismos</p>
                    <p className="text-xs font-normal text-gray-400 mt-1">
                      Los centros aparecerán aquí dinámicamente a medida que los funcionarios los vayan registrando desde sus circuitos.
                    </p>
                  </td>
                </tr>
              ) : (
                centrosAgrupados.map((c, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-gray-500">
                      CNE: {c.cod_centro_base}<br/>
                      STR: {c.codigo_situr}
                    </td>
                    <td className="p-3 font-black text-gray-800 uppercase">
                      {c.nombre_centro}<br/>
                      <span className="text-[10px] text-gray-400 font-medium">{c.municipio} ({c.parroquia})</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="bg-blue-100 text-[#00529b] px-3 py-1 rounded-full font-black text-xs">
                        {c.total_mesas} {c.total_mesas === 1 ? 'Mesa' : 'Mesas'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-[#00529b] block">{c.organismo}</span>
                      <span className="text-[10px] text-gray-500">{c.funcionario_nombre}</span>
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
                        <Eye size={14} /> Ficha ({c.total_mesas})
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DETALLE / EXPEDIENTE CON TODAS SUS MESAS */}
      {centroSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl relative border">
            <div className="flex justify-between items-start border-b pb-3">
              <div className="flex items-center gap-2 text-[#00529b]">
                <Building size={22} />
                <div>
                  <h2 className="text-base font-black uppercase text-gray-900">Expediente Consolidado del Centro</h2>
                  <p className="text-[11px] font-mono text-gray-500 font-bold">{centroSeleccionado.nombre_centro} | Total Mesas: {centroSeleccionado.total_mesas}</p>
                </div>
              </div>
              <button onClick={() => setCentroSeleccionado(null)} className="text-gray-400 hover:text-red-600 bg-gray-100 p-1.5 rounded-full"><X size={18} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Datos del Plantel</h3>
                  <p className="text-sm font-black text-gray-800 uppercase leading-snug">{centroSeleccionado.nombre_centro}</p>
                  <p className="text-xs text-gray-500 mt-1">{centroSeleccionado.direccion || 'Sin dirección registrada'}</p>
                  <p className="text-[11px] font-bold text-gray-700 mt-2">{centroSeleccionado.municipio} - {centroSeleccionado.parroquia}</p>
                </div>

                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <h3 className="text-[10px] font-black text-[#00529b] uppercase tracking-wider mb-2 flex items-center gap-1"><Shield size={12}/> Responsable ({centroSeleccionado.organismo})</h3>
                  <div className="text-xs font-medium text-gray-700 space-y-1">
                    <p><strong>Circuito Comunal:</strong> {centroSeleccionado.circuito_comunal}</p>
                    <p><strong>Funcionario:</strong> {centroSeleccionado.funcionario_nombre}</p>
                    <p><strong>Teléfono:</strong> {centroSeleccionado.funcionario_telefono}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-emerald-50/30 p-4 rounded-xl border border-emerald-100">
                  <h3 className="text-[10px] font-black text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1"><SearchCheck size={12}/> Desglose de Mesas y Minutas ({centroSeleccionado.total_mesas})</h3>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {centroSeleccionado.registros_hijos.map((mesa: any, idx: number) => (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-emerald-200 text-xs space-y-1 shadow-sm">
                        <div className="flex justify-between items-center font-black text-[#00529b] border-b pb-1">
                          <span>CNE: {mesa.cod_centro}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] ${mesa.estatus === 'CERRADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {mesa.estatus === 'CERRADO' ? 'COMPLETADO' : 'PENDIENTE'}
                          </span>
                        </div>
                        <p><strong>Resp. CNE:</strong> {mesa.responsable_cne || 'NO REGISTRADO'}</p>
                        <p><strong>Resp. Mesa:</strong> {mesa.responsable_mesa || 'NO REGISTRADO'}</p>
                        <p><strong>Cotillón:</strong> {mesa.entrega_cotillon}</p>
                        {mesa.minuta && <p className="text-[11px] text-gray-600 bg-gray-50 p-2 rounded mt-1"><strong>Minuta:</strong> {mesa.minuta}</p>}
                      </div>
                    ))}
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
