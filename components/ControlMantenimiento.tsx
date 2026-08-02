'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';

export default function ControlMantenimiento() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkMantenimiento = async () => {
      const { data } = await supabase
        .from('configuracion_sistema')
        .select('activo, alerta_ven_activa, mensaje_alerta')
        .limit(1)
        .maybeSingle();
      
      if (data?.activo) {
        await supabase.auth.signOut();
        if (pathname !== '/mantenimiento') {
          router.replace('/mantenimiento');
        }
      } else {
        if (pathname === '/mantenimiento') {
          router.replace('/login');
        }
      }
    };
    checkMantenimiento();

    const channel = supabase.channel('vigilante-mantenimiento')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'configuracion_sistema' }, (payload: any) => {
        if (payload.new?.activo) {
          supabase.auth.signOut().then(() => {
            window.location.href = '/mantenimiento';
          });
        } else {
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

  return null;
}
