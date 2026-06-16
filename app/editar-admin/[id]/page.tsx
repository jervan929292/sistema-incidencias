'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User, Phone, Shield, FileText, Save, X } from 'lucide-react';

export default function EditarAdminPage() {
  const { id } = useParams();
  const router = useRouter();
  const [admin, setAdmin] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function cargarAdmin() {
      const { data } = await supabase.from('directorio_operativo').select('*').eq('id', id).single();
      if (data) setAdmin(data);
    }
    cargarAdmin();
  }, [id]);

  const guardarCambios = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('directorio_operativo').update(admin).eq('id', id);
    if (error) alert("Error: " + error.message);
    else { alert("Datos actualizados"); router.push('/registro-admin'); }
    setLoading(false);
  };

  if (!admin) return <div>Cargando...</div>;

  return (
    <div className="min-h-screen bg-[#f0f2f5] p-6">
      <form onSubmit={guardarCambios} className="max-w-2xl mx-auto bg-white p-8 rounded-3xl shadow-lg">
        <h2 className="text-2xl font-bold mb-6">Editar Perfil: {admin.nombre_apellido_jefe}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="p-4 border rounded-lg" placeholder="Nombre" value={admin.nombre_apellido_jefe || ''} onChange={e => setAdmin({...admin, nombre_apellido_jefe: e.target.value})} />
          <input className="p-4 border rounded-lg" placeholder="Cédula" value={admin.cedula || ''} onChange={e => setAdmin({...admin, cedula: e.target.value})} />
          <input className="p-4 border rounded-lg" placeholder="Grado/Cargo" value={admin.grado_jerarquia || ''} onChange={e => setAdmin({...admin, grado_jerarquia: e.target.value})} />
          <input className="p-4 border rounded-lg" placeholder="Teléfono" value={admin.telefono_celular_jefe || ''} onChange={e => setAdmin({...admin, telefono_celular_jefe: e.target.value})} />
          <input className="p-4 border rounded-lg bg-gray-100" value={admin.email || ''} disabled />
          <input className="p-4 border rounded-lg" placeholder="Código SITUR" value={admin.codigo_situr || ''} onChange={e => setAdmin({...admin, codigo_situr: e.target.value})} />
        </div>

        <div className="flex gap-4 mt-8">
          <button type="submit" className="flex-1 bg-green-600 text-white p-4 rounded-xl font-bold">GUARDAR</button>
          <button type="button" onClick={() => router.back()} className="flex-1 bg-gray-200 p-4 rounded-xl font-bold">CANCELAR</button>
        </div>
      </form>
    </div>
  );
}