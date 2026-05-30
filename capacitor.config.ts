import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cupaz.incidencias',
  appName: 'Sistema Incidencias CUPAZ',
  webDir: 'public',
  server: {
    url: 'https://sistema-incidencias-n8q7mpkae-jerinson-valles-projects.vercel.app',
    cleartext: true,
    allowNavigation: [
      'sistema-incidencias-n8q7mpkae-jerinson-valles-projects.vercel.app',
      '*.vercel.app',
      '*.supabase.co'
    ]
  }
};

export default config;