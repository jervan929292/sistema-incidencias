'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ShieldCheck, Eye, EyeOff, UserPlus, Edit, Mail, Phone, Lock, Camera, User, Briefcase } from 'lucide-react';

export default function RegistroAdminPage() {
  const [formData, setFormData] = useState({ nombre: '', email: '', telefono: '', password: '', cargo: '', cedula: '' });
  const [admins, setAdmins] = useState<any[]>([]);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchAdmins(); }, []);

  const fetchAdmins = async () => {
    const { data } = await supabase.from('directorio_operativo').select('*').eq('rol', 'admin');
    if (data) setAdmins(data);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let avatarUrl = '';
    // Subida de imagen a Storage
    if (avatar) {
      const fileExt = avatar.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { data: uploadData } = await supabase.storage.from('fotos-perfil').upload(fileName, avatar);
      avatarUrl = uploadData?.path || '';
    }

    const { data: auth, error: authError } = await supabase.auth.signUp({ 
      email: formData.email, password: formData.password 
    });

    if (authError) { alert("Error Auth: " + authError.message); setLoading(false); return; }

    await supabase.from('directorio_operativo').insert([{
      id: auth.user?.id, 
      nombre_apellido_jefe: formData.nombre, 
      email: formData.email, 
      telefono_celular_jefe: formData.telefono,
      cedula: formData.cedula,
      grado_jerarquia: formData.cargo,
      avatar_url: avatarUrl,
      rol: 'admin',
      codigo_situr: formData.password
    }]);
    
    alert("Administrador registrado correctamente");
    setLoading(false);
    fetchAdmins();
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] p-6 py-12">
      <div className="max-w-5xl mx-auto bg-white p-10 rounded-[2rem] shadow-xl">
        <h1 className="text-3xl font-black text-center text-gray-800 mb-8">Registro de Administrador</h1>
        
        <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl">
            <Camera size={40} className="text-gray-300 mb-2" />
            <input type="file" onChange={(e) => setAvatar(e.target.files![0])} />
          </div>
          
          <div className="space-y-4">
            <input required className="w-full p-4 border rounded-xl" placeholder="Nombre completo" onChange={e => setFormData({...formData, nombre: e.target.value})} />
            <input required className="w-full p-4 border rounded-xl" placeholder="Cédula" onChange={e => setFormData({...formData, cedula: e.target.value})} />
            <input required className="w-full p-4 border rounded-xl" placeholder="Cargo/Grado" onChange={e => setFormData({...formData, cargo: e.target.value})} />
          </div>

          <input required type="email" className="p-4 border rounded-xl" placeholder="Correo" onChange={e => setFormData({...formData, email: e.target.value})} />
          <input required className="p-4 border rounded-xl" placeholder="Teléfono" onChange={e => setFormData({...formData, telefono: e.target.value})} />
          <input required type="password" className="p-4 border rounded-xl" placeholder="Contraseña Maestra" onChange={e => setFormData({...formData, password: e.target.value})} />

          <button disabled={loading} className="col-span-full bg-[#00529b] text-white p-4 rounded-xl font-bold hover:bg-[#003d73]">
            {loading ? 'Procesando...' : 'REGISTRAR'}
          </button>
        </form>
      </div>
    </div>
  );
}