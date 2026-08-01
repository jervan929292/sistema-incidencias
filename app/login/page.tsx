export default function Maintenance() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh', 
      backgroundColor: '#f8fafc', 
      color: '#1e293b', 
      fontFamily: 'system-ui, -apple-system, sans-serif', 
      textAlign: 'center', 
      padding: '20px' 
    }}>
      
      {/* Reemplaza '/icon.png' con la ruta real de tu logo en la carpeta public */}
      <img 
        src="/icon.png" 
        alt="Logo del Sistema" 
        style={{ width: '180px', marginBottom: '2rem' }} 
      />

      <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1rem', letterSpacing: '-0.025em' }}>
        Sistema en Mantenimiento
      </h1>
      
      <p style={{ fontSize: '1.2rem', color: '#475569', maxWidth: '600px', lineHeight: '1.7', margin: '0 auto' }}>
        Estamos realizando una actualización programada en nuestra base de datos y servidores para mejorar la velocidad, seguridad y rendimiento de la plataforma.
      </p>
      
      <p style={{ fontSize: '1rem', color: '#64748b', marginTop: '1.5rem', fontWeight: '500' }}>
        Estaremos en línea nuevamente en breve. Agradecemos su paciencia.
      </p>

      {/* Círculo de carga animado */}
      <div style={{ 
        marginTop: '3rem', 
        width: '45px', 
        height: '45px', 
        border: '4px solid #e2e8f0', 
        borderTop: '4px solid #2563eb', 
        borderRadius: '50%', 
        animation: 'spin 1s linear infinite' 
      }}></div>

      <style>{`
        @keyframes spin { 
          0% { transform: rotate(0deg); } 
          100% { transform: rotate(360deg); } 
        }
      `}</style>

    </div>
  );
}
