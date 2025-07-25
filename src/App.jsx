import React, { useState, useEffect } from "react";
import VideoSegmentPlayer from "./VideoSegmentPlayer";
import Login from "./components/Login";
import ProjectList from "./components/ProjectList";
import ProjectDetail from "./components/ProjectDetail";
import { useAuth } from "./contexts/AuthContext.jsx";
import { API_CONFIG } from "./config.js";

function App() {
  const { isAuthenticated, user, loading: authLoading, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projectData, setProjectData] = useState(null);
  const [segments, setSegments] = useState([]);
  const [error, setError] = useState('');
  const [currentView, setCurrentView] = useState('projects'); // 'projects', 'detail', 'player'
  const [selectedProject, setSelectedProject] = useState(null);

  // Verificar autenticación al cargar la aplicación
  useEffect(() => {
    const checkAuth = async () => {
      if (isAuthenticated) {
        await loadProjectData();
      }
      setLoading(false);
    };
    
    checkAuth();
  }, [isAuthenticated]);

  // Cargar datos del proyecto y segmentos
  const loadProjectData = async (projectId = API_CONFIG.PROJECT_ID) => {
    try {
      setLoading(true);
      setError('');
      
      console.log("📡 Cargando datos del proyecto...");
      
      // Cargar proyecto
      const project = await apiService.getProject(projectId);
      console.log("✅ Proyecto cargado:", project);
      setProjectData(project);
      
      // Cargar segmentos
      const segmentsData = await apiService.getSegments();
      console.log("✅ Segmentos cargados:", segmentsData.length, "segmentos");
      
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
      console.log("🎯 Video y wave surfer se cargarán automáticamente");
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
    console.log("🔐 Login exitoso, cargando datos del proyecto...");
    await loadProjectData();
    console.log("✅ Datos del proyecto cargados automáticamente");
  };

  const handleLogout = async () => {
    await logout();
    setProjectData(null);
    setSegments([]);
    setError('');
    setCurrentView('projects');
    setSelectedProject(null);
  };

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    setCurrentView('detail');
  };

  const handleBackToProjects = () => {
    setCurrentView('projects');
    setSelectedProject(null);
  };

  const handleOpenPlayer = async (project) => {
    setSelectedProject(project);
    setCurrentView('player');
    await loadProjectData(project._id);
  };

  if (authLoading || loading) {
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
          <p>{authLoading ? 'Verificando autenticación...' : 'Cargando...'}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  // Renderizar diferentes vistas según el estado
  const renderContent = () => {
    switch (currentView) {
      case 'projects':
        return <ProjectList onProjectSelect={handleProjectSelect} />;
      
      case 'detail':
        return (
          <ProjectDetail 
            projectId={selectedProject?._id} 
            onBackToList={handleBackToProjects}
            onOpenPlayer={() => handleOpenPlayer(selectedProject)}
          />
        );
      
      case 'player':
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
                    Proyecto: {projectData.name || selectedProject?.name || 'Sin nombre'} | ID: {selectedProject?._id || API_CONFIG.PROJECT_ID}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button
                  onClick={handleBackToProjects}
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
                  ← Volver a proyectos
                </button>
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
                    onClick={() => loadProjectData(selectedProject?._id)}
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
      
      default:
        return <ProjectList onProjectSelect={handleProjectSelect} />;
    }
  };

  return (
    <div>
      {/* Header principal solo para vistas de proyectos y detalle */}
      {currentView !== 'player' && (
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
          <h1 style={{ margin: '0', fontSize: '2rem' }}>
            {currentView === 'projects' ? '📁 Mis Proyectos' : '🎬 Reproductor de Videos'}
          </h1>
          {user && (
            <p style={{ margin: '0.5rem 0 0 0', opacity: '0.9', fontSize: '0.9rem' }}>
              👤 {user.email || user.name || 'Usuario'}
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
      )}

      {/* Contenido principal */}
      {renderContent()}
    </div>
  );
}

export default App;