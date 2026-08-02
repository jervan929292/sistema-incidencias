'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Settings, Plus, Trash2, Edit3, ChevronRight, Loader2 } from 'lucide-react';

export default function TabCatalogos({ adminUser }: any) {
  // Estados para las listas de catálogos
  const [catClasificacion, setCatClasificacion] = useState<any[]>([]);
  const [catIncidencia, setCatIncidencia] = useState<any[]>([]);
  const [catActividad, setCatActividad] = useState<any[]>([]);

  // Estados de selección (para navegar entre las columnas)
  const [selectedClasId, setSelectedClasId] = useState<string>('');
  const [selectedIncId, setSelectedIncId] = useState<string>('');

  // Estados de los inputs para agregar nuevos
  const [newClasName, setNewClasName] = useState('');
  const [newIncName, setNewIncName] = useState('');
  const [newActName, setNewActName] = useState('');

  // Estado de carga
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchCatalogos();
  }, []);

  // Función independiente para buscar solo los datos de los catálogos
  const fetchCatalogos = async () => {
    setLoading(true);
    try {
      const [resCatClas, resCatInc, resCatAct] = await Promise.all([
        supabase.from('catalogo_clasificacion').select('*').order('nombre'),
        supabase.from('catalogo_incidencia').select('*').order('nombre'),
        supabase.from('catalogo_actividad').select('*').order('nombre')
      ]);

      if (resCatClas.data) setCatClasificacion(resCatClas.data);
      if (resCatInc.data) setCatIncidencia(resCatInc.data);
      if (resCatAct.data) setCatActividad(resCatAct.data);
    } catch (error) {
      console.error("Error al cargar catálogos:", error);
    } finally {
      setLoading(false);
    }
  };

  // Funciones de Base de Datos (Agregar, Editar, Eliminar)
  const agregarCatalogo = async (tabla: string, payload: any, setterInput: Function) => {
    if(isProcessing) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from(tabla).insert([payload]);
      if (error) throw error;
      setterInput('');
      await fetchCatalogos(); // Recargamos para ver el cambio
    } catch (err: any) { 
      alert("Error: " + err.message); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  const editarCatalogo = async (tabla: string, id: string, nombreActual: string) => {
    const nuevoNombre = window.prompt(`Corregir nombre en la base de datos:`, nombreActual);
    if (!nuevoNombre || nuevoNombre.trim() === '' || nuevoNombre === nombreActual) return;
    
    setIsProcessing(true);
    try {
      const { error } = await supabase.from(tabla).update({ nombre: nuevoNombre.trim() }).eq('id', id);
      if (error) throw error;
      await fetchCatalogos();
    } catch (err: any) { 
      alert("Error al editar: " + err.message); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  const eliminarCatalogo = async (tabla: string, id: string) => {
    if (!window.confirm("⚠️ ADVERTENCIA: ¿Estás seguro de eliminar este elemento?")) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from(tabla).delete().eq('id', id);
      if (error) throw error;
      
      // Limpiamos selecciones si borramos el elemento que estaba activo
      if (tabla === 'catalogo_clasificacion' && id === selectedClasId) { setSelectedClasId(''); setSelectedIncId(''); }
      if (tabla === 'catalogo_incidencia' && id === selectedIncId) { setSelectedIncId(''); }
      
      await fetchCatalogos();
    } catch (err: any) { 
      alert("Error al eliminar: " + err.message); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  if (loading) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-20 text-gray-500">
        <Loader2 className="animate-spin text-[#00529b] mb-4" size={48} />
        <p className="font-bold text-lg">Cargando Estructura de Catálogos...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in w-full space-y-6">
      
      {/* CABECERA */}
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
              <input 
                type="text" placeholder="Nueva clasificación..." 
                className="w-full text-sm p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#00529b]" 
                value={newClasName} onChange={e => setNewClasName(e.target.value)} 
                disabled={isProcessing}
              />
              <button 
                disabled={isProcessing || !newClasName}
                onClick={() => agregarCatalogo('catalogo_clasificacion', { nombre: newClasName.trim() }, setNewClasName)} 
                className="bg-[#00529b] text-white p-2 rounded-lg hover:bg-[#003d73] transition-colors disabled:opacity-50"
              >
                <Plus size={20}/>
              </button>
            </div>
          </div>
          <div className="max-h-[50vh] overflow-y-auto p-2 space-y-1">
            {catClasificacion.map((c) => (
              <div 
                key={c.id} 
                onClick={() => { setSelectedClasId(c.id); setSelectedIncId(''); }} 
                className={`flex justify-between items-center p-3 rounded-xl cursor-pointer border transition-all ${selectedClasId === c.id ? 'bg-blue-50 border-blue-200 shadow-inner' : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'}`}
              >
                <span className={`text-xs font-bold ${selectedClasId === c.id ? 'text-[#00529b]' : 'text-gray-600'}`}>{c.nombre}</span>
                <div className="flex gap-1 opacity-50 hover:opacity-100">
                  <button onClick={(e) => { e.stopPropagation(); editarCatalogo('catalogo_clasificacion', c.id, c.nombre); }} className="p-1.5 hover:bg-white rounded-md text-amber-600 disabled:opacity-50" disabled={isProcessing}><Edit3 size={14}/></button>
                  <button onClick={(e) => { e.stopPropagation(); eliminarCatalogo('catalogo_clasificacion', c.id); }} className="p-1.5 hover:bg-white rounded-md text-red-600 disabled:opacity-50" disabled={isProcessing}><Trash2 size={14}/></button>
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
              <input 
                disabled={!selectedClasId || isProcessing} 
                type="text" placeholder="Nueva incidencia..." 
                className="w-full text-sm p-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-100" 
                value={newIncName} onChange={e => setNewIncName(e.target.value)} 
              />
              <button 
                disabled={!selectedClasId || isProcessing || !newIncName} 
                onClick={() => agregarCatalogo('catalogo_incidencia', { nombre: newIncName.trim(), clasificacion_id: selectedClasId }, setNewIncName)} 
                className="bg-amber-500 text-white p-2 rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:bg-gray-300"
              >
                <Plus size={20}/>
              </button>
            </div>
          </div>
          <div className="max-h-[50vh] overflow-y-auto p-2 space-y-1">
            {!selectedClasId && <p className="text-xs text-center text-gray-400 py-8 font-bold uppercase tracking-wider">Selecciona una Clasificación</p>}
            {catIncidencia.filter(i => i.clasificacion_id === selectedClasId).map((inc) => (
              <div 
                key={inc.id} 
                onClick={() => setSelectedIncId(inc.id)} 
                className={`flex justify-between items-center p-3 rounded-xl cursor-pointer border transition-all ${selectedIncId === inc.id ? 'bg-amber-50 border-amber-200 shadow-inner' : 'bg-white border-transparent hover:bg-amber-50/50 hover:border-amber-100'}`}
              >
                <span className={`text-xs font-bold ${selectedIncId === inc.id ? 'text-amber-700' : 'text-gray-600'}`}>{inc.nombre}</span>
                <div className="flex gap-1 opacity-50 hover:opacity-100">
                  <button onClick={(e) => { e.stopPropagation(); editarCatalogo('catalogo_incidencia', inc.id, inc.nombre); }} className="p-1.5 hover:bg-white rounded-md text-amber-600 disabled:opacity-50" disabled={isProcessing}><Edit3 size={14}/></button>
                  <button onClick={(e) => { e.stopPropagation(); eliminarCatalogo('catalogo_incidencia', inc.id); }} className="p-1.5 hover:bg-white rounded-md text-red-600 disabled:opacity-50" disabled={isProcessing}><Trash2 size={14}/></button>
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
              <input 
                disabled={!selectedIncId || isProcessing} 
                type="text" placeholder="Nueva actividad..." 
                className="w-full text-sm p-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100" 
                value={newActName} onChange={e => setNewActName(e.target.value)} 
              />
              <button 
                disabled={!selectedIncId || isProcessing || !newActName} 
                onClick={() => agregarCatalogo('catalogo_actividad', { nombre: newActName.trim(), incidencia_id: selectedIncId }, setNewActName)} 
                className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:bg-gray-300"
              >
                <Plus size={20}/>
              </button>
            </div>
          </div>
          <div className="max-h-[50vh] overflow-y-auto p-2 space-y-1">
            {!selectedIncId && <p className="text-xs text-center text-gray-400 py-8 font-bold uppercase tracking-wider">Selecciona una Incidencia</p>}
            {catActividad.filter(a => a.incidencia_id === selectedIncId).map((act) => (
              <div key={act.id} className="flex justify-between items-center p-3 rounded-xl border border-transparent hover:bg-emerald-50 hover:border-emerald-100 transition-all group">
                <span className="text-xs font-bold text-gray-600">{act.nombre}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => editarCatalogo('catalogo_actividad', act.id, act.nombre)} className="p-1.5 hover:bg-white rounded-md text-amber-600 disabled:opacity-50" disabled={isProcessing}><Edit3 size={14}/></button>
                  <button onClick={() => eliminarCatalogo('catalogo_actividad', act.id)} className="p-1.5 hover:bg-white rounded-md text-red-600 disabled:opacity-50" disabled={isProcessing}><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
