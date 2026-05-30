'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Mail, KeyRound, Eye, EyeOff, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const correoLimpio = email.trim().toLowerCase();
      const codigoLimpio = codigo.trim();

      // 1. INTENTAMOS INICIAR SESIÓN NORMAL
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: correoLimpio,
        password: codigoLimpio,
      });

      let userId = signInData?.user?.id;

      // 2. LÓGICA DE ACTIVACIÓN JIT (JUST-IN-TIME)
      if (signInError) {
        const { data: userInDB } = await supabase
          .from('directorio_operativo')
          .select('id')
          .eq('email', correoLimpio)
          .eq('codigo_situr', codigoLimpio)
          .single();

        if (userInDB) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: correoLimpio,
            password: codigoLimpio,
          });

          if (signUpError) {
            setErrorMsg("Error de activación. Contacte a soporte.");
            setLoading(false);
            return;
          }
          
          if (signUpData?.user) {
            await supabase.from('directorio_operativo').update({ id: signUpData.user.id }).eq('email', correoLimpio);
            userId = signUpData.user.id;
          }
        } else {
          setErrorMsg("Credenciales inválidas.");
          setLoading(false);
          return;
        }
      }

      if (!userId) {
        setLoading(false);
        return;
      }

      // 3. CONSULTAMOS ROL
      const { data: userData, error: dbError } = await supabase
        .from('directorio_operativo')
        .select('rol')
        .eq('id', userId)
        .single();

      if (dbError) {
        setErrorMsg("Error de permisos.");
        setLoading(false);
        return;
      }

      userData.rol === 'admin' ? router.push('/admin') : router.push('/dashboard');
      
    } catch (err) {
      setErrorMsg("Error crítico de conexión.");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#001f3f]">
      <div className="absolute top-[-15%] left-[-10%] w-96 h-96 bg-blue-500 rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-pulse"></div>
      <div className="absolute bottom-[-15%] right-[-10%] w-96 h-96 bg-[#00529b] rounded-full mix-blend-screen filter blur-[100px] opacity-40"></div>

      <div className="relative z-10 w-full max-w-md bg-white p-8 sm:p-10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-gray-100">
        <div className="flex justify-center items-center gap-6 mb-8">
          <img src="/logo1.png" alt="Logo VEN 911" className="h-16 w-auto object-contain drop-shadow-md" />
          <div className="w-px h-12 bg-gray-200"></div>
          <img src="/logo2.png" alt="Logo CUPAZ" className="h-16 w-auto object-contain drop-shadow-md" />
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-gray-800 tracking-tight flex items-center justify-center gap-2">
            <ShieldCheck className="text-[#00529b]" size={26} /> SISTEMA OPERATIVO
          </h1>
        </div>

        {errorMsg && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3">
            <AlertCircle size={18} className="shrink-0" /> <p>{errorMsg}</p>
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider pl-1">Usuario / Correo</label>
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-4 text-gray-400" />
              <input type="email" required placeholder="ejemplo@cupaz.com" className="w-full py-3.5 pl-11 pr-4 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-800 focus:ring-2 focus:ring-[#00529b] outline-none transition-all" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider pl-1">Código SITUR (Clave)</label>
            <div className="relative">
              <KeyRound size={18} className="absolute left-4 top-4 text-gray-400" />
              <input type={showPassword ? "text" : "password"} required placeholder="Ingresa tu código" className="w-full py-3.5 pl-11 pr-12 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-800 focus:ring-2 focus:ring-[#00529b] outline-none transition-all" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-gray-400 hover:text-[#00529b]">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <Link href="/recuperar-password" className="text-xs font-bold text-[#00529b] hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button type="submit" disabled={loading} className="w-full mt-2 bg-gradient-to-r from-[#00529b] to-[#003d73] text-white py-3.5 rounded-xl font-black uppercase hover:shadow-lg transition-all disabled:opacity-70 flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={20} className="animate-spin" /> Sincronizando...</> : 'Ingresar al Sistema'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-gray-100 pt-6">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Centro de Comando y Control</p>
          <p className="text-[10px] font-medium text-gray-400 mt-1">Ministerio del Poder Popular para Relaciones Interiores, Justicia y Paz</p>
        </div>
      </div>
    </div>
  );
}