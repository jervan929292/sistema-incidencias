'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { School, UserCheck, Save, Shield, MapPin, Flag, MessageSquare, ArrowLeft, CheckCircle2, Circle, Plus, Clock } from 'lucide-react';
import Link from 'next/link';

export default function ConcejoTerritorialPage() {
  const [jefe, setJefe] = useState<any>(null);
  const [escuelas, setEscuelas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardandoId, setGuardandoId] = useState<number | null>(null);
  
  // Estado local temporal para la nueva reseña que se está escribiendo por cada escuela
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
            const centrosUnicosMap = new Map();
            centros.forEach((c: any) => {
              if (!centrosUnicosMap.has(c.COD_CENTRO)) {
                centrosUnicosMap.set(c.COD_CENTRO, c);
              }
            });
            const centrosUnicos = Array.from(centrosUnicosMap.values());

            const centrosConReportes = centrosUnicos.map((c: any) => {
              const rep = reportesExistentes?.find((r: any) => r.cod_centro === c.COD_CENTRO) || {};
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

  // FUNCIÓN PARA AGREGAR UNA NUEVA RESEÑA AUTOMATIZADA CON TIEMPO REAL
  const agregarEntradaBitacora = async (escuela: any) => {
    const textoNota = entradasResena[escuela.COD_CENTRO]?.trim();
    if (!textoNota) return;

    // Generamos la estampa de tiempo actual venezolana
    const ahora = new Date();
    const horaFormateada = ahora.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true });
    const fechaFormateada = ahora.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit' });
    const estampa = `[${fechaFormateada} - ${horaFormateada}]`;

    // Armamos la nueva línea de la bitácora
    const nuevaLinea = `${estampa} ${textoNota}`;
    
    // Si ya existen reseñas previas, las concatenamos separadas por un salto de línea
    const bitacoraActualizada = escuela.resena 
      ? `${escuela.resena}\n${nuevaLinea}`
      : nuevaLinea;

    // Actualizamos el estado de la escuela de inmediato
    setEscuelas(prev => prev.map(esc => esc.COD_CENTRO === escuela.COD_CENTRO ? { ...esc, resena: bitacoraActualizada } : esc));
    
    // Limpiamos la caja de texto del input de esa escuela
    setEntradasResena(prev => ({ ...prev, [escuela.COD_CENTRO]: '' }));

    // GUARDADO AUTOMÁTICO EN SUPABASE AL AGREGAR LA RESEÑA
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

  // GUARDADO MAESTRO AL CERRAR LA MESA O ENVIAR REPORTE COMPLETO
  const guardarCambiosCentro = async (escuela: any, esCierreFinal = false) => {
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
      
      if (esCierreFinal || escuela.cierre_mesas === 'CERRADO') {
        alert(`OPERATIVO CONCLUIDO: El centro "${escuela['NOMBRE CENTRO']}" ha sido clausurado y reportado exitosamente al VEN 911.`);
      } else {
        alert(`Datos de "${escuela['NOMBRE CENTRO']}" sincronizados.`);
      }
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
        
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-[#00529b] font-bold text-xs uppercase bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200 transition-colors w-fit">
          <ArrowLeft size={16} /> Volver al Menú Principal
        </Link>

        {/* Ficha del Funcionario */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-l-[#00529b]">
          <div className="space-y-3">
            <h1 className="text-xl font-black text-[#00529b] uppercase">Reporte Operativo Electoral</h1>
            <div className="flex flex-col gap-1.5 text-xs text-gray-700 font-bold uppercase">
              <p className="flex items-center gap-2"><Shield size={16} className="text-amber-500" /> Organismo: <span className="text-gray-900">{jefe?.organismo_responsable || 'NO REGISTRADO'}</span></p>
              <p className="flex items-center gap-2"><UserCheck size={16} className="text-blue-500" /> Responsable: <span className="text-gray-900">{jefe?.grado_jerarquia} {jefe?.nombre_apellido_jefe}</span></p>
              <p className="flex items-center gap-2"><MapPin size={16} className="text-emerald-500" /> Ubicación: <span className="text-gray-900">{jefe?.municipio} - {jefe?.parroquia}</span></p>
            </div>
            {/* EL CIRCUITO COMUNAL ESTÁ DE VUELTA AQUÍ */}
            <div className="inline-block bg-gray-100 text-gray-800 text-xs px-3 py-1 rounded-md font-black border uppercase mt-1">
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
            </div>
          ) : (
            escuelas.map((esc, index) => {
              const estaCerrado = esc.cierre_mesas === 'CERRADO';
              
              return (
                <div key={esc.id} className={`bg-white rounded-2xl border p-6 shadow-sm flex flex-col gap-6 relative overflow-hidden transition-all ${estaCerrado ? 'border-red-300 bg-red-50/10' : 'border-gray-200'}`}>
                  
                  <div className={`absolute top-0 right-0 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl ${estaCerrado ? 'bg-red-600' : 'bg-[#00529b]'}`}>
                    {estaCerrado ? 'CENTRO CLAUSURADO' : `CENTRO ${index + 1} DE ${escuelas.length}`}
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
                    <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <h4 className="text-[11px] font-black text-[#00529b] uppercase flex items-center gap-1.5"><UserCheck size={14}/> Autoridades del Centro</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Coord. de Centro</label><input type="text" disabled={estaCerrado} className="w-full p-2 border rounded-lg text-xs disabled:bg-gray-100" value={esc.coord_centro_votacion || ''} onChange={e => handleInputChange(esc.id, 'coord_centro_votacion', e.target.value)} /></div>
                        <div><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Presidente Centro</label><input type="text" disabled={estaCerrado} className="w-full p-2 border rounded-lg text-xs disabled:bg-gray-100" value={esc.presidenta_centro || ''} onChange={e => handleInputChange(esc.id, 'presidenta_centro', e.target.value)} /></div>
                        <div><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Pdte. Mesa 1</label><input type="text" disabled={estaCerrado} className="w-full p-2 border rounded-lg text-xs disabled:bg-gray-100" value={esc.presidenta_mesa || ''} onChange={e => handleInputChange(esc.id, 'presidenta_mesa', e.target.value)} /></div>
                        <div><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Secretario</label><input type="text" disabled={estaCerrado} className="w-full p-2 border rounded-lg text-xs disabled:bg-gray-100" value={esc.secretaria || ''} onChange={e => handleInputChange(esc.id, 'secretaria', e.target.value)} /></div>
                      </div>
                    </div>

                    <div className="space-y-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                      <h4 className="text-[11px] font-black text-[#00529b] uppercase flex items-center justify-between">
                        <span className="flex items-center gap-1.5"><Flag size={14}/> Fases del Evento (Checklist)</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button type="button" disabled={estaCerrado} onClick={() => handleInputChange(esc.id, 'toma_centro', esc.toma_centro === 'REALIZADA' ? 'PENDIENTE' : 'REALIZADA')} className={`w-full p-3 border rounded-xl flex items-center justify-between transition-all disabled:opacity-60 ${esc.toma_centro === 'REALIZADA' ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-sm' : 'bg-white border-gray-300 text-gray-500'}`}><span className="text-[10px] font-black uppercase">1. Toma de Centro</span>{esc.toma_centro === 'REALIZADA' ? <CheckCircle2 size={18} className="text-emerald-500"/> : <Circle size={18} className="text-gray-300"/>}</button>
                        <button type="button" disabled={estaCerrado} onClick={() => handleInputChange(esc.id, 'entrega_cotillon', esc.entrega_cotillon === 'RECIBIDO' ? 'PENDIENTE' : 'RECIBIDO')} className={`w-full p-3 border rounded-xl flex items-center justify-between transition-all disabled:opacity-60 ${esc.entrega_cotillon === 'RECIBIDO' ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-sm' : 'bg-white border-gray-300 text-gray-500'}`}><span className="text-[10px] font-black uppercase">2. Cotillón Electoral</span>{esc.entrega_cotillon === 'RECIBIDO' ? <CheckCircle2 size={18} className="text-emerald-500"/> : <Circle size={18} className="text-gray-300"/>}</button>
                        <button type="button" disabled={estaCerrado} onClick={() => handleInputChange(esc.id, 'instalacion_mesas', esc.instalacion_mesas === 'REALIZADA' ? 'PENDIENTE' : 'REALIZADA')} className={`w-full p-3 border rounded-xl flex items-center justify-between transition-all disabled:opacity-60 ${esc.instalacion_mesas === 'REALIZADA' ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-sm' : 'bg-white border-gray-300 text-gray-500'}`}><span className="text-[10px] font-black uppercase">3. Instalación Mesas</span>{esc.instalacion_mesas === 'REALIZADA' ? <CheckCircle2 size={18} className="text-emerald-500"/> : <Circle size={18} className="text-gray-300"/>}</button>
                        <button type="button" disabled={estaCerrado} onClick={() => handleInputChange(esc.id, 'apertura', esc.apertura === 'REALIZADA' ? 'PENDIENTE' : 'REALIZADA')} className={`w-full p-3 border rounded-xl flex items-center justify-between transition-all disabled:opacity-60 ${esc.apertura === 'REALIZADA' ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-sm' : 'bg-white border-gray-300 text-gray-500'}`}><span className="text-[10px] font-black uppercase">4. Apertura Centro</span>{esc.apertura === 'REALIZADA' ? <CheckCircle2 size={18} className="text-emerald-500"/> : <Circle size={18} className="text-gray-300"/>}</button>
                      </div>
                    </div>
                  </div>

                  {/* NUEVA BITÁCORA DE RESEÑAS CRONOLÓGICAS AUTOMATIZADAS */}
                  <div className="space-y-3 bg-amber-50/20 p-4 rounded-xl border border-amber-200">
                    <h4 className="text-[11px] font-black text-amber-800 uppercase flex items-center gap-1.5">
                      <MessageSquare size={14}/> Bitácora de Reseñas y Eventos 
                    </h4>
                    
                    {/* Caja para escribir nueva nota */}
                    {!estaCerrado && (
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Escribe un evento (Ej: Despliegue completado)..." 
                          value={entradasResena[esc.COD_CENTRO] || ''} 
                          onChange={e => setEntradasResena(prev => ({ ...prev, [esc.COD_CENTRO]: e.target.value }))}
                          className="flex-grow p-2.5 border rounded-xl text-xs bg-white outline-none focus:border-amber-500 font-medium"
                        />
                        <button 
                          type="button" 
                          onClick={() => agregarEntradaBitacora(esc)}
                          className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1 text-xs uppercase shadow-sm shrink-0"
                        >
                          <Plus size={16}/> Registrar
                        </button>
                      </div>
                    )}

                    {/* Línea de tiempo visual con las reseñas guardadas */}
                    <div className="bg-white rounded-xl border p-3 min-h-[60px] max-h-48 overflow-y-auto space-y-2 divide-y divide-gray-50">
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
                        <p className="text-[11px] text-gray-400 italic text-center py-3">No hay eventos registrados en la bitácora todavía.</p>
                      )}
                    </div>

                    {/* Campo de observaciones estáticas */}
                    <div className="pt-2">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Notas u Observaciones Generales</label>
                      <textarea disabled={estaCerrado} placeholder="Observaciones generales fijas (Novedades de infraestructura, faltas)..." className="w-full p-3 border rounded-lg text-xs bg-white h-16 resize-none outline-none focus:border-amber-400 disabled:bg-gray-100" value={esc.observaciones || ''} onChange={e => handleInputChange(esc.id, 'observaciones', e.target.value)} />
                    </div>
                  </div>

                  {/* SECCIÓN FINAL DE CIERRE Y BLOQUEO DEL EXPEDIENTE */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-t border-gray-200 pt-5 gap-4">
                    <div className="w-full sm:w-auto space-y-1.5">
                      <label className="block text-[10px] font-bold text-red-600 uppercase">Clausura del Centro</label>
                      <button
                        type="button"
                        onClick={() => {
                          const nuevoEstado = esc.cierre_mesas === 'CERRADO' ? 'PENDIENTE' : 'CERRADO';
                          handleInputChange(esc.id, 'cierre_mesas', nuevoEstado);
                        }}
                        className={`w-full sm:w-64 p-3 border rounded-xl flex items-center justify-between transition-all ${esc.cierre_mesas === 'CERRADO' ? 'bg-red-600 border-red-600 text-white shadow-md' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}
                      >
                        <span className="text-[10px] font-black uppercase">5. Cerrar Mesa y Centro</span>
                        <CheckCircle2 size={18} className={esc.cierre_mesas === 'CERRADO' ? 'text-white' : 'text-gray-300'}/>
                      </button>
                    </div>
                    
                    <button 
                      onClick={() => guardarCambiosCentro(esc, esc.cierre_mesas === 'CERRADO')} 
                      disabled={guardandoId === esc.id} 
                      className={`w-full sm:w-auto px-8 py-3.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md disabled:bg-gray-400 ${estaCerrado ? 'bg-red-700 hover:bg-red-800 text-white' : 'bg-[#00529b] hover:bg-[#003d73] text-white'}`}
                    >
                      <Save size={16} />
                      {guardandoId === esc.id 
                        ? 'Sincronizando...' 
                        : estaCerrado 
                          ? 'ENVIAR CIERRE DEFINITIVO AL VEN 911' 
                          : 'SINCRONIZAR AVANCE DE HOY'}
                    </button>
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