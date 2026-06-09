'use client';
import React from 'react';
import { ShieldAlert, Eye, Activity, ShieldCheck, Siren, Target } from 'lucide-react';

export default function TabIncidencias(props: any) {
  return (
    <div className="animate-fade-in w-full space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Registradas", val: props.totalActividades, icon: Activity },
          { label: "Preventiva", val: props.totalPreventiva, icon: ShieldCheck },
          { label: "Patrullaje", val: props.totalPatrullaje, icon: Siren },
          { label: "Efectividad", val: props.totalEfectividad, icon: Target }
        ].map((card, i) => (
          <div key={i} className="bg-white border rounded-2xl p-4 flex items-center gap-4 shadow-sm">
            <div className="bg-blue-50 p-3 rounded-full text-[#00529b]"><card.icon size={28} /></div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase">{card.label}</p>
              <p className="text-2xl font-black text-gray-800">{card.val}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 p-5 rounded-2xl border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <input type="date" className="p-2 border rounded-lg" value={props.fechaDesde} onChange={e => props.setFechaDesde(e.target.value)} />
          <input type="date" className="p-2 border rounded-lg" value={props.fechaHasta} onChange={e => props.setFechaHasta(e.target.value)} />
          <select className="p-2 border rounded-lg" value={props.filtroIncidenciaMuni} onChange={e => props.setFiltroIncidenciaMuni(e.target.value)}>
            <option value="">Todos los Municipios</option>
            {props.municipiosUnicos.map((m:any) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select className="p-2 border rounded-lg" value={props.filtroIncidenciaCircuito} onChange={e => props.setFiltroIncidenciaCircuito(e.target.value)}>
            <option value="">Todos los Circuitos</option>
            {props.circuitosIncidenciaUnicos.map((c:any) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={props.onGenerarExcel} className="bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold">Excel</button>
          <button onClick={props.onGenerarPDF} className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold">PDF</button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white max-h-[50vh]">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-100 uppercase">
            <tr>
              <th className="p-3">Ver</th>
              <th className="p-3">Fecha</th>
              <th className="p-3">Circuito</th>
              <th className="p-3">Clasificación</th>
              <th className="p-3">Organismo</th>
            </tr>
          </thead>
          <tbody>
            {props.incidenciasFiltradas.map((inc: any, i: number) => (
              <tr key={i} className="border-t hover:bg-gray-50">
                <td className="p-3"><button onClick={() => props.setIncidenciaSeleccionada(inc)}><Eye size={16}/></button></td>
                <td className="p-3">{new Date(inc.fecha_registro).toLocaleString()}</td>
                <td className="p-3 font-bold">{inc.circuito_comunal}</td>
                <td className="p-3">{inc.clasificacion}</td>
                <td className="p-3">{inc.organismo_responsable || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}