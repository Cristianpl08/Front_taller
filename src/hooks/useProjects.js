import { useState, useEffect } from 'react';
import { apiService } from '../services/api.js';

// Hook para obtener todos los proyectos
export const useProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('📡 Cargando lista de proyectos...');
        
        const projectsData = await apiService.getAllProjects();
        console.log('✅ Proyectos cargados:', projectsData.length);
        setProjects(projectsData);
      } catch (err) {
        console.error('❌ Error al cargar proyectos:', err);
        setError('Error al cargar los proyectos. Verifica tu conexión.');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  return { projects, loading, error };
};

// Hook para obtener un proyecto específico
export const useProject = (projectId) => {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('📡 Cargando proyecto:', projectId);
        
        const projectData = await apiService.getProject(projectId);
        console.log('✅ Proyecto cargado:', projectData);
        setProject(projectData);
      } catch (err) {
        console.error('❌ Error al cargar proyecto:', err);
        setError('Error al cargar el proyecto. Verifica tu conexión.');
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  return { project, loading, error };
}; 