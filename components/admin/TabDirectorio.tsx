// Archivo: components/admin/TabDirectorio.tsx
import React from 'react';
import { SquarePen, FileSpreadsheet, UserPlus, UserMinus } from 'lucide-react';

export default function TabDirectorio({ 
  usuariosFiltrados, esSuperUser, isReadOnlyVen911, loading, 
  selectedIds, onSelectOne, onAbrirEditar, onDeleteSelected, 
  onDescargar, onToggleForm, mostrarFormulario 
}: any) {
  
  return (
    <div className="animate-fade-in w-full">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">
          Gestión de Usuarios <span className="bg-blue-100 text-blue-800 text-sm font-bold px-3 py-1 rounded-full">{usuariosFiltrados?.length || 0}</span>
        </h2>
        
        <div className="flex flex-wrap gap-3 justify-end">
          {selectedIds.length > 0 && !isReadOnlyVen911 && (
            <button onClick={onDeleteSelected} disabled={loading} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-red-700 transition-all">
              🗑️ Eliminar ({selectedIds.length})
            </button>
          )}
          {esSuperUser && (
            <button onClick={onDescargar} className="bg-emerald-600 text-white px-5 py-3 rounded-xl font-bold shadow-md hover:bg-emerald-700 transition-all flex items-center gap-2">
              <FileSpreadsheet size={18} /> DESCARGAR CREDENCIALES
            </button>
          )}
          {!isReadOnlyVen911 && (
            <button onClick={onToggleForm} className="bg-gray-800 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-gray-700 transition-all">
              {mostrarFormulario ? '- CERRAR FORMULARIO' : '+ AGREGAR MANUAL'}
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-auto max-h-[65vh] rounded-xl border border-gray-200 w-full shadow-inner relative">
        <table className="w-full min-w-max text-left bg-white text-xs">
          <thead className="text-gray-700 uppercase tracking-wider text-[10px]">
            <tr>
              {!isReadOnlyVen911 && <th className="p-2 sticky left-0 top-0 bg-gray-200 z-10 w-10 text-center">Sel</th>}
              {!isReadOnlyVen911 && <th className="p-2 sticky left-10 top-0 bg-gray-200 z-10 w-12">Edit</th>}
              <th className="p-2">Ubicación</th>
              <th className="p-2">SITUR</th>
              <th className="p-2">Circuito</th>
              <th className="p-2">Jefe</th>
              <th className="p-2">Organismo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {usuariosFiltrados.map((u: any) => (
              <tr key={u.id} className="hover:bg-gray-50">
                {!isReadOnlyVen911 && <td className="p-2 text-center sticky left-0 bg-white"><input type="checkbox" onChange={() => onSelectOne(u.id)} /></td>}
                {!isReadOnlyVen911 && <td className="p-2 sticky left-10 bg-white"><button onClick={() => onAbrirEditar(u)} className="bg-amber-500 text-white px-2 py-1 rounded"><SquarePen size={14}/></button></td>}
                <td className="p-2">{u.municipio} - {u.parroquia}</td>
                <td className="p-2 font-bold text-amber-700">{u.codigo_situr}</td>
                <td className="p-2">{u.comuna_o_circuito_comunal}</td>
                <td className="p-2">{u.nombre_apellido_jefe}</td>
                <td className="p-2">{u.organismo_responsable}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}