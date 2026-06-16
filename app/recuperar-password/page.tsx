'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Mail, ShieldCheck, AlertCircle, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function RecuperarPasswordPage() {
  const [email, setEmail] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setMensaje('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/actualizar-password`,
    });

    if (error) {
      setErrorMsg("Error al enviar: " + error.message);
    } else {
      setMensaje("¡Enlace enviado! Revisa tu bandeja de entrada o spam.");
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#001f3f]">
      {/* EFECTOS DE LUZ DE FONDO */}
      <div className="absolute top-[-15%] left-[-10%] w-96 h-96 bg-blue-500 rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-pulse"></div>
      
      <div className="relative z-10 w-full max-w-md bg-white p-8 sm:p-10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-gray-100">
        
        <div className="flex justify-center items-center gap-6 mb-8">
          <img src="/logo1.png" alt="Logo VEN 911" className="h-16 w-auto object-contain drop-shadow-md" />
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-gray-800 tracking-tight flex items-center justify-center gap-2">
            <ShieldCheck className="text-[#00529b]" size={26} />
            RECUPERACIÓN
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Ingresa tu correo institucional</p>
        </div>

        {errorMsg && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3">
            <AlertCircle size={18} className="shrink-0" /> <p>{errorMsg}</p>
          </div>
        )}

        {mensaje && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3">
            <CheckCircle2 size={18} className="shrink-0" /> <p>{mensaje}</p>
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-5">
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail size={18} className="text-gray-400" />
              </div>
              <input 
                type="email" 
                required 
                placeholder="ejemplo@cupaz.com" 
                className="w-full py-3.5 pl-11 pr-4 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00529b] transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-[#00529b] to-[#003d73] text-white py-3.5 rounded-xl font-black tracking-wide uppercase hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : 'ENVIAR ENLACE'}
          </button>

          <Link href="/login" className="flex items-center justify-center gap-2 mt-6 text-sm font-bold text-gray-500 hover:text-[#00529b] transition-colors">
            <ArrowLeft size={16} /> Volver al Login
          </Link>
        </form>
      </div>
    </div>
  );
}