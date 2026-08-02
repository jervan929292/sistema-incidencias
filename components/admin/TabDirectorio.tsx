'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FileSpreadsheet, SquarePen, Trash2, Plus, Info, X, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

// LISTA ESTRICTA DE ORGANISMOS DEL ESTADO FALCÓN
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

export default function TabDirectorio({ adminUser, esSuperUser, isReadOnlyVen911 }: any) {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [sectoresDB, setSectoresDB] = useState<any[]>([]); 
  const [loading, setLoading] = useState(false);

  // Estados para subida de Excel
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Filtros
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filtroMunicipio, setFiltroMunicipio] = useState('');
  const [filtroParroquia, setFiltroParroquia] = useState('');
  const [filtroCircuito, setFiltroCircuito] = useState(''); 
  const [filtroDirectorioOrganismo, setFiltroDirectorioOrganismo] = useState('');

  // Formularios
  const [mostrarFormualioManual, setMostrarFormularioManual] = useState(false);
  const [formManual, setFormManual] = useState({
    estado: 'FALCÓN', municipio: '', parroquia: '', cuadrante: '', telefono_cuadrante: '',
    organismo_responsable: '', grado_jerarquia: '', cedula: '', nombre_apellido_jefe: '',
    telefono_celular_jefe: '', codigo_situr: '', comuna_o_circuito_comunal: '', consejos_comunales: ''
  });
  const [sectoresInputs, setSectoresInputs] = useState<string[]>(['']);
  
  const [editingUsuario, setEditingUsuario] = useState<any | null>(null);
  const [formEditar, setFormEditar] = useState({ ...formManual, id: '', rol: 'usuario', email: '' }); 
  const [sectoresInputsEditar, setSectoresInputsEditar] = useState<string[]>(['']);
  const [circuitoInfoSeleccionado, setCircuitoInfoSeleccionado] = useState<string | null>(null);

  useEffect(() => {
    fetchDatos();
  }, []);

  const fetchDatos = async () => {
    const isSuper = adminUser.rol === 'superusuario';
    const isReadVen911 = adminUser.organismo_responsable === 'VEN 911' && !isSuper;
    const veTodo = isSuper || isReadVen911;

    if (!veTodo && (!adminUser.organismo_responsable || adminUser.organismo_responsable.trim() === '')) {
      setUsuarios([]); setSectoresDB([]); return; 
    }
    
    // Cargar Usuarios
    let usuariosProcesados: any[] = [];
    const { data: users, error: errU } = await supabase.from('directorio_operativo').select('*').neq('rol', 'admin').neq('rol', 'superusuario').limit(10000);
    if (errU) {
      alert("Error cargando usuarios: " + errU.message);
    } else if (users) {
      usuariosProcesados = (!veTodo && adminUser.organismo_responsable) 
        ? users.filter(u => matchesOrganismo(u.organismo_responsable, adminUser.organismo_responsable)) 
        : users;
      setUsuarios(usuariosProcesados);
    }

    // Cargar Sectores
    let todosLosSectores: any[] = [];
    let limite = 1000;
    let inicio = 0;
    let hayMas = true;
    while (hayMas) {
      const { data: secs } = await supabase.from('sectores').select('*').range(inicio, inicio + limite - 1);
      if (secs && secs.length > 0) {
        todosLosSectores = [...todosLosSectores, ...secs];
        inicio += limite;
        if (secs.length < limite) hayMas = false; 
      } else { hayMas = false; }
    }
    setSectoresDB(todosLosSectores);
    setSelectedIds([]); 
  };

  const municipiosUnicos = Array.from(new Set(usuarios.map(u => u.municipio))).filter(Boolean).sort();
  const parroquiasUnicas = Array.from(
    new Set(usuarios.filter(u => filtroMunicipio === '' || u.municipio === filtroMunicipio).map(u => u.parroquia))
  ).filter(Boolean).sort();
  const circuitosUnicos = Array.from(
    new Set(usuarios.filter(u => 
      (filtroMunicipio === '' || u.municipio === filtroMunicipio) && 
      (filtroParroquia === '' || u.parroquia === filtroParroquia)
    ).map(u => u.comuna_o_circuito_comunal))
  ).filter(Boolean).sort();

  const usuariosFiltrados = usuarios.filter(u => {
    const matchMunicipio = filtroMunicipio === '' || u.municipio === filtroMunicipio;
    const matchParroquia = filtroParroquia === '' || u.parroquia === filtroParroquia;
    const matchCircuito = filtroCircuito === '' || u.comuna_o_circuito_comunal === filtroCircuito;
    const matchOrganismo = filtroDirectorioOrganismo === '' || matchesOrganismo(u.organismo_responsable, filtroDirectorioOrganismo);
    return matchMunicipio && matchParroquia && matchCircuito && matchOrganismo;
  });

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
      fetchDatos();
    } catch (error: any) { alert("Error al eliminar: " + error.message); } finally { setLoading(false); }
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
      
      fetchDatos();
    } catch (error: any) {
      alert("Error Crítico: " + error.message);
      setShowUploadModal(false);
    } finally {
      setLoading(false);
      e.target.value = ''; 
    }
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
      fetchDatos();
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

      const { error: errJefe } = await supabase.from('directorio_operativo').update(datosJefeLimpios).eq('id', editingUsuario.id);
      if (errJefe) throw errJefe;

      if (codigoViejo) await supabase.from('sectores').delete().eq('codigo_situr', codigoViejo);
      if (codigoViejo !== codigoSiturLimpio) await supabase.from('sectores').delete().eq('codigo_situr', codigoSiturLimpio);

      const sectoresPayload = sectoresInputsEditar
        .map(s => s.replace(/["']/g, '').trim())
        .filter(s => s !== '') 
        .map(s => ({ nombre_sector: s, circuito_comunal: circuitoLimpio, codigo_situr: codigoSiturLimpio }));
        
      if (sectoresPayload.length > 0) {
        const { error: errSec } = await supabase.from('sectores').insert(sectoresPayload);
        if (errSec) throw new Error("Fallo al insertar los sectores: " + errSec.message);
      }

      alert("Ficha actualizada con éxito.");
      setEditingUsuario(null);
      fetchDatos(); 
    } catch (error: any) { alert("Error: " + error.message); } finally { setLoading(false); }
  };

  return (
    <div className="animate-fade-in w-full">
      {/* Modal Carga Excel */}
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

      {/* Info Circuito */}
      {circuitoInfoSeleccionado && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border flex flex-col relative">
            <div className="flex justify-between items-start border-b pb-4 mb-4">
              <h3 className="text-lg font-black text-[#00529b] flex items-center gap-2"><Info size={20} className="text-blue-500" /> Detalles del Circuito</h3>
              <button onClick={() => setCircuitoInfoSeleccionado(null)} className="text-gray-400 hover:text-red-500 bg-gray-100 hover:bg-red-50 p-2 rounded-full transition-all"><X size={20} /></button>
            </div>
            {(() => {
              const jefe = usuarios.find(u => u.comuna_o_circuito_comunal === circuitoInfoSeleccionado);
              const sectores = sectoresDB.filter(s => s.codigo_situr === jefe?.codigo_situr);
              return (
                <div className="space-y-4">
                  <div><p className="text-[10px] text-gray-500 font-bold uppercase">Circuito Comunal</p><p className="text-sm font-bold text-gray-800">{circuitoInfoSeleccionado}</p></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-[10px] text-gray-500 font-bold uppercase">Municipio</p><p className="text-sm font-bold text-gray-800">{jefe?.municipio || 'N/A'}</p></div>
                    <div><p className="text-[10px] text-gray-500 font-bold uppercase">Parroquia</p><p className="text-sm font-bold text-gray-800">{jefe?.parroquia || 'N/A'}</p></div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                    <p className="text-[10px] text-blue-600 font-bold uppercase mb-1">Jefe de Cuadrante / Circuito</p>
                    <p className="text-sm font-black text-gray-800">{jefe?.nombre_apellido_jefe || 'No asignado'}</p>
                    <p className="text-xs text-gray-600">{jefe?.grado_jerarquia} | {jefe?.telefono_celular_jefe}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">Sectores ({sectores.length})</p>
                    <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto p-2 bg-gray-50 rounded-lg border">
                      {sectores.length > 0 ? sectores.map((s, idx) => <span key={idx} className="bg-white border text-gray-700 text-[10px] font-bold px-2 py-1 rounded shadow-sm">{s.nombre_sector}</span>) : <span className="text-xs text-gray-400">Sin sectores registrados</span>}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Editar Usuario */}
      {editingUsuario && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-4xl w-full shadow-2xl border flex flex-col max-h-[90vh]">
            <h3 className="text-xl font-bold text-[#00529b] border-b pb-3 mb-4">Modificar Ficha: {editingUsuario.rol === 'admin' || editingUsuario.rol === 'superusuario' ? 'ADMINISTRADOR' : 'JEFE DE CUADRANTE'}</h3>
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
                <div className="col-span-full"><label className="block text-xs font-bold text-gray-600 mb-1">Correo Electrónico (Login)</label><input required type="email" readOnly={!esSuperUser} className={`w-full p-2 border rounded-lg ${esSuperUser ? 'bg-white' : 'bg-gray-100 text-gray-500 cursor-not-allowed'}`} value={formEditar.email} onChange={e => setFormEditar({...formEditar, email: e.target.value})} /></div>
              )}
              <div><label className="block text-xs font-bold text-gray-600 mb-1">Estado</label><input type="text" className="w-full p-2 border rounded-lg" value={formEditar.estado} onChange={e => setFormEditar({...formEditar, estado: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-gray-600 mb-1">Municipio</label><input type="text" className="w-full p-2 border rounded-lg" value={formEditar.municipio} onChange={e => setFormEditar({...formEditar, municipio: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-gray-600 mb-1">Parroquia</label><input type="text" className="w-full p-2 border rounded-lg" value={formEditar.parroquia} onChange={e => setFormEditar({...formEditar, parroquia: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-gray-600 mb-1">Grado o Jerarquía</label><input type="text" className="w-full p-2 border rounded-lg" value={formEditar.grado_jerarquia} onChange={e => setFormEditar({...formEditar, grado_jerarquia: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-gray-600 mb-1">Nombres y Apellidos</label><input required type="text" className="w-full p-2 border rounded-lg" value={formEditar.nombre_apellido_jefe} onChange={e => setFormEditar({...formEditar, nombre_apellido_jefe: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-gray-600 mb-1">Cédula</label><input type="text" className="w-full p-2 border rounded-lg" value={formEditar.cedula} onChange={e => setFormEditar({...formEditar, cedula: e.target.value})} /></div>
              <div>
                <label className="block text-xs font-bold text-[#00529b] mb-1">Clave / SITUR</label>
                <input required type="text" readOnly={!esSuperUser} className={`w-full p-2 border-2 ${esSuperUser ? 'border-[#00529b] bg-blue-50' : 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed'} font-bold rounded-lg`} value={formEditar.codigo_situr} onChange={e => setFormEditar({...formEditar, codigo_situr: e.target.value})} />
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
                      <input type="text" className="w-full p-2 pl-8 border rounded-lg bg-white text-xs" placeholder="Nombre del sector..." value={sectorValue} onChange={e => {
                        const nuevasCeldas = [...sectoresInputsEditar];
                        nuevasCeldas[index] = e.target.value;
                        if (index === nuevasCeldas.length - 1 && e.target.value.trim() !== '') nuevasCeldas.push('');
                        setSectoresInputsEditar(nuevasCeldas);
                      }} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="col-span-full flex gap-3 pt-4 shrink-0 mt-2 border-t">
                <button type="button" onClick={() => setEditingUsuario(null)} className="flex-1 bg-gray-200 text-gray-700 p-4 rounded-xl font-bold">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 bg-amber-500 text-white p-4 rounded-xl font-bold">Guardar Modificación</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TITULO Y BOTONERA */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-800">Gestión de Usuarios {(esSuperUser || isReadOnlyVen911) ? '(Todos los Organismos)' : `(${adminUser?.organismo_responsable || 'SIN ORGANISMO ASIGNADO'})`}</h2>
          <span className="bg-blue-100 text-blue-800 text-sm font-bold px-3 py-1 rounded-full">{usuariosFiltrados?.length || 0} Mostrando</span>
        </div>
        
        <div className="flex flex-wrap gap-3 justify-end">
          {selectedIds.length > 0 && !isReadOnlyVen911 && (
            <button onClick={handleDeleteSelected} disabled={loading} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-red-700 transition-all">{loading ? 'Eliminando...' : `🗑️ Eliminar (${selectedIds.length})`}</button>
          )}
          {esSuperUser && (
            <button onClick={handleDescargarCredenciales} className="bg-emerald-600 text-white px-5 py-3 rounded-xl font-bold shadow-md hover:bg-emerald-700 transition-all flex items-center gap-2"><FileSpreadsheet size={18} /> DESCARGAR CREDENCIALES</button>
          )}
          {!isReadOnlyVen911 && (
            <button onClick={() => setMostrarFormularioManual(!mostrarFormualioManual)} className="bg-gray-800 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-gray-700 transition-all">{mostrarFormualioManual ? '- CERRAR FORMULARIO' : '+ AGREGAR MANUAL'}</button>
          )}
          {esSuperUser && (
            <label className="bg-[#00529b] text-white px-6 py-3 rounded-xl cursor-pointer hover:bg-[#003d73] transition-all font-bold shadow-md whitespace-nowrap">
              {loading ? 'Procesando...' : '+ SUBIR EXCEL'}
              <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
            </label>
          )}
        </div>
      </div>

      {/* FILTROS DIRECTORIO */}
      <div className="flex flex-wrap gap-4 mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-200">
        <div className="flex flex-col flex-1 min-w-[200px]">
          <label className="text-xs font-bold text-gray-500 mb-1">Filtrar por Municipio</label>
          <select value={filtroMunicipio} onChange={(e) => { setFiltroMunicipio(e.target.value); setFiltroParroquia(''); setFiltroCircuito(''); }} className="p-2 border rounded-lg bg-white text-sm outline-none shadow-sm cursor-pointer">
            <option value="">Todos los Municipios</option>
            {municipiosUnicos.map((m, i) => <option key={i} value={m as string}>{m}</option>)}
          </select>
        </div>
        <div className="flex flex-col flex-1 min-w-[200px]">
          <label className="text-xs font-bold text-gray-500 mb-1">Filtrar por Parroquia</label>
          <select value={filtroParroquia} onChange={(e) => { setFiltroParroquia(e.target.value); setFiltroCircuito(''); }} disabled={!filtroMunicipio} className="p-2 border rounded-lg bg-white text-sm outline-none shadow-sm cursor-pointer disabled:bg-gray-100">
            <option value="">Todas las Parroquias</option>
            {parroquiasUnicas.map((p, i) => <option key={i} value={p as string}>{p}</option>)}
          </select>
        </div>
        <div className="flex flex-col flex-1 min-w-[200px]">
          <label className="text-xs font-bold text-gray-500 mb-1">Filtrar por Circuito</label>
          <select value={filtroCircuito} onChange={(e) => setFiltroCircuito(e.target.value)} disabled={!filtroParroquia} className="p-2 border rounded-lg bg-white text-sm outline-none shadow-sm cursor-pointer disabled:bg-gray-100">
            <option value="">Todos los Circuitos</option>
            {circuitosUnicos.map((c, i) => <option key={i} value={c as string}>{c}</option>)}
          </select>
        </div>
        {(esSuperUser || isReadOnlyVen911) && (
          <div className="flex flex-col flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-[#00529b] mb-1">Filtrar por Organismo</label>
            <select value={filtroDirectorioOrganismo} onChange={(e) => setFiltroDirectorioOrganismo(e.target.value)} className="p-2 border border-blue-200 rounded-lg bg-blue-50 text-[#00529b] text-sm font-bold outline-none shadow-sm cursor-pointer">
              <option value="">TODOS LOS ORGANISMOS</option>
              {LISTA_ORGANISMOS.map((org, i) => <option key={i} value={org}>{org}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Formulario Manual */}
      {mostrarFormualioManual && !isReadOnlyVen911 && (
        <form onSubmit={handleManualSubmit} className="bg-gray-50 p-6 rounded-2xl border border-gray-200 mb-8 grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
          <div className="col-span-full border-b pb-2 mb-2 flex justify-between items-end"><span className="font-bold text-xl text-[#00529b]">Registro de Nuevo Jefe de Cuadrante</span></div>
          <div className="col-span-full bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-200 text-sm mb-2 shadow-inner"><span className="font-bold block mb-1">¡Importante - Credenciales Autogeneradas!</span>Al guardar, el sistema creará automáticamente su <b>Correo Electrónico</b> y su <b>Clave de acceso</b> será el mismo <b>Código SITUR</b>.</div>
          
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
                  <input type="text" className="w-full p-2 pl-8 border rounded-lg bg-white text-xs" placeholder="Sector..." value={sectorValue} onChange={e => {
                    const nuevasCeldas = [...sectoresInputs];
                    nuevasCeldas[index] = e.target.value;
                    if (index === nuevasCeldas.length - 1 && e.target.value.trim() !== '') nuevasCeldas.push('');
                    setSectoresInputs(nuevasCeldas);
                  }} />
                </div>
              ))}
            </div>
          </div>
          <button type="submit" disabled={loading} className="col-span-full mt-4 bg-[#00529b] text-white p-4 rounded-xl font-bold hover:bg-[#003d73] transition-all">GUARDAR FICHA</button>
        </form>
      )}

      {/* TABLA PRINCIPAL DIRECTORIO */}
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
              usuariosFiltrados.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  {!isReadOnlyVen911 && <td className="p-2 text-center sticky left-0 bg-white z-10"><input type="checkbox" checked={selectedIds.includes(u.id)} onChange={() => handleSelectOne(u.id)} /></td>}
                  {!isReadOnlyVen911 && <td className="p-2 sticky left-10 bg-white z-10"><button onClick={() => abrirEditar(u)} className="bg-amber-500 text-white px-2 py-1 rounded"><SquarePen size={14}/></button></td>}
                  <td className="p-2 truncate max-w-[160px]" title={`${u.estado} - ${u.municipio} - ${u.parroquia}`}>{u.municipio} - {u.parroquia}</td>
                  <td className="p-2 font-mono font-bold text-amber-700">{u.codigo_situr}</td>
                  <td className="p-2">
                    <div className="flex items-center justify-between gap-1.5 w-full max-w-[160px]">
                      <span className="truncate flex-1 min-w-0" title={u.comuna_o_circuito_comunal}>{u.comuna_o_circuito_comunal}</span>
                      <button onClick={() => setCircuitoInfoSeleccionado(u.comuna_o_circuito_comunal)} className="text-blue-500 hover:text-blue-700 transition-colors shrink-0"><Info size={14} /></button>
                    </div>
                  </td>
                  <td className="p-2 truncate max-w-[110px] font-bold text-gray-600" title={u.grado_jerarquia}>{u.grado_jerarquia}</td>
                  <td className="p-2 truncate max-w-[190px]" title={u.nombre_apellido_jefe}>{u.nombre_apellido_jefe}</td>
                  <td className="p-2">{u.cedula}</td>
                  <td className="p-2 font-mono">{u.telefono_celular_jefe}</td>
                  <td className="p-2 truncate max-w-[130px]" title={u.organismo_responsable}>{u.organismo_responsable}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
