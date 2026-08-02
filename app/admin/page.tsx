'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Star, UserPlus, UserMinus, Settings, AlertCircle, Trash2, SquarePen, Search } from 'lucide-react';
import Link from 'next/link';

// IMPORTAREMOS LOS COMPONENTES MODULARES (Los crearemos en los siguientes pasos)
import TabDirectorio from '@/components/admin/TabDirectorio';
import TabIncidencias from '@/components/admin/TabIncidencias';
import TabReportes from '@/components/admin/TabReportes';
import TabCatalogos from '@/components/admin/TabCatalogos';

// DICCIONARIO PARA OBTENER LAS SIGLAS DEL ORGANISMO
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

export default function AdminDashboardPage() {
  // ESTADOS GLOBALES DE LA PÁGINA
  const [activeTab, setActiveTab] = useState('directorio'); 
  const [loading, setLoading] = useState(false);
  const [verificando, setVerificando] = useState(true);
  
  // ESTADOS DE SEGURIDAD Y USUARIO LOGUEADO
  const [adminUser, setAdminUser] = useState<any>(null);
  const [esSuperUser, setEsSuperUser] = useState(false);
  const [isReadOnlyVen911, setIsReadOnlyVen911] = useState(false);
  
  // ESTADOS DE MODALES DE LA CABECERA
  const [mostrarModalAdmin, setMostrarModalAdmin] = useState(false);
  const [formAdmin, setFormAdmin] = useState({ 
    nombre_apellido_jefe: '', telefono_celular_jefe: '', cedula: '', grado_jerarquia: '', email: '', codigo_situr: '' 
  });
  
  const [listaAdmins, setListaAdmins] = useState<any[]>([]);
  const [mostrarModalEliminarAdmin, setMostrarModalEliminarAdmin] = useState(false);
  const [busquedaAdmin, setBusquedaAdmin] = useState('');

  // 1. EFECTO DE SEGURIDAD Y CARGA INICIAL
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const sessionData = localStorage.getItem('user_session');
        let correoLogueado = '';

        if (sessionData) {
          try {
            const parsed = JSON.parse(sessionData);
            if (parsed?.email) correoLogueado = parsed.email;
          } catch (e) {}
        }

        if (!correoLogueado) {
          window.location.href = '/login';
          return;
        }

        const { data: adminData, error: dbError } = await supabase
          .from('directorio_operativo')
          .select('*')
          .ilike('email', correoLogueado)
          .maybeSingle();

        if (dbError || !adminData) {
          window.location.href = '/login';
          return;
        }

        if (adminData?.rol === 'admin' || adminData?.rol === 'superusuario') {
          setAdminUser(adminData); 
          setEsSuperUser(adminData.rol === 'superusuario');
          setIsReadOnlyVen911(adminData.organismo_responsable === 'VEN 911' && adminData.rol !== 'superusuario');
          setVerificando(false);
          
          if (adminData.rol === 'superusuario') {
            fetchAdmins();
          }
        } else {
          window.location.href = '/dashboard';
        }
      } catch (err) {
        window.location.href = '/login';
      }
    };
    checkAccess();
  }, []);

  // 2. FUNCIONES DE LA CABECERA (Header)
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('user_session');
    window.location.href = '/login';
  };

  const guardarPerfilAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
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

  const handleToggleSuperUser = async (idUsuario: string, nombreUsuario: string, rolActual: string) => {
    if (!esSuperUser) return;
    const nuevoRol = rolActual === 'superusuario' ? 'admin' : 'superusuario';
    const accion = rolActual === 'superusuario' ? 'quitarle' : 'otorgarle';
    if (!window.confirm(`¿Quiere ${accion} el rol de SUPER USUARIO a "${nombreUsuario}"?`)) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('directorio_operativo').update({ rol: nuevoRol }).eq('id', idUsuario);
      if (error) throw error;
      alert(`Privilegios actualizados.`);
      fetchAdmins();
    } catch (error: any) { alert("Error: " + error.message); } finally { setLoading(false); }
  };

  const handleEliminarAdmin = async (idAEliminar: string, nombreAdmin: string) => {
    if (idAEliminar === adminUser?.id) { alert("No puedes eliminarte a ti mismo."); return; }
    if (!window.confirm(`¿Seguro que deseas eliminar al administrador "${nombreAdmin}"?`)) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('directorio_operativo').delete().eq('id', idAEliminar);
      if (error) throw error;
      alert(`Eliminado correctamente.`);
      fetchAdmins(); 
    } catch (error: any) { alert("Error: " + error.message); } finally { setLoading(false); }
  };

  if (verificando) return <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5]"><p className="text-xl font-bold text-gray-700 animate-pulse">Verificando Credenciales de Seguridad...</p></div>;

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      
      {/* ==========================================
          CABECERA GLOBAL
          ========================================== */}
      <div className="max-w-screen-2xl mx-auto p-6 pb-0">
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
                <Link href="/registro-admin" title="Registrar Nuevo Administrador" className="bg-blue-100 text-[#00529b] p-2 rounded-xl text-sm font-bold hover:bg-blue-200 transition-all shadow-sm">
                  <UserPlus size={18} />
                </Link>
              )}
              
              {esSuperUser && (
                <button onClick={() => setMostrarModalEliminarAdmin(true)} title="Gestionar Administradores" className="bg-red-50 text-red-600 p-2 rounded-xl text-sm font-bold hover:bg-red-100 transition-all shadow-sm">
                  <UserMinus size={18} />
                </button>
              )}

              <div className="w-px h-6 bg-gray-300 mx-1"></div>
              
              <button onClick={() => { 
                  setFormAdmin({ 
                    nombre_apellido_jefe: adminUser.nombre_apellido_jefe || '', 
                    telefono_celular_jefe: adminUser.telefono_celular_jefe || '',
                    cedula: adminUser.cedula || '', grado_jerarquia: adminUser.grado_jerarquia || '',
                    email: adminUser.email || '', codigo_situr: adminUser.codigo_situr || ''
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

        {/* ==========================================
            CONTENIDO DINÁMICO DE PESTAÑAS (LOS COMPONENTES)
            ========================================== */}
        <div className="bg-white p-6 rounded-3xl shadow-xl w-full">
          {activeTab === 'directorio' && <TabDirectorio adminUser={adminUser} esSuperUser={esSuperUser} isReadOnlyVen911={isReadOnlyVen911} />}
          {activeTab === 'incidencias' && <TabIncidencias adminUser={adminUser} esSuperUser={esSuperUser} isReadOnlyVen911={isReadOnlyVen911} />}
          {activeTab === 'reportes' && <TabReportes adminUser={adminUser} esSuperUser={esSuperUser} isReadOnlyVen911={isReadOnlyVen911} />}
          {activeTab === 'catalogos' && esSuperUser && <TabCatalogos adminUser={adminUser} />}
        </div>
      </div>

      {/* ==========================================
          MODALES GLOBALES DE LA CABECERA
          ========================================== */}
      
      {/* Modal Editar Perfil Propio */}
      {mostrarModalAdmin && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] animate-fade-in backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-[2rem] p-8 max-w-3xl w-full shadow-2xl border my-8">
            <h3 className="text-2xl font-black text-gray-800 mb-6 border-b pb-4">Editar Mi Perfil</h3>
            <form onSubmit={guardarPerfilAdmin} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <div className="space-y-4">
                <div><label className="text-xs font-bold text-gray-500 mb-1 block">Nombre completo</label><input required className="w-full p-3 border rounded-xl bg-white" value={formAdmin.nombre_apellido_jefe} onChange={e => setFormAdmin({...formAdmin, nombre_apellido_jefe: e.target.value})} /></div>
                <div><label className="text-xs font-bold text-gray-500 mb-1 block">Cédula</label><input required type="text" maxLength={10} className="w-full p-3 border rounded-xl bg-white" value={formAdmin.cedula} onChange={e => setFormAdmin({...formAdmin, cedula: e.target.value.replace(/\D/g, '')})} /></div>
                <div><label className="text-xs font-bold text-gray-500 mb-1 block">Cargo / Grado</label><input required className="w-full p-3 border rounded-xl bg-white" value={formAdmin.grado_jerarquia} onChange={e => setFormAdmin({...formAdmin, grado_jerarquia: e.target.value})} /></div>
              </div>
              <div className="space-y-4">
                <div><label className="text-xs font-bold text-gray-500 mb-1 block">Correo Electrónico Oficial</label><input required type="email" readOnly={!esSuperUser} className={`w-full p-3 border rounded-xl ${esSuperUser ? 'bg-white' : 'bg-gray-100 text-gray-500'}`} value={formAdmin.email} onChange={e => setFormAdmin({...formAdmin, email: e.target.value})} /></div>
                <div><label className="text-xs font-bold text-gray-500 mb-1 block">Teléfono Celular</label><input required type="text" maxLength={11} className="w-full p-3 border rounded-xl bg-white" value={formAdmin.telefono_celular_jefe} onChange={e => setFormAdmin({...formAdmin, telefono_celular_jefe: e.target.value.replace(/\D/g, '')})} /></div>
                <div>
                  <label className="text-xs font-bold text-[#00529b] mb-1 block">Contraseña Maestra</label>
                  <input required type="text" minLength={6} readOnly={!esSuperUser} className={`w-full p-3 border-2 border-[#00529b] rounded-xl font-bold ${esSuperUser ? 'bg-blue-50' : 'bg-gray-100 text-gray-500'}`} value={formAdmin.codigo_situr} onChange={e => setFormAdmin({...formAdmin, codigo_situr: e.target.value})} />
                </div>
              </div>
              <div className="col-span-full flex flex-col sm:flex-row gap-3 pt-6 border-t mt-4">
                <button type="button" onClick={() => setMostrarModalAdmin(false)} className="flex-1 bg-gray-200 text-gray-700 p-4 rounded-xl font-bold hover:bg-gray-300 transition-all text-center">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 bg-[#00529b] text-white p-4 rounded-xl font-bold shadow-md">{loading ? 'Guardando...' : 'Guardar Cambios'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gestión de Administradores (Superusuario) */}
      {mostrarModalEliminarAdmin && esSuperUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border">
            <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-3 flex justify-between">
              <span className="flex items-center gap-2"><Settings className="text-[#00529b]" /> Gestión de Administradores</span>
              <div className="relative w-64">
                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                <input type="text" placeholder="Buscar admin..." className="w-full pl-9 pr-3 py-2 bg-gray-100 border-none rounded-xl text-sm outline-none" value={busquedaAdmin} onChange={(e) => setBusquedaAdmin(e.target.value)} />
              </div>
            </h3>
            <div className="max-h-[60vh] overflow-y-auto space-y-2 mb-4 pr-2">
              {listaAdmins.filter(admin => (admin.nombre_apellido_jefe || '').toLowerCase().includes(busquedaAdmin.toLowerCase())).map(admin => (
                <div key={admin.id} className={`flex flex-col p-3 rounded-xl border ${admin.rol === 'superusuario' ? 'bg-amber-50 border-amber-200' : 'bg-gray-50'}`}>
                  {(!admin.organismo_responsable || admin.organismo_responsable.trim() === '') && (
                    <div className="mb-2 bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded-md flex gap-1"><AlertCircle size={12} /> SIN ORGANISMO ASIGNADO.</div>
                  )}
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col flex-1 pr-2">
                      <span className="font-bold text-sm text-gray-800">{admin.nombre_apellido_jefe}</span>
                      <span className="text-[10px] font-bold text-gray-500 uppercase">{admin.organismo_responsable || 'SIN ORGANISMO'}</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      {admin.organismo_responsable === 'VEN 911' && (
                        <button onClick={() => handleToggleSuperUser(admin.id, admin.nombre_apellido_jefe, admin.rol)} className={`p-2 rounded-lg border ${admin.rol === 'superusuario' ? 'bg-amber-500 text-white border-amber-600' : 'bg-white text-gray-400'}`}><Star size={16} className={admin.rol === 'superusuario' ? 'fill-current' : ''} /></button>
                      )}
                      {admin.id === adminUser?.id ? (
                        <span className="text-[10px] font-bold text-[#00529b] bg-blue-100 px-3 py-2 rounded-lg">Tú</span>
                      ) : (
                        <button onClick={() => handleEliminarAdmin(admin.id, admin.nombre_apellido_jefe)} className="bg-white border border-red-200 text-red-600 p-2 rounded-lg hover:bg-red-50"><Trash2 size={16} /></button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setMostrarModalEliminarAdmin(false)} className="w-full bg-gray-200 text-gray-700 p-3 rounded-xl font-bold">Cerrar Panel</button>
          </div>
        </div>
      )}
      
    </div>
  );
}
