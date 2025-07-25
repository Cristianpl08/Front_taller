import React, { useState, useEffect } from "react";
import VideoSegmentPlayer from "./VideoSegmentPlayer";
import Login from "./components/Login";
import { apiService } from "./services/api.js";
import { API_CONFIG } from "./config.js";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [projectData, setProjectData] = useState(null);
  const [segments, setSegments] = useState([]);
  const [error, setError] = useState('');

  // Verificar autenticación al cargar la aplicación
  useEffect(() => {
    const checkAuth = async () => {
      if (apiService.isAuthenticated()) {
        setIsAuthenticated(true);
        await loadProjectData();
      }
      setLoading(false);
    };
    
    checkAuth();
  }, []);

  // Cargar datos del proyecto y segmentos
  const loadProjectData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Cargar proyecto
      const project = await apiService.getProject();
      setProjectData(project);
      
      // Cargar segmentos
      const segmentsData = await apiService.getSegments();
      
      // Transformar los segmentos para que sean compatibles con el formato esperado
      const transformedSegments = segmentsData.map((segment, index) => ({
        id: index + 1, // ID numérico para compatibilidad
        start: segment.startTime * 1000, // Convertir a milisegundos
        end: segment.endTime * 1000, // Convertir a milisegundos
        duration: segment.duration,
        description: segment.description || '',
        prosody: segment.prosody || '',
        prosody2: segment.prosody2 || '',
        views: segment.views || 0,
        likes: segment.likes || 0,
        _id: segment._id,
        projectid: segment.projectid
      }));
      
      setSegments(transformedSegments);
    } catch (error) {
      console.error('Error loading project data:', error);
      setError('Error al cargar los datos del proyecto. Verifica tu conexión.');
      // Si hay error de autenticación, cerrar sesión
      if (error.message.includes('401') || error.message.includes('403')) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = async () => {
    setIsAuthenticated(true);
    await loadProjectData();
  };

  const handleLogout = () => {
    apiService.logout();
    setIsAuthenticated(false);
    setProjectData(null);
    setSegments([]);
    setError('');
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div>
      {/* Header con información del proyecto y botón de logout */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <div>
          <h1 style={{ margin: '0', fontSize: '2rem' }}>Video Segment Player</h1>
          {projectData && (
            <p style={{ margin: '0.5rem 0 0 0', opacity: '0.9' }}>
              Proyecto: {projectData.name || 'Sin nombre'} | ID: {API_CONFIG.PROJECT_ID}
            </p>
          )}
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '5px',
            cursor: 'pointer',
            transition: 'background 0.3s'
          }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
        >
          Cerrar Sesión
        </button>
      </div>

      {/* Mostrar error si existe */}
      {error && (
        <div style={{
          background: '#fee',
          color: '#c33',
          padding: '1rem',
          margin: '1rem 2rem',
          borderRadius: '5px',
          border: '1px solid #fcc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{error}</span>
          <button
            onClick={() => setError('')}
            style={{
              background: 'none',
              border: 'none',
              color: '#c33',
              cursor: 'pointer',
              fontSize: '1.2rem'
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Información del proyecto cargado */}
      {projectData && (
        <div style={{
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid #22c55e',
          borderRadius: '8px',
          padding: '1rem',
          margin: '1rem 2rem',
          color: '#166534'
        }}>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>✓ Proyecto cargado desde la API</h3>
          <p style={{ margin: '0', fontSize: '0.9rem' }}>
            {segments.length} segmentos disponibles | 
            <button
              onClick={loadProjectData}
              style={{
                background: 'none',
                border: 'none',
                color: '#166534',
                textDecoration: 'underline',
                cursor: 'pointer',
                marginLeft: '0.5rem'
              }}
            >
              Recargar datos
            </button>
          </p>
        </div>
      )}

      {/* Componente principal del reproductor */}
      <VideoSegmentPlayer 
        segments={segments}
        projectData={projectData}
        hideUpload={true} // Ocultar la subida de archivos ya que usamos la API
      />
    </div>
  );
}

export default App;