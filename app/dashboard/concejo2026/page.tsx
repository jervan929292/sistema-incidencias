'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { School, UserCheck, Package, Save, Shield, MapPin, Flag, MessageSquare, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ConcejoTerritorialPage() {
  const [jefe, setJefe] = useState<any>(null);
  const [escuelas, setEscuelas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardandoId, setGuardandoId] = useState<number | null>(null);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userData } = await supabase
          .from('directorio_operativo')
          .select('*')
          .eq('id', user.id)
          .single();

        if (userData) {
          setJefe(userData);
          
          const { data: centros } = await supabase
            .from('centros_votacion_2026')
            .select('*')
            .eq('CODIGO_CIRCUITO_COMUNAL', userData.codigo_situr);

          const { data: reportesExistentes } = await supabase
            .from('reportes_concejo_2026')
            .select('*')
            .eq('codigo_situr', userData.codigo_situr);

          if (centros) {
            // ¡AQUÍ ESTÁ LA MAGIA QUE ELIMINA LOS DUPLICADOS!
            // Agrupamos las escuelas por su Código CNE para que no se repitan por culpa de las mesas
            const centrosUnicosMap = new Map();
            centros.forEach(c => {
              if (!centrosUnicosMap.has(c.COD_CENTRO)) {
                centrosUnicosMap.set(c.COD_CENTRO, c);
              }
            });
            const centrosUnicos = Array.from(centrosUnicosMap.values());

            // Unimos la escuela (ya sin repetir) con su reporte si ya existe
            const centrosConReportes = centrosUnicos.map(c => {
              const rep = reportesExistentes?.find(r => r.cod_centro === c.COD_CENTRO) || {};
              return { ...c, ...rep };
            });
            
            setEscuelas(centrosConReportes);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    cargarDatos();
  }, []);

  const handleInputChange = (id: number, campo: string, valor: string) => {
    setEscuelas(prev => prev.map(esc => esc.id === id ? { ...esc, [campo]: valor } : esc));
  };

  const guardarCambiosCentro = async (escuela: any) => {
    setGuardandoId(escuela.id);
    try {
      const { error } = await supabase
        .from('reportes_concejo_2026')
        .upsert({
          cod_centro: escuela.COD_CENTRO,
          codigo_situr: jefe.codigo_situr,
          coord_centro_votacion: escuela.coord_centro_votacion || '',
          presidenta_centro: escuela.presidenta_centro || '',
          presidenta_mesa: escuela.presidenta_mesa || '',
          secretaria: escuela.secretaria || '',
          entrega_cotillon: escuela.entrega_cotillon || 'PENDIENTE',
          toma_centro: escuela.toma_centro || 'PENDIENTE',
          instalacion_mesas: escuela.instalacion_mesas || 'PENDIENTE',
          apertura: escuela.apertura || 'PENDIENTE',
          cierre_mesas: escuela.cierre_mesas || 'PENDIENTE',
          resena: escuela.resena || '',
          observaciones: escuela.observaciones || '',
          fecha_reporte: new Date().toISOString()
        }, { onConflict: 'cod_centro' });

      if (error) throw error;
      alert(`Reporte operativo de "${escuela['NOMBRE CENTRO']}" enviado correctamente.`);
    } catch (err: any) {
      alert("Error al guardar: " + err.message);
    } finally {
      setGuardandoId(null);
    }
  };

  if (loading) return <div className="p-8 text-center font-bold animate-pulse text-[#00529b]">Sincronizando centros operativos...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        
        {/* BOTÓN VOLVER */}
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-[#00529b] font-bold text-xs uppercase bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200 transition-colors w-fit">
          <ArrowLeft size={16} /> Volver al Dashboard Principal
        </Link>

        {/* Ficha Completa del Funcionario */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-l-[#00529b]">
          <div className="space-y-3">
            <h1 className="text-xl font-black text-[#00529b] uppercase">Reporte Operativo Electoral</h1>
            <div className="flex flex-col gap-1.5 text-xs text-gray-700 font-bold uppercase">
              <p className="flex items-center gap-2"><Shield size={16} className="text-amber-500" /> Organismo: <span className="text-gray-900">{jefe?.organismo_responsable || 'NO REGISTRADO'}</span></p>
              <p className="flex items-center gap-2"><UserCheck size={16} className="text-blue-500" /> Responsable: <span className="text-gray-900">{jefe?.grado_jerarquia} {jefe?.nombre_apellido_jefe}</span></p>
              <p className="flex items-center gap-2"><MapPin size={16} className="text-emerald-500" /> Ubicación: <span className="text-gray-900">{jefe?.municipio} - {jefe?.parroquia}</span></p>
            </div>
            <div className="inline-block bg-gray-100 text-gray-800 text-xs px-3 py-1 rounded-md font-black border uppercase">
              Circuito: {jefe?.comuna_o_circuito_comunal || 'N/A'}
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 px-6 py-4 rounded-xl flex flex-col items-center shadow-inner">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Llave SITUR</span>
            <span className="text-2xl font-mono font-black text-[#00529b]">{jefe?.codigo_situr}</span>
          </div>
        </div>

        {/* Lista de Escuelas */}
        <div className="space-y-4">
          {escuelas.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border text-center flex flex-col items-center justify-center text-gray-400">
              <School size={48} className="mb-4 opacity-20" />
              <p className="font-bold text-lg">Sin Centros Asignados</p>
              <p className="text-sm mt-1">No hay centros de votación vinculados a tu Código SITUR.</p>
            </div>
          ) : (
            escuelas.map((esc, index) => (
              <div key={esc.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col gap-6 hover:shadow-md transition-shadow relative overflow-hidden">
                
                <div className="absolute top-0 right-0 bg-[#00529b] text-white text-[10px] font-black px-3 py-1 rounded-bl-xl">CENTRO {index + 1} DE {escuelas.length}</div>

                <div className="border-b pb-4">
                  <div className="flex items-center gap-2 text-[#00529b] mb-1">
                    <School size={20} />
                    <span className="text-xs font-black">CNE: {esc.COD_CENTRO}</span>
                  </div>
                  <h3 className="text-base font-black text-gray-800 uppercase">{esc['NOMBRE CENTRO']}</h3>
                  <p className="text-xs text-gray-500 font-medium">{esc.DIRECCION}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <h4 className="text-[11px] font-black text-[#00529b] uppercase flex items-center gap-1.5"><UserCheck size={14}/> Autoridades del Centro</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Coord. de Centro</label><input type="text" className="w-full p-2 border rounded-lg text-xs" value={esc.coord_centro_votacion || ''} onChange={e => handleInputChange(esc.id, 'coord_centro_votacion', e.target.value)} /></div>
                      <div><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Presidente Centro</label><input type="text" className="w-full p-2 border rounded-lg text-xs" value={esc.presidenta_centro || ''} onChange={e => handleInputChange(esc.id, 'presidenta_centro', e.target.value)} /></div>
                      <div><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Pdte. Mesa 1</label><input type="text" className="w-full p-2 border rounded-lg text-xs" value={esc.presidenta_mesa || ''} onChange={e => handleInputChange(esc.id, 'presidenta_mesa', e.target.value)} /></div>
                      <div><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Secretario</label><input type="text" className="w-full p-2 border rounded-lg text-xs" value={esc.secretaria || ''} onChange={e => handleInputChange(esc.id, 'secretaria', e.target.value)} /></div>
                    </div>
                  </div>

                  <div className="space-y-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                    <h4 className="text-[11px] font-black text-[#00529b] uppercase flex items-center gap-1.5"><Flag size={14}/> Fases del Evento Electoral</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Toma de Centro</label><select value={esc.toma_centro || 'PENDIENTE'} onChange={e => handleInputChange(esc.id, 'toma_centro', e.target.value)} className="w-full p-2 border rounded-lg text-xs font-bold bg-white"><option value="PENDIENTE">PENDIENTE</option><option value="REALIZADA">REALIZADA</option></select></div>
                      <div><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Cotillón Electoral</label><select value={esc.entrega_cotillon || 'PENDIENTE'} onChange={e => handleInputChange(esc.id, 'entrega_cotillon', e.target.value)} className="w-full p-2 border rounded-lg text-xs font-bold bg-white"><option value="PENDIENTE">PENDIENTE</option><option value="RECIBIDO">RECIBIDO</option></select></div>
                      <div><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Instalación Mesas</label><select value={esc.instalacion_mesas || 'PENDIENTE'} onChange={e => handleInputChange(esc.id, 'instalacion_mesas', e.target.value)} className="w-full p-2 border rounded-lg text-xs font-bold bg-white"><option value="PENDIENTE">PENDIENTE</option><option value="REALIZADA">REALIZADA</option></select></div>
                      <div><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Apertura</label><select value={esc.apertura || 'PENDIENTE'} onChange={e => handleInputChange(esc.id, 'apertura', e.target.value)} className="w-full p-2 border rounded-lg text-xs font-bold bg-white"><option value="PENDIENTE">PENDIENTE</option><option value="REALIZADA">REALIZADA</option></select></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 bg-amber-50/30 p-4 rounded-xl border border-amber-100">
                  <h4 className="text-[11px] font-black text-amber-700 uppercase flex items-center gap-1.5"><MessageSquare size={14}/> Reseña y Observaciones</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <textarea placeholder="Reseña del evento..." className="w-full p-3 border rounded-lg text-xs bg-white h-20 resize-none" value={esc.resena || ''} onChange={e => handleInputChange(esc.id, 'resena', e.target.value)} />
                    <textarea placeholder="Observaciones (Novedades, incidencias, faltas...)" className="w-full p-3 border rounded-lg text-xs bg-white h-20 resize-none" value={esc.observaciones || ''} onChange={e => handleInputChange(esc.id, 'observaciones', e.target.value)} />
                  </div>
                </div>

                <div className="flex justify-between items-center border-t pt-4">
                  <div>
                    <label className="block text-[10px] font-bold text-red-600 uppercase mb-1">Cierre Final</label>
                    <select value={esc.cierre_mesas || 'PENDIENTE'} onChange={e => handleInputChange(esc.id, 'cierre_mesas', e.target.value)} className="p-2 border border-red-200 rounded-lg text-xs font-black bg-red-50 text-red-700"><option value="PENDIENTE">PENDIENTE</option><option value="CERRADO">CENTRO CERRADO</option></select>
                  </div>
                  <button onClick={() => guardarCambiosCentro(esc)} disabled={guardandoId === esc.id} className="bg-[#00529b] hover:bg-[#003d73] text-white px-8 py-3 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-md disabled:bg-gray-400">
                    <Save size={16} />{guardandoId === esc.id ? 'Sincronizando...' : 'ENVIAR REPORTE AL VEN 911'}
                  </button>
                </div>

              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}