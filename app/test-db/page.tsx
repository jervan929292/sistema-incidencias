'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestDbPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const testConnection = async () => {
    setLoading(true);
    setResult(null);
    setErrorDetails(null);

    const targetUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log('Probando conexión a:', targetUrl);

    try {
      // 1. Prueba directa con cliente de Supabase
      const { data, error, status, statusText } = await supabase
        .from('directorio_operativo')
        .select('*')
        .limit(1);

      if (error) {
        setResult({
          type: 'Supabase Error',
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          status,
          statusText,
        });
      } else {
        setResult({
          type: 'ÉXITO CONECTADO',
          status,
          recordsFound: data?.length || 0,
          sampleData: data,
        });
      }
    } catch (err: any) {
      // Catch para errores de red / CORS / TypeError
      setErrorDetails(err?.toString() || 'Error desconocido');
      setResult({
        type: 'Error de Red / Excepción JavaScript',
        name: err?.name,
        message: err?.message,
        stack: err?.stack,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Diagnóstico de Conexión Supabase</h2>
      
      <div style={{ background: '#f0f0f0', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>
        <p><strong>URL en Vercel:</strong> <code>{process.env.NEXT_PUBLIC_SUPABASE_URL || 'NO CONFIGURADA'}</code></p>
        <p><strong>Clave Anon:</strong> <code>{process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Presente (eyJ...)' : 'NO CONFIGURADA'}</code></p>
      </div>

      <button 
        onClick={testConnection}
        disabled={loading}
        style={{
          padding: '12px 20px',
          backgroundColor: '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          fontSize: '16px',
          cursor: 'pointer',
          width: '100%'
        }}
      >
        {loading ? 'Probando...' : 'PROBAR CONEXIÓN AHORA'}
      </button>

      {errorDetails && (
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#ffe6e6', color: '#cc0000', borderRadius: '5px' }}>
          <strong>Detalle de la Excepción:</strong>
          <p>{errorDetails}</p>
        </div>
      )}

      {result && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '5px' }}>
          <h3>Resultado de la Auditoría:</h3>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
