'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { School, UserCheck, Save, Shield, MapPin, MessageSquare, ArrowLeft, CheckCircle2, Circle, Plus, Clock, SearchCheck } from 'lucide-react';
import Link from 'next/link';

export default function ConcejoTerritorialPage() {
  const [jefe, setJefe] = useState<any>(null);
  const [escuelas, setEscuelas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardandoId, setGuardandoId] = useState<number | null>(null);
  
  // Estado local temporal para la nueva reseña de la bitácora
  const [entradasResena, setEntradasResena] = useState<{[key: string]: string}>({});

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
            // Agrupamos las escuelas por Código CNE para evaluar la infraestructura una sola vez
            const centrosUnicosMap = new Map();
            centros.forEach((c: any) => {
              if (!centrosUnicosMap.has(c.COD_CENTRO)) {
                centrosUnicosMap.set(c.COD_CENTRO, c);
              }
            });
            const centrosUnicos = Array.from(centrosUnicosMap.values());

            const centrosConReportes = centrosUnicos.map((c: any) => {
              const rep = reportesExistentes?.find((r: any) => r.cod_centro === c.COD_CENTRO) || {};
              return { 
                ...c, 
                ...rep,
                escuela_apta: rep.escuela_apta || 'PENDIENTE',
                responsable_inspeccion: rep.responsable_inspeccion || '',
                organismos_presentes: rep.organismos_presentes || '',
                cierre_mesas: rep.cierre_mesas || 'PENDIENTE' // Usamos esta columna nativa como flag de "Inspección Finalizada"
              };
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

  const agregarEntradaBitacora = async (escuela: any) => {
    const textoNota = entradasResena[escuela.COD_CENTRO]?.trim();
    if (!textoNota) return;

    const ahora = new Date();
    const horaFormateada = ahora.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true });
    const fechaFormateada = ahora.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit' });
    const estampa = `[${fechaFormateada} - ${horaFormateada}]`;

    const nuevaLinea = `${estampa} ${textoNota}`;
    
    const bitacoraActualizada = escuela.resena 
      ? `${escuela.resena}\n${nuevaLinea}`
      : nuevaLinea;

    setEscuelas(prev => prev.map(esc => esc.COD_CENTRO === escuela.COD_CENTRO ? { ...esc, resena: bitacoraActualizada } : esc));
    setEntradasResena(prev => ({ ...prev, [escuela.COD_CENTRO]: '' }));

    try {
      await supabase
        .from('reportes_concejo_2026')
        .upsert({
          cod_centro: escuela.COD_CENTRO,
          codigo_situr: jefe.codigo_situr,
          resena: bitacoraActualizada,
          fecha_reporte: ahora.toISOString()
        }, { onConflict: 'cod_centro' });
    } catch (err) {
      console.error("Error en auto-guardado de bitácora:", err);
    }
  };

  const guardarCambiosCentro = async (escuela: any, esCierreFinal = false) => {
    setGuardandoId(escuela.id);
    try {
      const { error } = await supabase
        .from('reportes_concejo_2026')
        .upsert({
          cod_centro: escuela.COD_CENTRO,
          codigo_situr: jefe.codigo_situr,
          // ÚNICOS PUNTOS A EVALUAR EN EL SISTEMA
          escuela_apta: escuela.escuela_apta,
          responsable_inspeccion: escuela.responsable_inspeccion || '',
          organismos_presentes: escuela.organismos_presentes || '',
          resena: escuela.resena || '',
          cierre_mesas: esCierreFinal ? 'CERRADO' : escuela.cierre_mesas, // Bloquea o desbloquea la edición
          fecha_reporte: new Date().toISOString()
        }, { onConflict: 'cod_centro' });

      if (error) throw error;
      
      if (esCierreFinal) {
        alert(`INSPECCIÓN FINALIZADA: El reporte de la escuela "${escuela['NOMBRE CENTRO']}" ha sido cerrado y enviado con éxito al VEN 911.`);
        window.location.reload();
      } else {
        alert(`Cambios de "${escuela['NOMBRE CENTRO']}" guardados en el sistema.`);
      }
    } catch (err: any) {
      alert("Error al guardar: " + err.message);
    } finally {
      setGuardandoId(null);
    }
  };

  if (loading) return <div className="p-8 text-center font-bold animate-pulse text-[#00529b]">Sincronizando escuelas asignadas...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-[#00529b] font-bold text-xs uppercase bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200 transition-colors w-fit">
          <ArrowLeft size={16} /> Volver al Menú Principal
        </Link>

        {/* Ficha del Funcionario */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-l-[#00529b]">
          <div className="space-y-3">
            <h1 className="text-xl font-black text-[#00529b] uppercase">Inspección de Infraestructura Escolar</h1>
            <div className="flex flex-col gap-1.5 text-xs text-gray-700 font-bold uppercase">
              <p className="flex items-center gap-2"><Shield size={16} className="text-amber-500" /> Organismo Evaluador: <span className="text-gray-900">{jefe?.organismo_responsable || 'NO REGISTRADO'}</span></p>
              <p className="flex items-center gap-2"><UserCheck size={16} className="text-blue-500" /> Funcionario: <span className="text-gray-900">{jefe?.grado_jerarquia} {jefe?.nombre_apellido_jefe}</span></p>
              <p className="flex items-center gap-2"><MapPin size={16} className="text-emerald-500" /> Jurisdicción: <span className="text-gray-900">{jefe?.municipio} - {jefe?.parroquia}</span></p>
            </div>
            <div className="inline-block bg-gray-100 text-gray-800 text-xs px-3 py-1 rounded-md font-black border uppercase mt-1">
              Circuito Comunal: {jefe?.comuna_o_circuito_comunal || 'N/A'}
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
              <p className="font-bold text-lg">Sin Escuelas Asignadas para Inspección</p>
            </div>
          ) : (
            escuelas.map((esc, index) => {
              const estaFinalizado = esc.cierre_mesas === 'CERRADO';
              
              return (
                <div key={esc.id} className={`bg-white rounded-2xl border p-6 shadow-sm flex flex-col gap-6 relative overflow-hidden transition-all ${estaFinalizado ? 'border-emerald-300 bg-emerald-50/10' : 'border-gray-200'}`}>
                  
                  <div className={`absolute top-0 right-0 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl ${estaFinalizado ? 'bg-emerald-600' : 'bg-amber-500'}`}>
                    {estaFinalizado ? 'DIAGNÓSTICO ENVIADO' : `PLANTEL ${index + 1} DE ${escuelas.length}`}
                  </div>

                  <div className="border-b pb-4">
                    <div className="flex items-center gap-2 text-[#00529b] mb-1">
                      <School size={20} />
                      <span className="text-xs font-black">CNE: {esc.COD_CENTRO}</span>
                    </div>
                    <h3 className="text-base font-black text-gray-800 uppercase">{esc['NOMBRE CENTRO']}</h3>
                    <p className="text-xs text-gray-500 font-medium">{esc.DIRECCION}</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* CRITERIOS DE EVALUACIÓN OBLIGATORIOS */}
                    <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <h4 className="text-[11px] font-black text-[#00529b] uppercase flex items-center gap-1.5"><SearchCheck size={14}/> Formulario de Diagnóstico</h4>
                      
                      <div className="space-y-3">
                        {/* 1. ¿Escuela Apta? */}
                        <div>
                          <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">Estatus de la Infraestructura:</label>
                          <div className="flex gap-2">
                            <button 
                              type="button"
                              disabled={estaFinalizado}
                              onClick={() => handleInputChange(esc.id, 'escuela_apta', 'APTA')}
                              className={`flex-1 p-2.5 rounded-xl text-xs font-black transition-all border ${esc.escuela_apta === 'APTA' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'}`}
                            >
                              ESCUELA APTA
                            </button>
                            <button 
                              type="button"
                              disabled={estaFinalizado}
                              onClick={() => handleInputChange(esc.id, 'escuela_apta', 'NO APTA')}
                              className={`flex-1 p-2.5 rounded-xl text-xs font-black transition-all border ${esc.escuela_apta === 'NO APTA' ? 'bg-red-600 text-white border-red-600 shadow-sm' : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'}`}
                            >
                              NO APTA
                            </button>
                          </div>
                        </div>

                        {/* 2. Responsable */}
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Responsable de la Evaluación</label>
                          <input 
                            type="text" 
                            disabled={estaFinalizado} 
                            placeholder="Nombre completo y rango del evaluador..."
                            className="w-full p-2.5 border rounded-xl text-xs bg-white outline-none focus:border-blue-500 font-bold uppercase disabled:bg-gray-100" 
                            value={esc.responsable_inspeccion || ''} 
                            onChange={e => handleInputChange(esc.id, 'responsable_inspeccion', e.target.value)} 
                          />
                        </div>

                        {/* 3. Organismos Presentes */}
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Organismos Presentes en la Inspección</label>
                          <textarea 
                            disabled={estaFinalizado} 
                            placeholder="Ej: VEN 911, POLIFALCON, BRICOMILES, BOMBEROS..."
                            className="w-full p-2.5 border rounded-xl text-xs bg-white outline-none focus:border-blue-500 font-bold uppercase h-16 resize-none disabled:bg-gray-100" 
                            value={esc.organismos_presentes || ''} 
                            onChange={e => handleInputChange(esc.id, 'organismos_presentes', e.target.value)} 
                          />
                        </div>
                      </div>
                    </div>

                    {/* BITÁCORA PARA DETALLES ADICIONALES (Fallas eléctricas, agua, etc) */}
                    <div className="space-y-3 bg-amber-50/10 p-4 rounded-xl border border-amber-200">
                      <h4 className="text-[11px] font-black text-amber-800 uppercase flex items-center gap-1.5">
                        <MessageSquare size={14}/> Bitácora de Novedades y Necesidades
                      </h4>
                      
                      {!estaFinalizado && (
                        <div className="flex gap-2">
                          <textarea 
                            placeholder="Escriba aquí deficiencias (Ej: Filtración en el techo, sin servicio de agua)..." 
                            value={entradasResena[esc.COD_CENTRO] || ''} 
                            onChange={e => setEntradasResena(prev => ({ ...prev, [esc.COD_CENTRO]: e.target.value }))}
                            rows={2}
                            className="flex-grow p-2.5 border rounded-xl text-xs bg-white outline-none focus:border-amber-500 font-medium resize-none min-h-[44px]"
                          />
                          <button 
                            type="button" 
                            onClick={() => agregarEntradaBitacora(esc)}
                            className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1 text-xs uppercase shadow-sm shrink-0"
                          >
                            <Plus size={16}/> Añadir
                          </button>
                        </div>
                      )}

                      <div className="bg-white rounded-xl border p-3 min-h-[90px] max-h-40 overflow-y-auto space-y-2 divide-y divide-gray-50">
                        {esc.resena ? (
                          esc.resena.split('\n').map((linea: string, lIdx: number) => (
                            <p key={lIdx} className="text-[11px] text-gray-700 font-medium pt-1.5 first:pt-0 leading-relaxed">
                              <span className="text-[#00529b] font-mono font-bold mr-1.5 inline-flex items-center gap-0.5">
                                <Clock size={10}/> {linea.match(/\[.*?\]/)?.[0] || ''}
                              </span>
                              {linea.replace(/\[.*?\]/, '').trim()}
                            </p>
                          ))
                        ) : (
                          <p className="text-[11px] text-gray-400 italic text-center py-4">No hay novedades registradas en este plantel.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CONTROLES DE GUARDADO Y DESPACHO */}
                  <div className="flex flex-col sm:flex-row justify-end items-center border-t border-gray-200 pt-4 gap-3">
                    {!estaFinalizado ? (
                      <>
                        <button 
                          type="button"
                          disabled={guardandoId === esc.id}
                          onClick={() => guardarCambiosCentro(esc, false)}
                          className="w-full sm:w-auto px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl text-xs uppercase transition-colors"
                        >
                          Guardar Borrador
                        </button>
                        <button 
                          type="button"
                          disabled={guardandoId === esc.id}
                          onClick={() => {
                            if(confirm("¿Está seguro de finalizar? Una vez enviado, el expediente se bloqueará.")) {
                              guardarCambiosCentro(esc, true);
                            }
                          }}
                          className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs uppercase transition-colors shadow-sm flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 size={14}/> Finalizar Inspección
                        </button>
                      </>
                    ) : (
                      <span className="text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl uppercase flex items-center gap-1.5">
                        <CheckCircle2 size={16}/> Reporte Enviado Exitosamente al VEN 911
                      </span>
                    )}
                  </div>

                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
