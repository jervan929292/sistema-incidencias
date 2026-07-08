'use client';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';

export default function ControlMantenimiento() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 1. Revisar estado al cargar cualquier página
    const checkMantenimiento = async () => {
      const { data } = await supabase.from('configuracion_sistema').select('en_mantenimiento').eq('id', 1).single();
      
      if (data?.en_mantenimiento) {
        // Si hay mantenimiento, cerramos sesión y expulsamos
        await supabase.auth.signOut();
        if (pathname !== '/mantenimiento') {
          router.replace('/mantenimiento');
        }
      } else {
        // Si no hay mantenimiento pero alguien intenta entrar a la vista de mantenimiento, lo sacamos
        if (pathname === '/mantenimiento') {
          router.replace('/login');
        }
      }
    };
    checkMantenimiento();

    // 2. ESCUCHA EN TIEMPO REAL (Magia pura)
    // Si tú lo cambias a "true" en Supabase, esto saca a todos los que estén conectados al instante
    const channel = supabase.channel('vigilante-mantenimiento')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'configuracion_sistema', filter: 'id=eq.1' }, (payload) => {
        if (payload.new.en_mantenimiento) {
          supabase.auth.signOut().then(() => {
            window.location.href = '/mantenimiento';
          });
        } else {
          // Si lo apagas (false), mandamos a la gente a hacer login
          if (window.location.pathname === '/mantenimiento') {
             window.location.href = '/login';
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pathname, router]);

  return null; // Es un componente invisible, solo actúa en el fondo
}
