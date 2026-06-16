'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function ActualizarPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const router = useRouter();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (password !== confirmPassword) {
      setErrorMsg("Las contraseñas no coinciden.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password: password });

    if (error) {
      setErrorMsg("Error al actualizar: " + error.message);
      setLoading(false);
    } else {
      setSuccessMsg("¡Contraseña actualizada con éxito! Redirigiendo...");
      setTimeout(() => router.push('/login'), 2500);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#001f3f]">
      <div className="absolute top-[-15%] right-[-10%] w-96 h-96 bg-blue-500 rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-pulse"></div>
      
      <div className="relative z-10 w-full max-w-md bg-white p-8 sm:p-10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-gray-100">
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-gray-800 tracking-tight flex items-center justify-center gap-2">
            <ShieldCheck className="text-[#00529b]" size={26} />
            NUEVA CLAVE
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Establece tu nueva credencial de acceso</p>
        </div>

        {errorMsg && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3">
            <AlertCircle size={18} className="shrink-0" /> <p>{errorMsg}</p>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3">
            <CheckCircle2 size={18} className="shrink-0" /> <p>{successMsg}</p>
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock size={18} className="text-gray-400" /></div>
            <input 
              type="password" required placeholder="Nueva contraseña" 
              className="w-full py-3.5 pl-11 pr-4 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-[#00529b] outline-none transition-all"
              onChange={(e) => setPassword(e.target.value)} 
            />
          </div>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock size={18} className="text-gray-400" /></div>
            <input 
              type="password" required placeholder="Repetir contraseña" 
              className="w-full py-3.5 pl-11 pr-4 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-[#00529b] outline-none transition-all"
              onChange={(e) => setConfirmPassword(e.target.value)} 
            />
          </div>

          <button 
            type="submit" disabled={loading}
            className="w-full mt-4 bg-[#00529b] text-white py-3.5 rounded-xl font-black tracking-wide uppercase hover:bg-[#003d73] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : 'GUARDAR CONTRASEÑA'}
          </button>
        </form>
      </div>
    </div>
  );
}