'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { SquarePen, Calendar, Search, FileSpreadsheet, FileText, Filter, ShieldAlert, Activity, ShieldCheck, Siren, Target, Award, TrendingUp, Settings, Plus, Trash2, Edit3, ChevronRight, UserPlus, UserMinus, User, Star, AlertCircle } from 'lucide-react'
import * as XLSX from 'xlsx';
import Link from 'next/link';

// LISTA DE ORGANISMOS PARA EL FORMULARIO MANUAL
const LISTA_ORGANISMOS = [
  "VEN 911",
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
  "Policía Estadal",
  "Policía Municipal Miranda",
  "Policía Municipal Carirubana",
  "Policía Nacional Bolivariana",
  "Protección Civil y Administración de Desastre",
  "Servicio Autónomo de Identificación, Migración y Extranjería",
  "Servicio Autónomo de Registros y Notarias",
  "Servicio Nacional para el Desarme",
  "Sistema Nacional de Medicina Forense",
  "Superintendencia Nacional Antidrogas",
  "Universidad Nacional Experimental de la Seguridad",
  "Otros"
];

// DICCIONARIO PARA OBTENER LAS SIGLAS DEL ORGANISMO
const getSiglas = (organismo: string) => {
  const mapa: { [key: string]: string } = {
    "VEN 911": "VEN 911",
    "Cuerpo de Investigaciones Científicas Penales y Criminalísticas": "CICPC",
    "Dirección de Atención Integral Penitenciaria": "DAIP",
    "Dirección General de Bomberos y Bomberas": "BOMBEROS",
    "Direccion General de Cuadrantes de Paz": "DGCP",
    "Dirección General de los Centros de Comando, Control y Telecomunicaciones": "CCCT VEN 911",
    "Dirección General de Prevención del Delito": "DPD",
    "Guardia Nacional bolivariana": "GNB",
    "Instituto Nacional Contra la Discriminación Racial": "INCODIR",
    "Instituto Nacional de Meteorología e Hidrología": "INAMEH",
    "Instituto Nacional de Transporte Terrestre": "INTT",
    "Oficina Nacional Contra la Delincuencia Organizada y Financiamiento al Terrorismo": "ONCDOFT",
    "Oficina Nacional para La Atención Integral de las Victimas": "ONAIV",
    "Policía Estadal": "POLIFALCÓN",
    "Policía Municipal Miranda": "POLIMIRANDA",
    "Policía Municipal Carirubana": "POLICARIRUBANA",
    "Policía Nacional Bolivariana": "CPNB",
    "Protección Civil y Administración de Desastre": "PC",
    "Servicio Autónomo de Identificación, Migración y Extranjería": "SAIME",
    "Servicio Autónomo de Registros y Notarias": "SAREN",
    "Servicio Nacional para el Desarme": "SENADES",
    "Sistema Nacional de Medicina Forense": "SENAMECF",
    "Superintendencia Nacional Antidrogas": "SUNAD",
    "Universidad Nacional Experimental de la Seguridad": "UNES"
  };
  return mapa[organismo] || organismo || 'SIN ORGANISMO';
};

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('directorio'); 
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [sectoresDB, setSectoresDB] = useState<any[]>([]); 
  const [loading, setLoading] = useState(false);
  const [verificando, setVerificando] = useState(true);
  
  // ESTADOS DE PROGRESO DE CARGA EXCEL
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Estados de Selección y Filtros (Directorio)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filtroMunicipio, setFiltroMunicipio] = useState('');
  const [filtroParroquia, setFiltroParroquia] = useState('');

  // Estados de Admin y Permisos
  const [adminUser, setAdminUser] = useState<any>(null);
  const [esSuperUser, setEsSuperUser] = useState(false);
  const [isReadOnlyVen911, setIsReadOnlyVen911] = useState(false); // NUEVO ESTADO: SOLO LECTURA
  
  const [mostrarModalAdmin, setMostrarModalAdmin] = useState(false);
  const [formAdmin, setFormAdmin] = useState({ 
    nombre_apellido_jefe: '', telefono_celular_jefe: '', cedula: '', grado_jerarquia: '', email: '', codigo_situr: '' 
  });
  
  // Estados para Administradores y Búsqueda
  const [listaAdmins, setListaAdmins] = useState<any[]>([]);
  const [mostrarModalEliminarAdmin, setMostrarModalEliminarAdmin] = useState(false);
  const [busquedaAdmin, setBusquedaAdmin] = useState('');

  // Estados Formularios
  const [mostrarFormualioManual, setMostrarFormularioManual] = useState(false);
  const [formManual, setFormManual] = useState({
    estado: 'FALCÓN', municipio: '', parroquia: '', cuadrante: '', telefono_cuadrante: '',
    organismo_responsable: '', grado_jerarquia: '', cedula: '', nombre_apellido_jefe: '',
    telefono_celular_jefe: '', codigo_situr: '', comuna_o_circuito_comunal: '', consejos_comunales: ''
  });
  const [sectoresInputs, setSectoresInputs] = useState<string[]>(['']);
  
  // Estados Edición
  const [editingUsuario, setEditingUsuario] = useState<any | null>(null);
  const [formEditar, setFormEditar] = useState({ ...formManual, id: '', rol: 'usuario', email: '' }); 
  const [sectoresInputsEditar, setSectoresInputsEditar] = useState<string[]>(['']);

  // ESTADOS PANEL DE INCIDENCIAS
  const [incidenciasDB, setIncidenciasDB] = useState<any[]>([]);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroIncidenciaMuni, setFiltroIncidenciaMuni] = useState('');
  const [filtroIncidenciaParro, setFiltroIncidenciaParro] = useState('');
  const [filtroIncidenciaClasificacion, setFiltroIncidenciaClasificacion] = useState('');
  const [filtroIncidenciaTipo, setFiltroIncidenciaTipo] = useState('');
  const [filtroIncidenciaOrganismo, setFiltroIncidenciaOrganismo] = useState('');

  // ESTADOS PANEL DE REPORTES Y ESTADÍSTICAS
  const [fechaRepDesde, setFechaRepDesde] = useState('');
  const [fechaRepHasta, setFechaRepHasta] = useState('');

  // ESTADOS NUEVOS: GESTIÓN DE CATÁLOGOS
  const [catClasificacion, setCatClasificacion] = useState<any[]>([]);
  const [catIncidencia, setCatIncidencia] = useState<any[]>([]);
  const [catActividad, setCatActividad] = useState<any[]>([]);

  const [selectedClasId, setSelectedClasId] = useState<string>('');
  const [selectedIncId, setSelectedIncId] = useState<string>('');

  const [newClasName, setNewClasName] = useState('');
  const [newIncName, setNewIncName] = useState('');
  const [newActName, setNewActName] = useState('');

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      
      const { data: adminData } = await supabase.from('directorio_operativo').select('*').eq('id', user.id).single();
      
      if (adminData?.rol === 'admin' || adminData?.rol === 'superusuario') {
        setAdminUser(adminData); 
        setEsSuperUser(adminData.rol === 'superusuario');
        setIsReadOnlyVen911(adminData.organismo_responsable === 'VEN 911' && adminData.rol !== 'superusuario'); // VERIFICAR SI ES VEN 911 DE SOLO LECTURA
        setVerificando(false);
        fetchDatos(adminData);
        if (adminData.rol === 'superusuario') {
          fetchAdmins();
        }
      } else {
        window.location.href = '/dashboard';
      }
    };
    checkAccess();
  }, []);

  const fetchAdmins = async () => {
    const { data } = await supabase.from('directorio_operativo').select('*').in('rol', ['admin', 'superusuario']);
    if (data) {
      const sortedData = data.sort((a, b) => {
        const aEmpty = !a.organismo_responsable ? 1 : 0;
        const bEmpty = !b.organismo_responsable ? 1 : 0;
        return bEmpty - aEmpty;
      });
      setListaAdmins(sortedData);
    }
  };

  const fetchDatos = async (currentUser: any) => {
    const isSuper = currentUser.rol === 'superusuario';
    const isReadVen911 = currentUser.organismo_responsable === 'VEN 911' && !isSuper;
    const veTodo = isSuper || isReadVen911; // Superusuarios y Ven911 ven toda la tabla

    if (!veTodo && (!currentUser.organismo_responsable || currentUser.organismo_responsable.trim() === '')) {
      setUsuarios([]);
      setSectoresDB([]);
      setIncidenciasDB([]);
      setCatClasificacion([]);
      setCatIncidencia([]);
      setCatActividad([]);
      return; 
    }
    
    const normalizeStr = (str: string) => (str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const adminOrg = normalizeStr(currentUser.organismo_responsable);
    
    const aliases = [adminOrg];
    if (adminOrg.includes('estadal')) aliases.push('estado', 'polifalcon');
    if (adminOrg.includes('bolivariana')) aliases.push('pnb', 'cpnb');
    if (adminOrg.includes('guardia nacional')) aliases.push('gnb');
    if (adminOrg.includes('bomberos')) aliases.push('bombero');
    if (adminOrg.includes('cientificas')) aliases.push('cicpc');
    if (adminOrg.includes('transporte terrestre')) aliases.push('intt');
    if (adminOrg.includes('proteccion civil')) aliases.push('pc');

    const { data: users, error: errU } = await supabase.from('directorio_operativo').select('*').neq('rol', 'admin').neq('rol', 'superusuario').limit(10000);
    if (errU) alert("Error cargando usuarios: " + errU.message);
    else if (users) {
      if (!veTodo && currentUser.organismo_responsable) {
        const filteredUsers = users.filter(u => {
          if (!u.organismo_responsable) return false;
          const uOrg = normalizeStr(u.organismo_responsable);
          return aliases.some(alias => uOrg.includes(alias) || alias.includes(uOrg));
        });
        setUsuarios(filteredUsers);
      } else {
        setUsuarios(users);
      }
    }

    let todosLosSectores: any[] = [];
    let limite = 1000;
    let inicio = 0;
    let hayMas = true;
    while (hayMas) {
      const { data: secs, error: errS } = await supabase.from('sectores').select('*').range(inicio, inicio + limite - 1);
      if (errS) { console.error("Error cargando sectores:", errS); hayMas = false; }
      else if (secs && secs.length > 0) {
        todosLosSectores = [...todosLosSectores, ...secs];
        inicio += limite;
        if (secs.length < limite) hayMas = false; 
      } else { hayMas = false; }
    }
    setSectoresDB(todosLosSectores);
    
    const { data: incs } = await supabase.from('incidencias').select('*').limit(50000);
    if (incs) {
      if (!veTodo && currentUser.organismo_responsable) {
        const filteredIncs = incs.filter(inc => {
          if (!inc.organismos_involucrados) return false;
          const incOrgs = normalizeStr(inc.organismos_involucrados);
          return aliases.some(alias => incOrgs.includes(alias));
        });
        setIncidenciasDB(filteredIncs);
      } else {
        setIncidenciasDB(incs);
      }
    }

    const { data: cClas } = await supabase.from('catalogo_clasificacion').select('*').order('nombre');
    if (cClas) setCatClasificacion(cClas);
    const { data: cInc } = await supabase.from('catalogo_incidencia').select('*').order('nombre');
    if (cInc) setCatIncidencia(cInc);
    const { data: cAct } = await supabase.from('catalogo_actividad').select('*').order('nombre');
    if (cAct) setCatActividad(cAct);
    
    setSelectedIds([]); 
  };

  const handleToggleSuperUser = async (idUsuario: string, nombreUsuario: string, rolActual: string) => {
    if (!esSuperUser) return;
    const nuevoRol = rolActual === 'superusuario' ? 'admin' : 'superusuario';
    const accion = rolActual === 'superusuario' ? 'quitarle' : 'otorgarle';
    
    if (!window.confirm(`¿Quiere ${accion} el rol de SUPER USUARIO a "${nombreUsuario}"?`)) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('directorio_operativo').update({ rol: nuevoRol }).eq('id', idUsuario);
      if (error) throw error;
      alert(`Privilegios actualizados correctamente.`);
      fetchAdmins();
    } catch (error: any) {
      alert("Error al actualizar rol: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarAdmin = async (idAEliminar: string, nombreAdmin: string) => {
    if (idAEliminar === adminUser?.id) {
      alert("No puedes eliminar tu propia cuenta mientras estás conectado.");
      return;
    }
    if (!window.confirm(`⚠️ ADVERTENCIA: ¿Estás completamente seguro de que deseas eliminar al administrador "${nombreAdmin}"?`)) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('directorio_operativo').delete().eq('id', idAEliminar);
      if (error) throw error;
      alert(`El administrador ${nombreAdmin} fue eliminado correctamente.`);
      fetchAdmins(); 
    } catch (error: any) {
      alert("Error al eliminar administrador: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const agregarCatalogo = async (tabla: string, payload: any, setterInput: Function) => {
    if(loading) return;
    setLoading(true);
    try {
      const { error } = await supabase.from(tabla).insert([payload]);
      if (error) throw error;
      setterInput('');
      await fetchDatos(adminUser);
    } catch (err: any) { alert("Error: " + err.message); } finally { setLoading(false); }
  };

  const editarCatalogo = async (tabla: string, id: string, nombreActual: string) => {
    const nuevoNombre = window.prompt(`Corregir nombre en la base de datos:`, nombreActual);
    if (!nuevoNombre || nuevoNombre.trim() === '' || nuevoNombre === nombreActual) return;
    setLoading(true);
    try {
      const { error } = await supabase.from(tabla).update({ nombre: nuevoNombre.trim() }).eq('id', id);
      if (error) throw error;
      await fetchDatos(adminUser);
    } catch (err: any) { alert("Error al editar: " + err.message); } finally { setLoading(false); }
  };

  const eliminarCatalogo = async (tabla: string, id: string) => {
    if (!window.confirm("⚠️ ADVERTENCIA: ¿Estás seguro de eliminar este elemento?")) return;
    setLoading(true);
    try {
      const { error } = await supabase.from(tabla).delete().eq('id', id);
      if (error) throw error;
      if (tabla === 'catalogo_clasificacion' && id === selectedClasId) { setSelectedClasId(''); setSelectedIncId(''); }
      if (tabla === 'catalogo_incidencia' && id === selectedIncId) { setSelectedIncId(''); }
      await fetchDatos(adminUser);
    } catch (err: any) { alert("Error al eliminar: " + err.message); } finally { setLoading(false); }
  };

  const handleDescargarCredenciales = () => {
    if (usuariosFiltrados.length === 0) { alert("No hay registros en la tabla para exportar."); return; }
    const dataCredenciales = usuariosFiltrados.map(u => ({
      'CÓDIGO SITUR (CLAVE)': u.codigo_situr || 'N/A',
      'CORREO ASIGNADO': u.email || 'N/A',
      'RANGO / JERARQUÍA': u.grado_jerarquia || 'N/A',
      'NOMBRES Y APELLIDOS': u.nombre_apellido_jefe || 'N/A',
      'CÉDULA': u.cedula || 'N/A',
      'TELÉFONO CELULAR': u.telefono_celular_jefe || 'N/A',
      'CIRCUITO COMUNAL': u.comuna_o_circuito_comunal || 'N/A',
      'MUNICIPIO': u.municipio || 'N/A',
      'PARROQUIA': u.parroquia || 'N/A',
      'ORGANISMO': u.organismo_responsable || 'N/A',
      'CUADRANTE ASOCIADO': u.cuadrante || 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(dataCredenciales);
    const wscols = [ { wch: 20 }, { wch: 30 }, { wch: 22 }, { wch: 35 }, { wch: 15 }, { wch: 18 }, { wch: 35 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 22 } ];
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Credenciales de Acceso');
    XLSX.writeFile(wb, 'BD_Credenciales_Jefes_Cuadrante.xlsx');
  };

  const municipiosUnicos = Array.from(new Set(usuarios.map(u => u.municipio))).filter(Boolean).sort();
  const parroquiasUnicas = Array.from(
    new Set(usuarios.filter(u => filtroMunicipio === '' || u.municipio === filtroMunicipio).map(u => u.parroquia))
  ).filter(Boolean).sort();

  const usuariosFiltrados = usuarios.filter(u => {
    const matchMunicipio = filtroMunicipio === '' || u.municipio === filtroMunicipio;
    const matchParroquia = filtroParroquia === '' || u.parroquia === filtroParroquia;
    return matchMunicipio && matchParroquia;
  });

  const parroquiasIncidenciaUnicas = Array.from(
    new Set(usuarios.filter(u => filtroIncidenciaMuni === '' || u.municipio === filtroIncidenciaMuni).map(u => u.parroquia))
  ).filter(Boolean).sort();

  const incidenciasTipoUnicas = Array.from(new Set(incidenciasDB.map(i => i.incidencia))).filter(Boolean).sort();
  const organismosUnicos = Array.from(new Set(incidenciasDB.map(i => i.organismos_involucrados))).filter(Boolean).sort();

  const incidenciasFiltradas = (incidenciasDB || []).filter(inc => {
    const incDate = inc.fecha_registro ? new Date(inc.fecha_registro).toISOString().split('T')[0] : '';
    if (fechaDesde && incDate && incDate < fechaDesde) return false;
    if (fechaHasta && incDate && incDate > fechaHasta) return false;

    const jefe = usuarios.find(u => u.comuna_o_circuito_comunal === inc.circuito_comunal);
    if (filtroIncidenciaMuni && jefe?.municipio !== filtroIncidenciaMuni) return false;
    if (filtroIncidenciaParro && jefe?.parroquia !== filtroIncidenciaParro) return false;

    if (filtroIncidenciaClasificacion && inc.clasificacion !== filtroIncidenciaClasificacion) return false;
    if (filtroIncidenciaTipo && inc.incidencia !== filtroIncidenciaTipo) return false;
    if (filtroIncidenciaOrganismo && !inc.organismos_involucrados?.includes(filtroIncidenciaOrganismo)) return false;

    return true;
  });

  const totalActividades = incidenciasFiltradas.reduce((sum, item) => sum + (Number(item.cantidad) || 0), 0);
  const totalPreventiva = incidenciasFiltradas.filter(i => i.clasificacion?.toUpperCase().includes('PREVENTIVA')).reduce((sum, item) => sum + (Number(item.cantidad) || 0), 0);
  const totalPatrullaje = incidenciasFiltradas.filter(i => i.clasificacion?.toUpperCase().includes('PATRULLAJE')).reduce((sum, item) => sum + (Number(item.cantidad) || 0), 0);
  const totalEfectividad = incidenciasFiltradas.filter(i => i.clasificacion?.toUpperCase().includes('OPERATIVIDAD') || i.clasificacion?.toUpperCase().includes('EFECTIVIDAD')).reduce((sum, item) => sum + (Number(item.cantidad) || 0), 0);

  const incidenciasReporte = (incidenciasDB || []).filter(inc => {
    const incDate = inc.fecha_registro ? new Date(inc.fecha_registro).toISOString().split('T')[0] : '';
    if (fechaRepDesde && incDate && incDate < fechaRepDesde) return false;
    if (fechaRepHasta && incDate && incDate > fechaRepHasta) return false;
    return true;
  });

  const repTotal = incidenciasReporte.reduce((sum, item) => sum + (Number(item.cantidad) || 0), 0);
  const repPreventiva = incidenciasReporte.filter(i => i.clasificacion?.toUpperCase().includes('PREVENTIVA')).reduce((sum, item) => sum + (Number(item.cantidad) || 0), 0);
  const repPatrullaje = incidenciasReporte.filter(i => i.clasificacion?.toUpperCase().includes('PATRULLAJE')).reduce((sum, item) => sum + (Number(item.cantidad) || 0), 0);
  const repEfectividad = incidenciasReporte.filter(i => i.clasificacion?.toUpperCase().includes('OPERATIVIDAD') || i.clasificacion?.toUpperCase().includes('EFECTIVIDAD')).reduce((sum, item) => sum + (Number(item.cantidad) || 0), 0);

  const pctPreventiva = repTotal > 0 ? Math.round((repPreventiva / repTotal) * 100) : 0;
  const pctPatrullaje = repTotal > 0 ? Math.round((repPatrullaje / repTotal) * 100) : 0;
  const pctEfectividad = repTotal > 0 ? Math.round((repEfectividad / repTotal) * 100) : 0;

  const conteoCircuitos: { [key: string]: number } = {};
  incidenciasReporte.forEach(inc => {
    if (inc.circuito_comunal) {
      conteoCircuitos[inc.circuito_comunal] = (conteoCircuitos[inc.circuito_comunal] || 0) + (Number(inc.cantidad) || 1);
    }
  });
  
  const topCircuitos = Object.entries(conteoCircuitos)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5) || [];
    
  const maxCircuitoValor = topCircuitos[0]?.[1] || 1;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(usuariosFiltrados.map(u => u.id));
    else setSelectedIds([]);
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(sid => sid !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm(`¿Estás súper seguro de que quieres eliminar a estos ${selectedIds.length} usuarios?`)) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('directorio_operativo').delete().in('id', selectedIds);
      if (error) throw error;
      alert(`Se eliminaron ${selectedIds.length} registros exitosamente.`);
      fetchDatos(adminUser);
    } catch (error: any) { alert("Error al eliminar: " + error.message); } finally { setLoading(false); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const guardarPerfilAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (formAdmin.email !== adminUser.email || formAdmin.codigo_situr !== adminUser.codigo_situr) {
        const { error: authError } = await supabase.auth.updateUser({
          email: formAdmin.email,
          password: formAdmin.codigo_situr
        });
        if (authError) throw new Error("Error actualizando credenciales: " + authError.message);
      }

      const { error = null } = await supabase.from('directorio_operativo')
        .update({ 
          nombre_apellido_jefe: formAdmin.nombre_apellido_jefe, 
          telefono_celular_jefe: formAdmin.telefono_celular_jefe,
          cedula: formAdmin.cedula,
          grado_jerarquia: formAdmin.grado_jerarquia,
          email: formAdmin.email,
          codigo_situr: formAdmin.codigo_situr
        })
        .eq('id', adminUser.id);
        
      if (error) throw error;

      alert("Tu perfil ha sido actualizado exitosamente.");
      setAdminUser({ ...adminUser, ...formAdmin });
      setMostrarModalAdmin(false);
    } catch (error: any) { alert("Error: " + error.message); } finally { setLoading(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setShowUploadModal(true);
    setUploadProgress(10);
    setUploadMessage('Leyendo archivo Excel...');
    
    try {
      const fileData = await new Promise<any>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (evt) => resolve(evt.target?.result);
        reader.onerror = () => reject(new Error("Error leyendo Excel"));
        reader.readAsBinaryString(file);
      });

      setUploadProgress(30);
      setUploadMessage('Analizando columnas y preparando datos...');

      const wb = XLSX.read(fileData, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { range: 1 }); 
      
      const getVal = (row: any, exactName: string) => {
        const key = Object.keys(row).find(k => k.trim().toUpperCase() === exactName.toUpperCase());
        return key ? row[key] : null;
      };

      const codigosExistentes = new Set(usuarios.map(u => u.codigo_situr?.toString().trim()));
      const sectoresExistentes = new Set(sectoresDB.map(s => `${s.nombre_sector.trim().toLowerCase()}|${s.codigo_situr?.toString().trim()}`));
      
      const directorioData: any[] = [];
      const sectoresData: any[] = [];
      let jefesOmitidos = 0;
      let sectoresOmitidos = 0;

      data.forEach((row: any) => {
        const circuito = getVal(row, 'COMUNA O CIRCUITO COMUNAL')?.toString().trim();
        const codigoSitur = getVal(row, 'CODIGO SITUR')?.toString().trim();
        
        if (!circuito || !codigoSitur) return;

        if (!codigosExistentes.has(codigoSitur)) {
          codigosExistentes.add(codigoSitur); 
          directorioData.push({
            estado: getVal(row, 'ESTADO')?.toString().trim() || 'FALCÓN',
            municipio: getVal(row, 'MUNICIPIO')?.toString().trim(),
            parroquia: getVal(row, 'PARROQUIA')?.toString().trim(),
            cuadrante: getVal(row, 'CUADRANTE')?.toString().trim(),
            telefono_cuadrante: getVal(row, 'NUMERO TELEFONICO CUADRANTE')?.toString().trim(),
            organismo_responsable: getVal(row, 'ORGANISMO RESPONSABLE')?.toString().trim(),
            grado_jerarquia: getVal(row, 'GRADO O JERARQUIA JEFE CUADRANTE')?.toString().trim(),
            cedula: getVal(row, 'CEDULA DE IDENTIDAD JEFE CUADRANTE')?.toString().trim(),
            consejos_comunales: getVal(row, 'CONSEJOS COMUNALES')?.toString().trim(),
            nombre_apellido_jefe: getVal(row, 'NOMBRES Y APELLIDOS JEFE CUADRANTE')?.toString().trim(),
            codigo_situr: codigoSitur,
            comuna_o_circuito_comunal: circuito,
            telefono_celular_jefe: getVal(row, 'TELEFONO CELULAR JEFE CUADRANTE')?.toString().trim(),
            rol: 'usuario',
            email: `${codigoSitur}@cupaz.com`.toLowerCase()
          });
        } else {
          jefesOmitidos++;
        }

        const sectoresString = getVal(row, 'SECTORES')?.toString();
        if (sectoresString) {
          sectoresString.split(/[,;\n|]+/).forEach((sector: string) => {
            const nombreLimpio = sector.replace(/["']/g, '').trim();
            if (!nombreLimpio) return; 

            const sectorKey = `${nombreLimpio.toLowerCase()}|${codigoSitur}`; 
            
            if (!sectoresExistentes.has(sectorKey)) {
              sectoresExistentes.add(sectorKey); 
              sectoresData.push({ 
                nombre_sector: nombreLimpio, 
                circuito_comunal: circuito,
                codigo_situr: codigoSitur 
              });
            } else {
              sectoresOmitidos++;
            }
          });
        }
      });

      const chunkArray = (arr: any[], size: number) =>
        Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

      if (directorioData.length > 0) {
        setUploadMessage(`Guardando ${directorioData.length} Jefes nuevos en la base de datos...`);
        const chunks = chunkArray(directorioData, 300); 
        for (let i = 0; i < chunks.length; i++) {
          const { error } = await supabase.from('directorio_operativo').insert(chunks[i]);
          if (error) throw new Error("Fallo al guardar Jefes: " + error.message);
          setUploadProgress(30 + ((i + 1) / chunks.length) * 30); 
        }
      } else {
        setUploadProgress(60);
      }

      if (sectoresData.length > 0) {
        setUploadMessage(`Inyectando ${sectoresData.length} Sectores faltantes...`);
        const chunks = chunkArray(sectoresData, 500);
        for (let i = 0; i < chunks.length; i++) {
          const { error } = await supabase.from('sectores').insert(chunks[i]);
          if (error) throw new Error("Fallo al guardar Sectores: " + error.message);
          setUploadProgress(60 + ((i + 1) / chunks.length) * 40); 
        }
      } else {
        setUploadProgress(100);
      }

      setUploadMessage('¡Finalizado con éxito!');
      setTimeout(() => {
        alert(
          `📊 REPORTE DE CARGA:\n\n` +
          `✅ Jefes nuevos agregados: ${directorioData.length}\n` +
          `⚠️ Jefes omitidos (Ya existían): ${jefesOmitidos}\n\n` +
          `✅ Sectores nuevos inyectados: ${sectoresData.length}\n` +
          `⚠️ Sectores omitidos (Ya existían en la DB): ${sectoresOmitidos}`
        );
        setShowUploadModal(false);
      }, 500);
      
      fetchDatos(adminUser);
    } catch (error: any) {
      alert("Error Crítico: " + error.message);
      setShowUploadModal(false);
    } finally {
      setLoading(false);
      e.target.value = ''; 
    }
  };

  const handleSectorInputChange = (index: number, value: string) => {
    const nuevasCeldas = [...sectoresInputs];
    nuevasCeldas[index] = value;
    if (index === nuevasCeldas.length - 1 && value.trim() !== '') nuevasCeldas.push('');
    setSectoresInputs(nuevasCeldas);
  };

  const handleSectorInputEditarChange = (index: number, value: string) => {
    const nuevasCeldas = [...sectoresInputsEditar];
    nuevasCeldas[index] = value;
    if (index === nuevasCeldas.length - 1 && value.trim() !== '') nuevasCeldas.push('');
    setSectoresInputsEditar(nuevasCeldas);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const circuitoComunal = formManual.comuna_o_circuito_comunal.trim();
      const codigoSitur = formManual.codigo_situr.trim();
      const correoGenerado = `${codigoSitur}@cupaz.com`.toLowerCase();

      const { error: errDir } = await supabase.from('directorio_operativo').insert([{
        ...formManual, comuna_o_circuito_comunal: circuitoComunal, codigo_situr: codigoSitur, email: correoGenerado, rol: 'usuario'
      }]);
      if (errDir) throw new Error("Error al crear usuario: " + errDir.message);

      const sectoresPayload = sectoresInputs
        .map(s => s.replace(/["']/g, '').trim())
        .filter(s => s !== '')
        .map(s => ({ nombre_sector: s, circuito_comunal: circuitoComunal, codigo_situr: codigoSitur }));
        
      if (sectoresPayload.length > 0) await supabase.from('sectores').insert(sectoresPayload);

      alert("Usuario registrado correctamente.");
      setMostrarFormularioManual(false);
      setFormManual({
        estado: 'FALCÓN', municipio: '', parroquia: '', cuadrante: '', telefono_cuadrante: '',
        organismo_responsable: '', grado_jerarquia: '', cedula: '', nombre_apellido_jefe: '',
        telefono_celular_jefe: '', codigo_situr: '', comuna_o_circuito_comunal: '', consejos_comunales: ''
      });
      setSectoresInputs(['']);
      fetchDatos(adminUser);
    } catch (error: any) { alert(error.message); } finally { setLoading(false); }
  };

  const abrirEditar = (u: any) => {
    setEditingUsuario(u);
    setFormEditar({
      id: u.id,
      rol: u.rol || 'usuario',
      estado: u.estado || '', municipio: u.municipio || '', parroquia: u.parroquia || '',
      cuadrante: u.cuadrante || '', telefono_cuadrante: u.telefono_cuadrante || '',
      organismo_responsable: u.organismo_responsable || '', grado_jerarquia: u.grado_jerarquia || '',
      cedula: u.cedula || '', nombre_apellido_jefe: u.nombre_apellido_jefe || '',
      telefono_celular_jefe: u.telefono_celular_jefe || '', codigo_situr: u.codigo_situr || '',
      comuna_o_circuito_comunal: u.comuna_o_circuito_comunal || '', consejos_comunales: u.consejos_comunales || '',
      email: u.email || ''
    });

    const deEsteUsuario = sectoresDB.filter(s => s.codigo_situr === u.codigo_situr).map(s => s.nombre_sector);
    setSectoresInputsEditar(deEsteUsuario.length > 0 ? [...deEsteUsuario, ''] : ['']);
    setMostrarModalEliminarAdmin(false); 
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const codigoSiturLimpio = formEditar.codigo_situr?.toString().trim();
      const circuitoLimpio = formEditar.comuna_o_circuito_comunal?.toString().trim();
      const codigoViejo = editingUsuario.codigo_situr?.toString(); 

      if (!codigoSiturLimpio) throw new Error("El Código SITUR es requerido.");

      const datosJefeLimpios = {
        ...formEditar,
        codigo_situr: codigoSiturLimpio,
        comuna_o_circuito_comunal: circuitoLimpio,
        email: formEditar.rol === 'admin' || formEditar.rol === 'superusuario' ? formEditar.email : `${codigoSiturLimpio}@cupaz.com`.toLowerCase()
      };

      const { error: errJefe } = await supabase.from('directorio_operativo')
        .update(datosJefeLimpios)
        .eq('id', editingUsuario.id);
        
      if (errJefe) throw errJefe;

      if (codigoViejo) {
        await supabase.from('sectores').delete().eq('codigo_situr', codigoViejo);
      }
      if (codigoViejo !== codigoSiturLimpio) {
        await supabase.from('sectores').delete().eq('codigo_situr', codigoSiturLimpio);
      }

      const sectoresPayload = sectoresInputsEditar
        .map(s => s.replace(/["']/g, '').trim())
        .filter(s => s !== '') 
        .map(s => ({ 
          nombre_sector: s, 
          circuito_comunal: circuitoLimpio,
          codigo_situr: codigoSiturLimpio 
        }));
        
      if (sectoresPayload.length > 0) {
        const { error: errSec } = await supabase.from('sectores').insert(sectoresPayload);
        if (errSec) throw new Error("Fallo al insertar los sectores: " + errSec.message);
      }

      alert("Ficha actualizada con éxito.");
      setEditingUsuario(null);
      await fetchDatos(adminUser); 
      if (formEditar.rol === 'admin' || formEditar.rol === 'superusuario') {
        fetchAdmins();
      }
      
    } catch (error: any) { 
      alert("Error: " + error.message); 
      console.error(error);
    } finally { 
      setLoading(false); 
    }
  };

  if (verificando) return <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5]"><p className="text-xl font-bold text-gray-700 animate-pulse">Verificando Credenciales de Seguridad...</p></div>;

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[999] backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border text-center">
            <h3 className="text-2xl font-bold text-[#00529b] mb-4">Procesando Base de Datos</h3>
            <p className="text-gray-600 mb-6 font-medium">{uploadMessage}</p>
            <div className="w-full bg-gray-200 rounded-full h-4 mb-2 overflow-hidden">
              <div className="bg-amber-500 h-4 rounded-full transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }}></div>
            </div>
            <p className="text-sm font-bold text-gray-500">{Math.round(uploadProgress)}%</p>
          </div>
        </div>
      )}

      <div className="max-w-screen-2xl mx-auto p-6">
        
        {/* CABECERA */}
        <div className="bg-white rounded-t-3xl shadow-sm p-6 mb-2 flex flex-col md:flex-row justify-between items-center gap-6 border-b-4 border-[#00529b]">
          <div className="flex gap-12 items-center justify-center">
            <img src="/logo1.png" alt="Logo 1" className="h-20 w-auto object-contain" />
            <img src="/logo2.png" alt="Logo 2" className="h-20 w-auto object-contain" />
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-4 bg-gray-50 p-3 rounded-2xl border">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full overflow-hidden bg-white border-2 flex items-center justify-center shrink-0 ${esSuperUser ? 'border-amber-500' : 'border-[#00529b]'}`}>
                {esSuperUser ? <Star size={20} className="text-amber-500" /> : <User size={24} className="text-[#00529b]" />}
              </div>
              <div className="text-left hidden sm:block pr-4 border-r border-gray-300">
                <p className="text-sm font-bold text-gray-800 flex items-center gap-2 uppercase">
                  {adminUser?.nombre_apellido_jefe || 'Administrador'}
                  {adminUser?.grado_jerarquia && (
                    <span className="text-[10px] font-black bg-gray-200 text-gray-600 px-2 py-0.5 rounded uppercase tracking-wider">
                      {adminUser.grado_jerarquia}
                    </span>
                  )}
                </p>
                <p className={`text-[11px] font-black uppercase tracking-wider mt-0.5 ${esSuperUser ? 'text-amber-600' : 'text-blue-600'}`}>
                  {esSuperUser ? 'SUPERUSUARIO - ' : ''} {getSiglas(adminUser?.organismo_responsable)}
                  {isReadOnlyVen911 && <span className="ml-1 text-gray-500">(Solo Lectura)</span>}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {!isReadOnlyVen911 && (
                <Link href="/registro-admin" title="Registrar Nuevo Administrador" className="bg-blue-100 text-[#00529b] p-2 rounded-xl text-sm font-bold hover:bg-blue-200 transition-all shadow-sm flex items-center gap-1">
                  <UserPlus size={18} />
                </Link>
              )}
              
              {esSuperUser && (
                <button 
                  onClick={() => setMostrarModalEliminarAdmin(true)} 
                  title="Gestionar Administradores" 
                  className="bg-red-50 text-red-600 p-2 rounded-xl text-sm font-bold hover:bg-red-100 transition-all shadow-sm flex items-center gap-1"
                >
                  <UserMinus size={18} />
                </button>
              )}

              <div className="w-px h-6 bg-gray-300 mx-1"></div>
              
              <button 
                onClick={() => { 
                  setFormAdmin({ 
                    nombre_apellido_jefe: adminUser.nombre_apellido_jefe || '', 
                    telefono_celular_jefe: adminUser.telefono_celular_jefe || '',
                    cedula: adminUser.cedula || '',
                    grado_jerarquia: adminUser.grado_jerarquia || '',
                    email: adminUser.email || '',
                    codigo_situr: adminUser.codigo_situr || ''
                  }); 
                  setMostrarModalAdmin(true); 
                }} 
                className="bg-white border text-gray-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-100 transition-all shadow-sm"
              >
                Editar Perfil
              </button>
              <button onClick={handleLogout} className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-100 hover:text-red-700 transition-all shadow-sm">Salir</button>
            </div>
          </div>
        </div>

        {/* NAVEGACIÓN EXTENDIDA CON 4 PESTAÑAS */}
        <div className="bg-white shadow-sm rounded-b-3xl mb-8 flex flex-wrap overflow-hidden">
          <button onClick={() => setActiveTab('directorio')} className={`flex-1 py-4 px-2 font-bold text-lg transition-all ${activeTab === 'directorio' ? 'bg-[#00529b] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Directorio Operativo</button>
          <button onClick={() => setActiveTab('incidencias')} className={`flex-1 py-4 px-2 font-bold text-lg transition-all ${activeTab === 'incidencias' ? 'bg-[#00529b] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Panel de Incidencias</button>
          <button onClick={() => setActiveTab('reportes')} className={`flex-1 py-4 px-2 font-bold text-lg transition-all ${activeTab === 'reportes' ? 'bg-[#00529b] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Reportes y Estadísticas</button>
          {esSuperUser && (
            <button onClick={() => setActiveTab('catalogos')} className={`flex-1 py-4 px-2 font-bold text-lg transition-all ${activeTab === 'catalogos' ? 'bg-[#00529b] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Gestión de Catálogos</button>
          )}
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="bg-white p-6 rounded-3xl shadow-xl w-full">
          
          {/* 1. DIRECTORIO */}
          {activeTab === 'directorio' && (
            <div className="animate-fade-in w-full">
              
              <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-gray-800">
                    Gestión de Usuarios {(esSuperUser || isReadOnlyVen911) ? '(Todos los Organismos)' : `(${adminUser?.organismo_responsable || 'SIN ORGANISMO ASIGNADO'})`}
                  </h2>
                  <span className="bg-blue-100 text-blue-800 text-sm font-bold px-3 py-1 rounded-full">{usuariosFiltrados?.length || 0} Mostrando</span>
                </div>
                
                <div className="flex flex-wrap gap-3 justify-end">
                  {selectedIds.length > 0 && !isReadOnlyVen911 && (
                    <button onClick={handleDeleteSelected} disabled={loading} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-red-700 transition-all">
                      {loading ? 'Eliminando...' : `🗑️ Eliminar (${selectedIds.length})`}
                    </button>
                  )}
                  <button onClick={handleDescargarCredenciales} className="bg-emerald-600 text-white px-5 py-3 rounded-xl font-bold shadow-md hover:bg-emerald-700 transition-all flex items-center gap-2">
                    <FileSpreadsheet size={18} /> DESCARGAR CREDENCIALES
                  </button>
                  
                  {!isReadOnlyVen911 && (
                    <button onClick={() => setMostrarFormularioManual(!mostrarFormualioManual)} className="bg-gray-800 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-gray-700 transition-all">
                      {mostrarFormualioManual ? '- CERRAR FORMULARIO' : '+ AGREGAR MANUAL'}
                    </button>
                  )}
                  
                  {esSuperUser && (
                    <label className="bg-[#00529b] text-white px-6 py-3 rounded-xl cursor-pointer hover:bg-[#003d73] transition-all font-bold shadow-md whitespace-nowrap">
                      {loading ? 'Procesando...' : '+ SUBIR EXCEL'}
                      <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
                    </label>
                  )}
                </div>
              </div>

              {/* BARRA DE FILTROS INTELIGENTES DIRECTORIO */}
              <div className="flex flex-wrap gap-4 mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-gray-500 mb-1">Filtrar por Municipio</label>
                  <select 
                    value={filtroMunicipio} 
                    onChange={(e) => { setFiltroMunicipio(e.target.value); setFiltroParroquia(''); }} 
                    className="p-2 border rounded-lg bg-white text-sm outline-none shadow-sm cursor-pointer"
                  >
                    <option value="">Todos los Municipios</option>
                    {municipiosUnicos.map((m, i) => <option key={i} value={m as string}>{m}</option>)}
                  </select>
                </div>
                
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-gray-500 mb-1">Filtrar por Parroquia</label>
                  <select 
                    value={filtroParroquia} 
                    onChange={(e) => setFiltroParroquia(e.target.value)}
                    disabled={!filtroMunicipio && parroquiasUnicas.length > 30} 
                    className="p-2 border rounded-lg bg-white text-sm outline-none shadow-sm cursor-pointer disabled:bg-gray-100"
                  >
                    <option value="">Todas las Parroquias</option>
                    {parroquiasUnicas.map((p, i) => <option key={i} value={p as string}>{p}</option>)}
                  </select>
                </div>
              </div>

              {/* FORMULARIO MANUAL */}
              {mostrarFormualioManual && !isReadOnlyVen911 && (
                <form onSubmit={handleManualSubmit} className="bg-gray-50 p-6 rounded-2xl border border-gray-200 mb-8 grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
                  <div className="col-span-full border-b pb-2 mb-2 flex justify-between items-end">
                    <span className="font-bold text-xl text-[#00529b]">Registro de Nuevo Jefe de Cuadrante</span>
                  </div>
                  <div className="col-span-full bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-200 text-sm mb-2 shadow-inner">
                    <span className="font-bold block mb-1">¡Importante - Credenciales Autogeneradas!</span>
                    Al guardar, el sistema creará automáticamente su <b>Correo Electrónico</b> y su <b>Clave de acceso</b> será el mismo <b>Código SITUR</b>.
                  </div>
                  
                  <div className="col-span-full">
                    <label className="block text-xs font-bold text-[#00529b] mb-1">Organismo Responsable</label>
                    {esSuperUser ? (
                      <select required className="w-full p-2 border rounded-lg bg-white font-bold" value={formManual.organismo_responsable} onChange={e => setFormManual({...formManual, organismo_responsable: e.target.value})}>
                        <option value="">Seleccione el Organismo...</option>
                        {LISTA_ORGANISMOS.map((org, i) => <option key={i} value={org}>{org}</option>)}
                      </select>
                    ) : (
                      <input required type="text" readOnly className="w-full p-2 border rounded-lg bg-gray-100 text-gray-600 font-bold" value={adminUser.organismo_responsable} />
                    )}
                  </div>

                  <div><label className="block text-xs font-bold text-gray-600 mb-1">Estado</label><input required type="text" className="w-full p-2 border rounded-lg bg-white" value={formManual.estado} onChange={e => setFormManual({...formManual, estado: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-gray-600 mb-1">Municipio</label><input required type="text" className="w-full p-2 border rounded-lg bg-white" value={formManual.municipio} onChange={e => setFormManual({...formManual, municipio: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-gray-600 mb-1">Parroquia</label><input required type="text" className="w-full p-2 border rounded-lg bg-white" value={formManual.parroquia} onChange={e => setFormManual({...formManual, parroquia: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-gray-600 mb-1">Nombres y Apellidos</label><input required type="text" className="w-full p-2 border rounded-lg bg-white" value={formManual.nombre_apellido_jefe} onChange={e => setFormManual({...formManual, nombre_apellido_jefe: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-gray-600 mb-1">Cédula</label><input required type="text" className="w-full p-2 border rounded-lg bg-white" value={formManual.cedula} onChange={e => setFormManual({...formManual, cedula: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-gray-600 mb-1">Teléfono Celular</label><input required type="text" className="w-full p-2 border rounded-lg bg-white" value={formManual.telefono_celular_jefe} onChange={e => setFormManual({...formManual, telefono_celular_jefe: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-gray-600 mb-1">Grado o Jerarquía</label><input required type="text" className="w-full p-2 border rounded-lg bg-white" value={formManual.grado_jerarquia} onChange={e => setFormManual({...formManual, grado_jerarquia: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-gray-600 mb-1">Cuadrante N°</label><input type="text" className="w-full p-2 border rounded-lg bg-white" value={formManual.cuadrante} onChange={e => setFormManual({...formManual, cuadrante: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-gray-600 mb-1">Teléfono Cuadrante</label><input type="text" className="w-full p-2 border rounded-lg bg-white" value={formManual.telefono_cuadrante} onChange={e => setFormManual({...formManual, telefono_cuadrante: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-[#00529b] mb-1">Código SITUR (CLAVE)</label><input required type="text" className="w-full p-2 border-2 border-[#00529b] rounded-lg bg-blue-50 font-bold" value={formManual.codigo_situr} onChange={e => setFormManual({...formManual, codigo_situr: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-gray-600 mb-1">Circuito Comunal</label><input required type="text" className="w-full p-2 border rounded-lg bg-white" value={formManual.comuna_o_circuito_comunal} onChange={e => setFormManual({...formManual, comuna_o_circuito_comunal: e.target.value})} /></div>
                  <div className="col-span-full"><label className="block text-xs font-bold text-gray-600 mb-1">Consejos Comunales</label><textarea className="w-full p-2 border rounded-lg bg-white" rows={2} value={formManual.consejos_comunales} onChange={e => setFormManual({...formManual, consejos_comunales: e.target.value})} /></div>
                  <div className="col-span-full border-t pt-4 mt-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Sectores pertenecientes a este Circuito</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      {sectoresInputs.map((sectorValue, index) => (
                        <div key={index} className="relative flex items-center">
                          <span className="absolute left-2 text-[10px] font-bold text-gray-400 bg-gray-100 px-1 rounded">#{index + 1}</span>
                          <input type="text" className="w-full p-2 pl-8 border rounded-lg bg-white text-xs" placeholder="Sector..." value={sectorValue} onChange={e => handleSectorInputChange(index, e.target.value)} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="col-span-full mt-4 bg-[#00529b] text-white p-4 rounded-xl font-bold hover:bg-[#003d73] transition-all">GUARDAR FICHA</button>
                </form>
              )}

              {/* TABLA DE USUARIOS FILTRADOS */}
              <div className="overflow-x-auto overflow-y-auto max-h-[65vh] rounded-xl border border-gray-200 w-full shadow-inner relative">
                <table className="w-full min-w-max text-left bg-white text-xs">
                  <thead className="text-gray-700 uppercase tracking-wider text-[10px]">
                    <tr>
                      {!isReadOnlyVen911 && <th className="p-2 sticky left-0 top-0 bg-gray-200 z-30 w-10 text-center">Sel</th>}
                      {!isReadOnlyVen911 && <th className="p-2 sticky left-10 top-0 bg-gray-200 z-30 w-12">Edit</th>}
                      <th className="p-2 sticky top-0 bg-gray-100 z-20 w-40">Ubicación</th>
                      <th className="p-2 sticky top-0 bg-amber-100 text-amber-800 z-20 w-24">SITUR</th>
                      <th className="p-2 sticky top-0 bg-gray-100 z-20 w-32">Circuito</th>
                      <th className="p-2 sticky top-0 bg-gray-100 z-20 w-28">Rango</th>
                      <th className="p-2 sticky top-0 bg-gray-100 z-20 w-48">Jefe</th>
                      <th className="p-2 sticky top-0 bg-gray-100 z-20 w-24">Cédula</th>
                      <th className="p-2 sticky top-0 bg-gray-100 z-20 w-28">Teléfono</th>
                      <th className="p-2 sticky top-0 bg-gray-100 z-20 w-32">Organismo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {usuariosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={isReadOnlyVen911 ? 8 : 10} className="p-8 text-center text-gray-400 font-bold">
                          {adminUser?.organismo_responsable ? 'No hay usuarios registrados para este organismo o filtros actuales.' : 'No tienes un organismo asignado para visualizar registros.'}
                        </td>
                      </tr>
                    ) : (
                      usuariosFiltrados.map((u) => {
                        return (
                          <tr key={u.id} className="hover:bg-gray-50">
                            {!isReadOnlyVen911 && <td className="p-2 text-center sticky left-0 bg-white z-10"><input type="checkbox" onChange={() => handleSelectOne(u.id)} /></td>}
                            {!isReadOnlyVen911 && <td className="p-2 sticky left-10 bg-white z-10"><button onClick={() => abrirEditar(u)} className="bg-amber-500 text-white px-2 py-1 rounded"><SquarePen size={14}/></button></td>}
                            <td className="p-2 truncate max-w-[160px]" title={`${u.estado} - ${u.municipio} - ${u.parroquia}`}>{u.municipio} - {u.parroquia}</td>
                            <td className="p-2 font-mono font-bold text-amber-700">{u.codigo_situr}</td>
                            <td className="p-2 truncate max-w-[130px]" title={u.comuna_o_circuito_comunal}>{u.comuna_o_circuito_comunal}</td>
                            <td className="p-2 truncate max-w-[110px] font-bold text-gray-600" title={u.grado_jerarquia}>{u.grado_jerarquia}</td>
                            <td className="p-2 truncate max-w-[190px]" title={u.nombre_apellido_jefe}>{u.nombre_apellido_jefe}</td>
                            <td className="p-2">{u.cedula}</td>
                            <td className="p-2 font-mono">{u.telefono_celular_jefe}</td>
                            <td className="p-2 truncate max-w-[130px]" title={u.organismo_responsable}>{u.organismo_responsable}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. PANEL DE INCIDENCIAS */}
          {activeTab === 'incidencias' && (
            <div className="animate-fade-in w-full space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-3 rounded-xl border border-blue-200">
                    <ShieldAlert className="text-[#00529b]" size={28}/>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Estadísticas e Incidencias</h2>
                    <p className="text-sm text-gray-500 font-medium">Panel de supervisión, estadísticas en vivo y descarga de reportes</p>
                  </div>
                </div>
              </div>

              {/* 4 TARJETAS ESTADÍSTICAS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                  <div className="bg-blue-50 p-3 rounded-full text-[#00529b]"><Activity size={28} /></div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Registradas</p>
                    <p className="text-2xl font-black text-gray-800 leading-none mt-1">{totalActividades}</p>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                  <div className="bg-blue-50 p-3 rounded-full text-blue-600"><ShieldCheck size={28} /></div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Preventiva</p>
                    <p className="text-2xl font-black text-gray-800 leading-none mt-1">{totalPreventiva}</p>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                  <div className="bg-amber-50 p-3 rounded-full text-amber-500"><Siren size={28} /></div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Patrullaje</p>
                    <p className="text-2xl font-black text-gray-800 leading-none mt-1">{totalPatrullaje}</p>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                  <div className="bg-emerald-50 p-3 rounded-full text-emerald-500"><Target size={28} /></div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Efectividad y Rend.</p>
                    <p className="text-2xl font-black text-gray-800 leading-none mt-1">{totalEfectividad}</p>
                  </div>
                </div>
              </div>

              {/* Barra de Filtros Completa */}
              <div className="bg-gray-50 p-5 rounded-2xl shadow-sm border border-gray-200">
                <div className="font-bold text-gray-700 flex items-center gap-2 mb-4 border-b border-gray-200 pb-3">
                  <Filter size={18} className="text-[#00529b]" /> 
                  Filtros de Búsqueda y Estadísticas
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-5">
                  <div className="lg:col-span-1">
                    <label className="block text-xs font-bold text-gray-500 mb-1">Desde</label>
                    <input type="date" className="w-full p-2 border rounded-lg bg-white text-sm outline-none shadow-sm cursor-text" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
                  </div>
                  <div className="lg:col-span-1">
                    <label className="block text-xs font-bold text-gray-500 mb-1">Hasta</label>
                    <input type="date" className="w-full p-2 border rounded-lg bg-white text-sm outline-none shadow-sm cursor-text" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
                  </div>
                  <div className="lg:col-span-1">
                    <label className="block text-xs font-bold text-gray-500 mb-1">Filtrar por Municipio</label>
                    <select className="w-full p-2 border rounded-lg bg-white text-sm outline-none shadow-sm cursor-pointer" value={filtroIncidenciaMuni} onChange={e => { setFiltroIncidenciaMuni(e.target.value); setFiltroIncidenciaParro(''); }}>
                      <option value="">Todos los Municipios</option>
                      {municipiosUnicos.map((m,i) => <option key={i} value={m as string}>{m}</option>)}
                    </select>
                  </div>
                  <div className="lg:col-span-1">
                    <label className="block text-xs font-bold text-gray-500 mb-1">Filtrar por Parroquias</label>
                    <select className="w-full p-2 border rounded-lg bg-white text-sm outline-none shadow-sm cursor-pointer disabled:bg-gray-100" value={filtroIncidenciaParro} onChange={e => setFiltroIncidenciaParro(e.target.value)} disabled={!filtroIncidenciaMuni}>
                      <option value="">Todas las Parroquias</option>
                      {parroquiasIncidenciaUnicas.map((p,i) => <option key={i} value={p as string}>{p}</option>)}
                    </select>
                  </div>
                  <div className="lg:col-span-1">
                    <label className="block text-xs font-bold text-gray-500 mb-1">Filtrar por Clasificación</label>
                    <select className="w-full p-2 border rounded-lg bg-white text-sm outline-none shadow-sm cursor-pointer" value={filtroIncidenciaClasificacion} onChange={e => setFiltroIncidenciaClasificacion(e.target.value)}>
                      <option value="">Todas</option>
                      <option value="PREVENTIVA">PREVENTIVA</option>
                      <option value="PATRULLAJE">PATRULLAJE</option>
                      <option value="OPERATIVIDAD Y RENDIMIENTO OPERATIVO">EFECTIVIDAD Y RENDIMIENTO OPERATIVO</option>
                    </select>
                  </div>
                  <div className="lg:col-span-1">
                    <label className="block text-xs font-bold text-gray-500 mb-1">Filtrar por Incidencia</label>
                    <select className="w-full p-2 border rounded-lg bg-white text-sm outline-none shadow-sm cursor-pointer" value={filtroIncidenciaTipo} onChange={e => setFiltroIncidenciaTipo(e.target.value)}>
                      <option value="">Todas</option>
                      {incidenciasTipoUnicas.map((t, i) => <option key={i} value={t as string}>{t}</option>)}
                    </select>
                  </div>
                  
                  {(esSuperUser || isReadOnlyVen911) && (
                    <div className="lg:col-span-1">
                      <label className="block text-xs font-bold text-gray-500 mb-1">Filtrar por Organismos</label>
                      <select className="w-full p-2 border rounded-lg bg-white text-sm outline-none shadow-sm cursor-pointer" value={filtroIncidenciaOrganismo} onChange={e => setFiltroIncidenciaOrganismo(e.target.value)}>
                        <option value="">Todos</option>
                        {organismosUnicos.map((o, i) => <option key={i} value={o as string}>{o}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="lg:col-span-2 flex items-end">
                    <button className="w-full bg-[#00529b] text-white px-4 py-2 h-[38px] rounded-lg font-bold shadow-sm hover:bg-[#003d73] transition-all flex items-center justify-center gap-2">
                      <Search size={16} /> Buscar Registros
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                  <button className="bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold shadow-sm hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"><FileSpreadsheet size={18} /> Generar Excel</button>
                  <button className="bg-red-500 text-white px-6 py-2 rounded-lg font-bold shadow-sm hover:bg-red-600 transition-all flex items-center justify-center gap-2"><FileText size={18} /> Generar PDF</button>
                </div>
              </div>

              {/* Tabla de Incidencias */}
              <div className="overflow-x-auto overflow-y-auto max-h-[50vh] rounded-xl border border-gray-200 w-full shadow-inner relative bg-white">
                <table className="w-full min-w-max text-left text-xs">
                  <thead className="text-gray-700 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3 sticky top-0 bg-gray-100 z-20 font-bold w-32 shadow-[0_1px_0_0_#e5e7eb]">Fecha / Hora</th>
                      <th className="p-3 sticky top-0 bg-amber-100 text-amber-800 z-20 font-bold shadow-[0_1px_0_0_#e5e7eb]">Circuito Comunal</th>
                      <th className="p-3 sticky top-0 bg-gray-100 z-20 font-bold shadow-[0_1px_0_0_#e5e7eb]">Municipio / Parr.</th>
                      <th className="p-3 sticky top-0 bg-gray-100 z-20 font-bold shadow-[0_1px_0_0_#e5e7eb]">Clasificación</th>
                      <th className="p-3 sticky top-0 bg-gray-100 z-20 font-bold shadow-[0_1px_0_0_#e5e7eb]">Incidencia</th>
                      <th className="p-3 sticky top-0 bg-gray-100 z-20 font-bold shadow-[0_1px_0_0_#e5e7eb]">Actividad Detallada</th>
                      <th className="p-3 sticky top-0 bg-blue-100 text-blue-800 z-20 font-bold text-center shadow-[0_1px_0_0_#e5e7eb]">Cant.</th>
                      <th className="p-3 sticky top-0 bg-gray-100 z-20 font-bold shadow-[0_1px_0_0_#e5e7eb]">Organismos</th>
                      <th className="p-3 sticky top-0 bg-gray-100 z-20 font-bold shadow-[0_1px_0_0_#e5e7eb]">Registrado Por</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {incidenciasFiltradas.length > 0 ? (
                      incidenciasFiltradas.map((incidencia, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="p-3">{new Date(incidencia.fecha_registro).toLocaleString()}</td>
                          <td className="p-3 font-bold text-gray-800">{incidencia.circuito_comunal}</td>
                          <td className="p-3 text-gray-600">
                            {usuarios.find(u => u.comuna_o_circuito_comunal === incidencia.circuito_comunal)?.municipio || 'N/A'} / {usuarios.find(u => u.comuna_o_circuito_comunal === incidencia.circuito_comunal)?.parroquia || 'N/A'}
                          </td>
                          <td className="p-3 text-gray-700">{incidencia.clasificacion}</td>
                          <td className="p-3 text-gray-700">{incidencia.incidencia}</td>
                          <td className="p-3 text-gray-600 max-w-[200px] truncate" title={incidencia.actividad}>{incidencia.actividad}</td>
                          <td className="p-3 text-center font-bold text-blue-700 bg-blue-50/50">{incidencia.cantidad}</td>
                          <td className="p-3 text-gray-600">{incidencia.organismos_involucrados}</td>
                          <td className="p-3 text-gray-600">Despachador ID: {incidencia.usuario_id?.substring(0,6)}...</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="p-16 text-center">
                          <div className="flex flex-col items-center justify-center text-gray-400">
                            <ShieldAlert size={56} className="mb-4 opacity-20" />
                            <p className="text-lg font-bold text-gray-500">No hay incidencias que coincidan con los filtros</p>
                            <p className="text-sm mt-1 max-w-md">Utilice los filtros superiores para buscar registros específicos.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. PANEL DE REPORTES Y ESTADÍSTICAS */}
          {activeTab === 'reportes' && (
            <div className="animate-fade-in w-full space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-[#00529b] to-blue-800 p-6 rounded-2xl text-white shadow-md">
                <div className="flex items-center gap-3">
                  <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/20 flex items-center justify-center">
                    <img src="/logo1.png" alt="Logo VEN 911" className="h-10 w-10 object-contain drop-shadow-md" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-wide">Centro de Inteligencia Analítica - Falcón</h2>
                    <p className="text-blue-100 text-xs font-medium mt-0.5">Monitoreo estadístico avanzado de cuadrantes de paz y operaciones VEN 911</p>
                  </div>
                </div>
                <div className="bg-white/10 p-3 rounded-xl backdrop-blur-md border border-white/20 flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-amber-400" />
                    <input type="date" className="bg-transparent text-white text-xs outline-none font-bold cursor-text [color-scheme:dark]" value={fechaRepDesde} onChange={e => setFechaRepDesde(e.target.value)} />
                  </div>
                  <span className="text-blue-300 font-bold text-xs">HASTA</span>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-amber-400" />
                    <input type="date" className="bg-transparent text-white text-xs outline-none font-bold cursor-text [color-scheme:dark]" value={fechaRepHasta} onChange={e => setFechaRepHasta(e.target.value)} />
                  </div>
                </div>
              </div>

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
                  {repTotal === 0 && <p className="text-center text-xs font-bold text-gray-400 py-4 shadow-inner bg-gray-50 rounded-xl">No hay registros analíticos para graficar.</p>}
                </div>

                <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b pb-3">
                    <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide flex items-center gap-1.5"><Award size={16} className="text-amber-500" />Top 5 Circuitos Comunales con Mayor Despliegue</h3>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-black px-2 py-0.5 rounded-full">Ranking</span>
                  </div>
                  <div className="space-y-3.5">
                    {topCircuitos?.length > 0 ? (
                      topCircuitos.map(([circuito, valor], idx) => {
                        const porcentajeCircuito = Math.round(((valor as number) / maxCircuitoValor) * 100);
                        return (
                          <div key={idx} className="flex items-center gap-3">
                            <span className="text-xs font-black text-gray-400 w-5">#{idx + 1}</span>
                            <div className="flex-1 space-y-1">
                              <div className="flex justify-between text-[11px] font-bold text-gray-700"><span className="truncate max-w-[220px]">{circuito}</span><span className="text-gray-900 font-extrabold">{valor as number} act.</span></div>
                              <div className="w-full bg-gray-100 rounded-md h-2 overflow-hidden border"><div className="bg-gradient-to-r from-[#00529b] to-blue-500 h-2 rounded-md transition-all duration-500" style={{ width: `${porcentajeCircuito}%` }}></div></div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-gray-400 bg-gray-50 rounded-2xl shadow-inner border-2 border-dashed">
                        <ShieldAlert size={36} className="opacity-30 mb-2"/><p className="text-xs font-bold">Sin histórico operativo en este rango de fechas</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. PESTAÑA DE CATÁLOGOS (SOLO PARA SUPERUSUARIOS) */}
          {activeTab === 'catalogos' && esSuperUser && (
            <div className="animate-fade-in w-full space-y-6">
              <div className="bg-white rounded-2xl mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 p-3 rounded-xl border border-slate-200">
                    <Settings className="text-slate-600" size={28}/>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Ajustes de Incidencias</h2>
                    <p className="text-sm text-gray-500 font-medium">Gestiona y corrige las listas desplegables del sistema en tiempo real</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* COLUMNA 1: CLASIFICACIÓN */}
                <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden flex flex-col">
                  <div className="bg-[#00529b] text-white p-4 font-bold text-sm tracking-wide flex justify-between items-center">
                    <span>1. CLASIFICACIÓN</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{catClasificacion.length}</span>
                  </div>
                  <div className="p-4 bg-gray-50 border-b">
                    <div className="flex gap-2">
                      <input type="text" placeholder="Nueva clasificación..." className="w-full text-sm p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#00529b]" value={newClasName} onChange={e => setNewClasName(e.target.value)} />
                      <button onClick={() => { if(newClasName) agregarCatalogo('catalogo_clasificacion', { nombre: newClasName.trim() }, setNewClasName) }} className="bg-[#00529b] text-white p-2 rounded-lg hover:bg-[#003d73] transition-colors"><Plus size={20}/></button>
                    </div>
                  </div>
                  <div className="max-h-[50vh] overflow-y-auto p-2 space-y-1">
                    {catClasificacion.map((c) => (
                      <div key={c.id} onClick={() => { setSelectedClasId(c.id); setSelectedIncId(''); }} className={`flex justify-between items-center p-3 rounded-xl cursor-pointer border transition-all ${selectedClasId === c.id ? 'bg-blue-50 border-blue-200 shadow-inner' : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'}`}>
                        <span className={`text-xs font-bold ${selectedClasId === c.id ? 'text-[#00529b]' : 'text-gray-600'}`}>{c.nombre}</span>
                        <div className="flex gap-1 opacity-50 hover:opacity-100">
                          <button onClick={(e) => { e.stopPropagation(); editarCatalogo('catalogo_clasificacion', c.id, c.nombre); }} className="p-1.5 hover:bg-white rounded-md text-amber-600"><Edit3 size={14}/></button>
                          <button onClick={(e) => { e.stopPropagation(); eliminarCatalogo('catalogo_clasificacion', c.id); }} className="p-1.5 hover:bg-white rounded-md text-red-600"><Trash2 size={14}/></button>
                          <ChevronRight size={16} className={selectedClasId === c.id ? 'text-[#00529b]' : 'text-transparent'}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* COLUMNA 2: INCIDENCIA */}
                <div className={`bg-white border rounded-3xl shadow-sm overflow-hidden flex flex-col transition-all ${!selectedClasId ? 'opacity-50 grayscale border-dashed' : 'border-gray-200'}`}>
                  <div className="bg-amber-500 text-white p-4 font-bold text-sm tracking-wide flex justify-between items-center">
                    <span>2. INCIDENCIA</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{catIncidencia.filter(i => i.clasificacion_id === selectedClasId).length}</span>
                  </div>
                  <div className="p-4 bg-amber-50/30 border-b">
                    <div className="flex gap-2">
                      <input disabled={!selectedClasId} type="text" placeholder="Nueva incidencia..." className="w-full text-sm p-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-100" value={newIncName} onChange={e => setNewIncName(e.target.value)} />
                      <button disabled={!selectedClasId} onClick={() => { if(newIncName) agregarCatalogo('catalogo_incidencia', { nombre: newIncName.trim(), clasificacion_id: selectedClasId }, setNewIncName) }} className="bg-amber-500 text-white p-2 rounded-lg hover:bg-amber-600 transition-colors disabled:bg-gray-300"><Plus size={20}/></button>
                    </div>
                  </div>
                  <div className="max-h-[50vh] overflow-y-auto p-2 space-y-1">
                    {!selectedClasId && <p className="text-xs text-center text-gray-400 py-8 font-bold uppercase tracking-wider">Selecciona una Clasificación</p>}
                    {catIncidencia.filter(i => i.clasificacion_id === selectedClasId).map((inc) => (
                      <div key={inc.id} onClick={() => setSelectedIncId(inc.id)} className={`flex justify-between items-center p-3 rounded-xl cursor-pointer border transition-all ${selectedIncId === inc.id ? 'bg-amber-50 border-amber-200 shadow-inner' : 'bg-white border-transparent hover:bg-amber-50/50 hover:border-amber-100'}`}>
                        <span className={`text-xs font-bold ${selectedIncId === inc.id ? 'text-amber-700' : 'text-gray-600'}`}>{inc.nombre}</span>
                        <div className="flex gap-1 opacity-50 hover:opacity-100">
                          <button onClick={(e) => { e.stopPropagation(); editarCatalogo('catalogo_incidencia', inc.id, inc.nombre); }} className="p-1.5 hover:bg-white rounded-md text-amber-600"><Edit3 size={14}/></button>
                          <button onClick={(e) => { e.stopPropagation(); eliminarCatalogo('catalogo_incidencia', inc.id); }} className="p-1.5 hover:bg-white rounded-md text-red-600"><Trash2 size={14}/></button>
                          <ChevronRight size={16} className={selectedIncId === inc.id ? 'text-amber-500' : 'text-transparent'}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* COLUMNA 3: ACTIVIDAD DETALLADA */}
                <div className={`bg-white border rounded-3xl shadow-sm overflow-hidden flex flex-col transition-all ${!selectedIncId ? 'opacity-50 grayscale border-dashed' : 'border-gray-200'}`}>
                  <div className="bg-emerald-600 text-white p-4 font-bold text-sm tracking-wide flex justify-between items-center">
                    <span>3. ACTIVIDAD DETALLADA</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{catActividad.filter(a => a.incidencia_id === selectedIncId).length}</span>
                  </div>
                  <div className="p-4 bg-emerald-50/30 border-b">
                    <div className="flex gap-2">
                      <input disabled={!selectedIncId} type="text" placeholder="Nueva actividad..." className="w-full text-sm p-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100" value={newActName} onChange={e => setNewActName(e.target.value)} />
                      <button disabled={!selectedIncId} onClick={() => { if(newActName) agregarCatalogo('catalogo_actividad', { nombre: newActName.trim(), incidencia_id: selectedIncId }, setNewActName) }} className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-gray-300"><Plus size={20}/></button>
                    </div>
                  </div>
                  <div className="max-h-[50vh] overflow-y-auto p-2 space-y-1">
                    {!selectedIncId && <p className="text-xs text-center text-gray-400 py-8 font-bold uppercase tracking-wider">Selecciona una Incidencia</p>}
                    {catActividad.filter(a => a.incidencia_id === selectedIncId).map((act) => (
                      <div key={act.id} className="flex justify-between items-center p-3 rounded-xl border border-transparent hover:bg-emerald-50 hover:border-emerald-100 transition-all group">
                        <span className="text-xs font-bold text-gray-600">{act.nombre}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => editarCatalogo('catalogo_actividad', act.id, act.nombre)} className="p-1.5 hover:bg-white rounded-md text-amber-600"><Edit3 size={14}/></button>
                          <button onClick={() => eliminarCatalogo('catalogo_actividad', act.id)} className="p-1.5 hover:bg-white rounded-md text-red-600"><Trash2 size={14}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>

      {/* ==========================================
          MODAL DE GESTION DE ADMINISTRADORES (SOLO SUPERUSER)
          ========================================== */}
      {mostrarModalEliminarAdmin && esSuperUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border">
            <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-3 flex items-center justify-between">
              <span className="flex items-center gap-2"><Settings className="text-[#00529b]" /> Gestión de Administradores</span>
              
              {/* BUSCADOR DE ADMINS */}
              <div className="relative w-64">
                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Buscar admin..." 
                  className="w-full pl-9 pr-3 py-2 bg-gray-100 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#00529b]"
                  value={busquedaAdmin}
                  onChange={(e) => setBusquedaAdmin(e.target.value)}
                />
              </div>
            </h3>
            
            <div className="max-h-[60vh] overflow-y-auto space-y-2 mb-4 pr-2">
              {listaAdmins.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Cargando administradores...</p>
              ) : (
                listaAdmins
                  .filter(admin => {
                    const busquedaLower = busquedaAdmin.toLowerCase();
                    return (
                      (admin.nombre_apellido_jefe || '').toLowerCase().includes(busquedaLower) ||
                      (admin.cedula || '').toLowerCase().includes(busquedaLower) ||
                      (admin.email || '').toLowerCase().includes(busquedaLower)
                    );
                  })
                  .map(admin => (
                  <div key={admin.id} className={`flex flex-col p-3 rounded-xl border ${admin.rol === 'superusuario' ? 'bg-amber-50 border-amber-200' : 'bg-gray-50'}`}>
                    
                    {/* Alerta si NO tiene organismo */}
                    {(!admin.organismo_responsable || admin.organismo_responsable.trim() === '') && (
                      <div className="mb-2 bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1">
                        <AlertCircle size={12} /> ESTA PERSONA NO TIENE ORGANISMO ASIGNADO. EDITE SU PERFIL PARA ASIGNARLO.
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <div className="flex flex-col flex-1 pr-2">
                        <span className="font-bold text-sm text-gray-800">{admin.nombre_apellido_jefe}</span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase">{admin.organismo_responsable || 'SIN ORGANISMO ASIGNADO'}</span>
                      </div>
                      
                      <div className="flex gap-2 items-center">
                        
                        {/* Botón para Editar Todos los Datos del Admin */}
                        <button
                          onClick={() => abrirEditar(admin)}
                          className="bg-amber-500 text-white p-2 rounded-lg hover:bg-amber-600 transition-all shadow-sm flex items-center gap-1 text-xs font-bold"
                          title="Editar todos los datos de este administrador"
                        >
                          <SquarePen size={14} /> Editar Admin
                        </button>

                        {/* El botón de Superusuario SOLO aparece si es de VEN 911 */}
                        {admin.organismo_responsable === 'VEN 911' && (
                          <button
                            onClick={() => handleToggleSuperUser(admin.id, admin.nombre_apellido_jefe, admin.rol)}
                            className={`p-2 rounded-lg transition-all border ${admin.rol === 'superusuario' ? 'bg-amber-500 text-white border-amber-600 shadow-inner' : 'bg-white text-gray-400 border-gray-300 hover:text-amber-500'}`}
                            title={admin.rol === 'superusuario' ? "Quitar privilegios de Superusuario" : "Convertir en Superusuario"}
                          >
                            <Star size={16} className={admin.rol === 'superusuario' ? 'fill-current' : ''} />
                          </button>
                        )}

                        {/* Botón para Eliminar */}
                        {admin.id === adminUser?.id ? (
                          <span className="text-[10px] font-bold text-[#00529b] bg-blue-100 px-3 py-2 rounded-lg flex items-center h-full">Tú</span>
                        ) : (
                          <button
                            onClick={() => handleEliminarAdmin(admin.id, admin.nombre_apellido_jefe)}
                            className="bg-white border border-red-200 text-red-600 p-2 rounded-lg hover:bg-red-50 hover:shadow-sm transition-all"
                            title="Eliminar este administrador"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <button 
              onClick={() => setMostrarModalEliminarAdmin(false)} 
              className="w-full bg-gray-200 text-gray-700 p-3 rounded-xl font-bold hover:bg-gray-300 transition-all"
            >
              Cerrar Panel
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL DE EDITAR PERFIL ADMIN (MÍO PROPIO)
          ========================================== */}
      {mostrarModalAdmin && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-[2rem] p-8 max-w-3xl w-full shadow-2xl border my-8">
            <h3 className="text-2xl font-black text-gray-800 mb-6 border-b pb-4">Editar Mi Perfil</h3>
            
            <form onSubmit={guardarPerfilAdmin} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Nombre completo</label>
                  <input required className="w-full p-3 border rounded-xl bg-white" placeholder="Ej: Juan Pérez" value={formAdmin.nombre_apellido_jefe} onChange={e => setFormAdmin({...formAdmin, nombre_apellido_jefe: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Cédula (Solo números)</label>
                  <input required type="text" inputMode="numeric" pattern="[0-9]*" maxLength={10} className="w-full p-3 border rounded-xl bg-white" placeholder="Ej: 12345678" value={formAdmin.cedula} onChange={e => setFormAdmin({...formAdmin, cedula: e.target.value.replace(/\D/g, '')})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Cargo / Grado</label>
                  <input required className="w-full p-3 border rounded-xl bg-white" placeholder="Ej: Comisionado" value={formAdmin.grado_jerarquia} onChange={e => setFormAdmin({...formAdmin, grado_jerarquia: e.target.value})} />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Correo Electrónico Oficial</label>
                  <input required type="email" readOnly={!esSuperUser} className={`w-full p-3 border rounded-xl ${esSuperUser ? 'bg-white' : 'bg-gray-100 text-gray-500'}`} placeholder="admin@correo.com" value={formAdmin.email} onChange={e => setFormAdmin({...formAdmin, email: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Teléfono Celular (Solo números)</label>
                  <input required type="text" inputMode="numeric" pattern="[0-9]*" maxLength={11} className="w-full p-3 border rounded-xl bg-white" placeholder="Ej: 04120000000" value={formAdmin.telefono_celular_jefe} onChange={e => setFormAdmin({...formAdmin, telefono_celular_jefe: e.target.value.replace(/\D/g, '')})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#00529b] mb-1 block">Contraseña Maestra</label>
                  <input required type="text" minLength={6} readOnly={!esSuperUser} className={`w-full p-3 border-2 border-[#00529b] rounded-xl font-bold ${esSuperUser ? 'bg-blue-50' : 'bg-gray-100 text-gray-500'}`} value={formAdmin.codigo_situr} onChange={e => setFormAdmin({...formAdmin, codigo_situr: e.target.value})} />
                  {!esSuperUser && <p className="text-[10px] text-red-500 mt-1 font-bold">* Solo un Superusuario puede cambiar tu correo o clave.</p>}
                </div>
              </div>

              <div className="col-span-full flex flex-col sm:flex-row gap-3 pt-6 border-t mt-4">
                <button type="button" onClick={() => setMostrarModalAdmin(false)} className="flex-1 bg-gray-200 text-gray-700 p-4 rounded-xl font-bold hover:bg-gray-300 transition-all text-center">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 bg-[#00529b] text-white p-4 rounded-xl font-bold hover:bg-[#003d73] transition-all shadow-md">
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL DE EDITAR FICHA DE USUARIO O ADMIN
          ========================================== */}
      {editingUsuario && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-4xl w-full shadow-2xl border flex flex-col max-h-[90vh]">
            <h3 className="text-xl font-bold text-[#00529b] border-b pb-3 mb-4">
              Modificar Ficha: {editingUsuario.rol === 'admin' || editingUsuario.rol === 'superusuario' ? 'ADMINISTRADOR' : 'JEFE DE CUADRANTE'}
            </h3>
            <form onSubmit={handleEditSubmit} className="overflow-y-auto pr-2 grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div className="col-span-full">
                <label className="block text-xs font-bold text-[#00529b] mb-1">Organismo Responsable</label>
                {esSuperUser ? (
                  <select required className="w-full p-2 border rounded-lg bg-white font-bold" value={formEditar.organismo_responsable} onChange={e => setFormEditar({...formEditar, organismo_responsable: e.target.value})}>
                    <option value="">Seleccione el Organismo...</option>
                    {LISTA_ORGANISMOS.map((org, i) => <option key={i} value={org}>{org}</option>)}
                  </select>
                ) : (
                  <input required type="text" readOnly className="w-full p-2 border rounded-lg bg-gray-100 text-gray-600 font-bold" value={formEditar.organismo_responsable} />
                )}
              </div>

              {(formEditar.rol === 'admin' || formEditar.rol === 'superusuario') && (
                <div className="col-span-full">
                  <label className="block text-xs font-bold text-gray-600 mb-1">Correo Electrónico (Login)</label>
                  <input required type="email" readOnly={!esSuperUser} className={`w-full p-2 border rounded-lg ${esSuperUser ? 'bg-white' : 'bg-gray-100 text-gray-500 cursor-not-allowed'}`} value={formEditar.email} onChange={e => setFormEditar({...formEditar, email: e.target.value})} />
                </div>
              )}

              <div><label className="block text-xs font-bold text-gray-600 mb-1">Estado</label><input type="text" className="w-full p-2 border rounded-lg" value={formEditar.estado} onChange={e => setFormEditar({...formEditar, estado: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-gray-600 mb-1">Municipio</label><input type="text" className="w-full p-2 border rounded-lg" value={formEditar.municipio} onChange={e => setFormEditar({...formEditar, municipio: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-gray-600 mb-1">Parroquia</label><input type="text" className="w-full p-2 border rounded-lg" value={formEditar.parroquia} onChange={e => setFormEditar({...formEditar, parroquia: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-gray-600 mb-1">Grado o Jerarquía</label><input type="text" className="w-full p-2 border rounded-lg" value={formEditar.grado_jerarquia} onChange={e => setFormEditar({...formEditar, grado_jerarquia: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-gray-600 mb-1">Nombres y Apellidos</label><input required type="text" className="w-full p-2 border rounded-lg" value={formEditar.nombre_apellido_jefe} onChange={e => setFormEditar({...formEditar, nombre_apellido_jefe: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-gray-600 mb-1">Cédula</label><input type="text" className="w-full p-2 border rounded-lg" value={formEditar.cedula} onChange={e => setFormEditar({...formEditar, cedula: e.target.value})} /></div>
              
              <div>
                <label className="block text-xs font-bold text-[#00529b] mb-1">Clave / SITUR</label>
                <input 
                  required 
                  type="text" 
                  readOnly={!esSuperUser}
                  title={!esSuperUser ? "Solo el Superusuario puede cambiar credenciales" : ""}
                  className={`w-full p-2 border-2 ${esSuperUser ? 'border-[#00529b] bg-blue-50' : 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed'} font-bold rounded-lg`} 
                  value={formEditar.codigo_situr} 
                  onChange={e => setFormEditar({...formEditar, codigo_situr: e.target.value})} 
                />
              </div>
              
              <div><label className="block text-xs font-bold text-gray-600 mb-1">Circuito Comunal</label><input required type="text" className="w-full p-2 border rounded-lg" value={formEditar.comuna_o_circuito_comunal} onChange={e => setFormEditar({...formEditar, comuna_o_circuito_comunal: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-gray-600 mb-1">Teléfono Jefe</label><input type="text" className="w-full p-2 border rounded-lg" value={formEditar.telefono_celular_jefe} onChange={e => setFormEditar({...formEditar, telefono_celular_jefe: e.target.value})} /></div>
              
              {formEditar.rol === 'usuario' && (
                <>
                  <div><label className="block text-xs font-bold text-gray-600 mb-1">Cuadrante N°</label><input type="text" className="w-full p-2 border rounded-lg" value={formEditar.cuadrante} onChange={e => setFormEditar({...formEditar, cuadrante: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-gray-600 mb-1">Teléfono Cuadrante</label><input type="text" className="w-full p-2 border rounded-lg" value={formEditar.telefono_cuadrante} onChange={e => setFormEditar({...formEditar, telefono_cuadrante: e.target.value})} /></div>
                  <div className="col-span-full"><label className="block text-xs font-bold text-gray-600 mb-1">Consejos Comunales</label><textarea className="w-full p-2 border rounded-lg" rows={2} value={formEditar.consejos_comunales} onChange={e => setFormEditar({...formEditar, consejos_comunales: e.target.value})} /></div>
                </>
              )}
              
              <div className="col-span-full border-t pt-4 mt-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">Sectores pertenecientes a este Circuito</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {sectoresInputsEditar.map((sectorValue, index) => (
                    <div key={index} className="relative flex items-center">
                      <span className="absolute left-2 text-[10px] font-bold text-gray-400 bg-gray-100 px-1 rounded">#{index + 1}</span>
                      <input 
                        type="text" 
                        className="w-full p-2 pl-8 border rounded-lg bg-white text-xs" 
                        placeholder="Nombre del sector..." 
                        value={sectorValue} 
                        onChange={e => handleSectorInputEditarChange(index, e.target.value)} 
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="col-span-full flex gap-3 pt-4 shrink-0 mt-2 border-t">
                <button type="button" onClick={() => { setEditingUsuario(null); if (esSuperUser) fetchAdmins(); }} className="flex-1 bg-gray-200 text-gray-700 p-4 rounded-xl font-bold">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 bg-amber-500 text-white p-4 rounded-xl font-bold">Guardar Modificación</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
