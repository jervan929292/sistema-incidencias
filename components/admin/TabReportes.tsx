'use client';
import React from 'react';
import { Activity, ShieldCheck, Siren, Target, Award, Calendar } from 'lucide-react';

export default function TabReportes(props: any) {
  return (
    <div className="animate-fade-in w-full space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-gradient-to-r from-[#00529b] to-blue-800 p-6 rounded-2xl text-white shadow-md">
        <h2 className="text-2xl font-black tracking-wide">Centro de Inteligencia Analítica</h2>
        <div className="bg-white/10 p-3 rounded-xl flex items-center gap-3">
          <Calendar size={14} className="text-amber-400" />
          <input type="date" className="bg-transparent text-white text-xs outline-none font-bold" value={props.fechaRepDesde} onChange={e => props.setFechaRepDesde(e.target.value)} />
          <span className="text-blue-300 font-bold text-xs">HASTA</span>
          <input type="date" className="bg-transparent text-white text-xs outline-none font-bold" value={props.fechaRepHasta} onChange={e => props.setFechaRepHasta(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Despliegue General", val: props.repTotal, icon: Activity, color: "text-[#00529b]" },
          { label: "Eje Preventivo", val: props.repPreventiva, icon: ShieldCheck, color: "text-blue-600" },
          { label: "Fuerza de Patrullaje", val: props.repPatrullaje, icon: Siren, color: "text-amber-500" },
          { label: "Efectividad Operativa", val: props.repEfectividad, icon: Target, color: "text-emerald-600" }
        ].map((card, i) => (
          <div key={i} className="bg-white border rounded-2xl p-5 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase">{card.label}</p>
              <p className="text-3xl font-black text-gray-800">{card.val}</p>
            </div>
            <div className={`p-4 rounded-2xl ${card.color} bg-opacity-10`}><card.icon size={28} className={card.color} /></div>
          </div>
        ))}
      </div>

      {/* Rankings */}
      <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4 uppercase flex items-center gap-2"><Award className="text-amber-500" /> Top 5 Circuitos</h3>
        <div className="space-y-4">
          {props.topCircuitos && props.topCircuitos.map(([circuito, valor]: any, idx: number) => (
            <div key={idx} className="flex items-center gap-3">
              <span className="text-xs font-black text-gray-400 w-5">#{idx + 1}</span>
              <div className="flex-1">
                <div className="flex justify-between text-xs font-bold text-gray-700">
                  <span>{circuito}</span>
                  <span>{valor} act.</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}