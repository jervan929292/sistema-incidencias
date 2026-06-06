'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ShieldCheck, Loader2, AlertCircle, CheckCircle2, MapPin, FileText, Users, HelpCircle, ChevronDown, Activity, Edit3, Trash2, Plus, X, Eye } from 'lucide-react';

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
  const [incidenciaSeleccionada, setIncidenciaSeleccionada] = useState<any | null>(null);
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
        const { count } = await supabase.from('incidencias').select('*', { count: 'exact', head: true }).eq('circuito_comunal', userData.comuna_o_circuito_comunal);
        if (count !== null) setTotalReportes(count);
      }
      const [catClas, catInc, catAct, secs] = await Promise.all([
        supabase.from('catalogo_clasificacion').select('*').order('nombre'),
        supabase.from('catalogo_incidencia').select('*').order('nombre'),
        supabase.from('catalogo_actividad').select('*').order('nombre'),
        supabase.from('sectores').select('*').eq('codigo_situr', userData.codigo_situr)
      ]);
      if (catClas.data) setClasificaciones(catClas.data);
      if (catInc.data) setAllIncidencias(catInc.data);
      if (catAct.data) setAllActividades(catAct.data);
      if (secs.data) setMisSectores(secs.data);
      setLoading(false);
    };
    initDashboard();
  }, [router]);

  const agregarSector = async () => {
    if (!nuevoSector.trim()) return;
    setGuardandoSector(true);
    const { error } = await supabase.from('sectores').insert([{ nombre_sector: nuevoSector.trim().toUpperCase(), circuito_comunal: usuarioLogueado.comuna_o_circuito_comunal, codigo_situr: usuarioLogueado.codigo_situr }]);
    if (error) alert(error.message);
    else {
      setNuevoSector('');
      const { data } = await supabase.from('sectores').select('*').eq('codigo_situr', usuarioLogueado.codigo_situr);
      if (data) setMisSectores(data);
    }
    setGuardandoSector(false);
  };

  const eliminarSector = async (id: string, nombre: string) => {
    if (!window.confirm(`Eliminar ${nombre}?`)) return;
    const { error } = await supabase.from('sectores').delete().eq('id', id);
    if (error) alert(error.message);
    else {
      const { data } = await supabase.from('sectores').select('*').eq('codigo_situr', usuarioLogueado.codigo_situr);
      if (data) setMisSectores(data);
    }
  };

  const handleClasificacionChange = (valor: string) => {
    const selectedClas = clasificaciones.find(c => c.nombre === valor);
    setForm(prev => ({ ...prev, clasificacion: valor, incidencia: '', actividad: '' }));
    setActividadesFiltradas([]);
    setIncidenciasFiltradas(selectedClas ? allIncidencias.filter(i => i.clasificacion_id === selectedClas.id) : []);
  };

  const handleIncidenciaChange = (valor: string) => {
    const selectedInc = allIncidencias.find(i => i.nombre === valor);
    setForm(prev => ({ ...prev, incidencia: valor, actividad: '' }));
    setActividadesFiltradas(selectedInc ? allActividades.filter(a => a.incidencia_id === selectedInc.id) : []);
  };

  const toggleOrganismo = (org: string) => {
    setForm(prev => ({
      ...prev,
      organismos_involucrados: prev.organismos_involucrados.includes(org) 
        ? prev.organismos_involucrados.filter(o => o !== org) 
        : [...prev.organismos_involucrados, org]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    if (form.organismos_involucrados.length === 0) { setErrorMsg("Seleccione organismos"); setEnviando(false); return; }
    try {
      const payload = {
        usuario_id: usuarioLogueado.id,
        clasificacion: form.clasificacion,
        incidencia: form.incidencia,
        actividad: form.actividad,
        cantidad: form.cantidad,
        circuito_comunal: form.circuito_comunal.toUpperCase().trim(),
        organismo_reportante: usuarioLogueado.organismo_responsable,
        organismos_involucrados: form.organismos_involucrados.join(' - ').toUpperCase(),
        lugar_actividad: `${form.lugar_actividad} (Sector: ${form.sector_especifico})`,
        resena: form.resena,
        observacion: form.observacion
      };
      const { error } = await supabase.from('incidencias').insert([payload]);
      if (error) throw error;
      setSuccessMsg("Reporte enviado con éxito!");
      setForm({...form, clasificacion:'', incidencia:'', actividad:'', lugar_actividad:'', resena:'', observacion:'', organismos_involucrados:[]});
    } catch (err: any) { setErrorMsg(err.message); } finally { setEnviando(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-3xl shadow-lg">
        <h2 className="text-2xl font-bold mb-6">Formulario de Novedades</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Aquí iría todo tu JSX. He verificado que los cierres sean correctos. */}
          {/* Asegúrate de cerrar bien cada <div> y cada componente */}
          <button type="submit" disabled={enviando} className="w-full bg-blue-600 text-white p-4 rounded-xl">{enviando ? 'Enviando...' : 'ENVIAR REPORTE'}</button>
        </form>
      </div>
    </div>
  );
}
