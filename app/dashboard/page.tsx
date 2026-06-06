'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ShieldCheck, Loader2, AlertCircle, CheckCircle2, MapPin, FileText, Users, HelpCircle, ChevronDown, Activity, Edit3, Trash2, Plus } from 'lucide-react';

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
  const [totalReportes, setTotalReportes] = useState(0);

  const [clasificaciones, setClasificaciones] = useState<any[]>([]);
  const [allIncidencias, setAllIncidencias] = useState<any[]>([]);
  const [allActividades, setAllActividades] = useState<any[]>([]);
  const [misSectores, setMisSectores] = useState<any[]>([]);

  const [mostrarModalSectores, setMostrarModalSectores] = useState(false);
  const [nuevoSector, setNuevoSector] = useState('');
  const [guardandoSector, setGuardandoSector] = useState(false);

  const [incidenciasFiltradas, setIncidenciasFiltradas] = useState<any[]>([]);
  const [actividadesFiltradas, setActividadesFiltradas] = useState<any[]>([]);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: userData } = await supabase.from('directorio_operativo').select('*').eq('id', user.id).single();
      if (!userData) { router.push('/login'); return; }
      
      setUsuarioLogueado(userData);
      setForm(prev => ({ ...prev, circuito_comunal: userData.comuna_o_circuito_comunal || '' }));

      if (userData.comuna_o_circuito_comunal) {
        const { count } = await supabase
          .from('incidencias')
          .select('*', { count: 'exact', head: true })
          .eq('circuito_comunal', userData.comuna_o_circuito_comunal);
        
        if (count !== null) setTotalReportes(count);
      }

      const { data: catClas } = await supabase.from('catalogo_clasificacion').select('*').order('nombre', { ascending: true });
      const { data: catInc } = await supabase.from('catalogo_incidencia').select('*').order('nombre', { ascending: true });
      const { data: catAct } = await supabase.from('catalogo_actividad').select('*').order('nombre', { ascending: true });
      const { data: secs } = await supabase.from('sectores').select('*').eq('codigo_situr', userData.codigo_situr);

      if (catClas) setClasificaciones(catClas);
      if (catInc) setAllIncidencias(catInc);
      if (catAct) setAllActividades(catAct);
      if (secs) setMisSectores(secs);

      setLoading(false);
    };

    initDashboard();
  }, [router]);

  const agregarSector = async () => {
    if (!nuevoSector.trim()) return;
    setGuardandoSector(true);
    try {
      const payload = {
        nombre_sector: nuevoSector.trim().toUpperCase(),
        circuito_comunal: usuarioLogueado.comuna_o_circuito_comunal,
        codigo_situr: usuarioLogueado.codigo_situr
      };
      const { error } = await supabase.from('sectores').insert([payload]);
      if (error) throw error;
      
      setNuevoSector('');
      const { data: secs } = await supabase.from('sectores').select('*').eq('codigo_situr', usuarioLogueado.codigo_situr);
      if (secs) setMisSectores(secs);
    } catch (err: any) {
      alert("Error al agregar sector: " + err.message);
    } finally {
      setGuardandoSector(false);
    }
  };

  const eliminarSector = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar el sector "${nombre}"?`)) return;
    try {
      const { error } = await supabase.from('sectores').delete().eq('id', id);
      if (error) throw error;
      const { data: secs } = await supabase.from('sectores').select('*').eq('codigo_situr', usuarioLogueado.codigo_situr);
      if (secs) {
        setMisSectores(secs);
        if (form.sector_especifico === nombre) setForm(prev => ({ ...prev, sector_especifico: '' }));
      }
    } catch (err: any) {
      alert("Error al eliminar sector: " + err.message);
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (reporteEspecial && !form.observacion.trim()) {
      setErrorMsg("Justifique el 'Reporte Especial' en observaciones.");
      setEnviando(false);
      return;
    }

    if (form.organismos_involucrados.length === 0) {
      setErrorMsg("Seleccione al menos un organismo involucrado.");
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
        cantidad: form.cantidad,
        circuito_comunal: form.circuito_comunal.toUpperCase().trim(),
        
        // Aquí aplicamos tu lógica solicitada:
        organismo_reportante: usuarioLogueado.organismo_responsable, 
        organismos_involucrados: organismosTexto,
        
        lugar_actividad: lugarCompleto,
        resena: form.resena,
        observacion: form.observacion
      };

      const { error } = await supabase.from('incidencias').insert([payload]);
      if (error) throw error;

      setSuccessMsg("¡Reporte enviado con éxito!");
      if (!reporteEspecial) setTotalReportes(prev => prev + 1);
      
      setForm({
        clasificacion: '', incidencia: '', actividad: '', cantidad: 1,
        circuito_comunal: usuarioLogueado.comuna_o_circuito_comunal || '',
        sector_especifico: '', organismos_involucrados: [],
        lugar_actividad: '', resena: '', observacion: ''
      });
      setReporteEspecial(false);
    } catch (error: any) {
      setErrorMsg("Fallo al guardar: " + error.message);
    } finally {
      setEnviando(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5]"><p className="text-xl font-bold text-gray-700 animate-pulse">Cargando...</p></div>;

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <div className="max-w-screen-xl mx-auto p-6">
        {/* Cabecera y resto del UI (se mantiene igual) */}
        {/* ... */}
        {/* [Insertar aquí el resto del JSX que tenías originalmente del return hasta el final] */}
        {/* Nota: He omitido el JSX largo para que la respuesta sea limpia, pero es exactamente el mismo que me pasaste */}
      </div>
    </div>
  );
}
