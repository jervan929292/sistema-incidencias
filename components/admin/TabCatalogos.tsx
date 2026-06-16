'use client';
import React from 'react';
import { Settings, Plus, Edit3, Trash2 } from 'lucide-react';

export default function TabCatalogos(props: any) {
  return (
    <div className="animate-fade-in w-full space-y-6">
      <div className="bg-white p-6 rounded-2xl mb-6 border flex items-center gap-4">
        <div className="bg-slate-100 p-3 rounded-xl"><Settings className="text-slate-600" size={28}/></div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Ajustes de Incidencias</h2>
          <p className="text-sm text-gray-500">Gestión de catálogos institucionales</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Clasificación */}
        <div className="bg-white border rounded-3xl shadow-sm flex flex-col">
          <div className="bg-[#00529b] text-white p-4 font-bold rounded-t-3xl">1. CLASIFICACIÓN</div>
          <div className="p-4 border-b flex gap-2">
            <input className="w-full text-sm p-2 border rounded-lg" placeholder="Nueva clasificación..." value={props.newClasName} onChange={e => props.setNewClasName(e.target.value)} />
            <button onClick={() => props.onAgregar('catalogo_clasificacion', props.newClasName, props.setNewClasName)} className="bg-[#00529b] text-white p-2 rounded-lg"><Plus size={20}/></button>
          </div>
          <div className="p-2 space-y-1">
            {props.catClasificacion.map((c: any) => (
              <div key={c.id} onClick={() => { props.setSelectedClasId(c.id); props.setSelectedIncId(''); }} className={`flex justify-between p-3 rounded-xl cursor-pointer ${props.selectedClasId === c.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                <span className="text-xs font-bold">{c.nombre}</span>
                <div className="flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); props.onEditar('catalogo_clasificacion', c.id, c.nombre); }} className="text-amber-600"><Edit3 size={14}/></button>
                  <button onClick={(e) => { e.stopPropagation(); props.onEliminar('catalogo_clasificacion', c.id); }} className="text-red-600"><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Columna Incidencia */}
        <div className={`bg-white border rounded-3xl shadow-sm flex flex-col ${!props.selectedClasId ? 'opacity-50' : ''}`}>
          <div className="bg-amber-500 text-white p-4 font-bold rounded-t-3xl">2. INCIDENCIA</div>
          <div className="p-4 border-b flex gap-2">
            <input disabled={!props.selectedClasId} className="w-full text-sm p-2 border rounded-lg" placeholder="Nueva incidencia..." value={props.newIncName} onChange={e => props.setNewIncName(e.target.value)} />
            <button disabled={!props.selectedClasId} onClick={() => props.onAgregar('catalogo_incidencia', {nombre: props.newIncName, clasificacion_id: props.selectedClasId}, props.setNewIncName)} className="bg-amber-500 text-white p-2 rounded-lg"><Plus size={20}/></button>
          </div>
          <div className="p-2 space-y-1">
            {props.catIncidencia.filter((i: any) => i.clasificacion_id === props.selectedClasId).map((inc: any) => (
              <div key={inc.id} onClick={() => props.setSelectedIncId(inc.id)} className={`flex justify-between p-3 rounded-xl cursor-pointer ${props.selectedIncId === inc.id ? 'bg-amber-50' : 'hover:bg-gray-50'}`}>
                <span className="text-xs font-bold">{inc.nombre}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Columna Actividad */}
        <div className={`bg-white border rounded-3xl shadow-sm flex flex-col ${!props.selectedIncId ? 'opacity-50' : ''}`}>
           <div className="bg-emerald-600 text-white p-4 font-bold rounded-t-3xl">3. ACTIVIDAD</div>
           <div className="p-4 border-b flex gap-2">
            <input disabled={!props.selectedIncId} className="w-full text-sm p-2 border rounded-lg" placeholder="Nueva actividad..." value={props.newActName} onChange={e => props.setNewActName(e.target.value)} />
            <button disabled={!props.selectedIncId} onClick={() => props.onAgregar('catalogo_actividad', {nombre: props.newActName, incidencia_id: props.selectedIncId}, props.setNewActName)} className="bg-emerald-600 text-white p-2 rounded-lg"><Plus size={20}/></button>
           </div>
        </div>
      </div>
    </div>
  );
}