import React, { useRef, useState, useEffect } from "react";
import WaveSurfer from "wavesurfer.js";
// import segments from "./segments"; // Eliminar esta línea, ahora será dinámico
import "./App.css";
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js';
import { processCloudinaryUrl, isCloudinaryUrl, generateAudioUrl, getOriginalCloudinaryUrl } from './utils/cloudinaryHelper.js';
import ArrowLeftIcon from '@mui/icons-material/ArrowLeft';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import { useAuth } from './contexts/AuthContext.jsx';
import { apiService } from './services/api.js';

function VideoSegmentPlayer({ hideUpload, segments: propSegments = [], projectData }) {
  const videoRef = useRef(null);
  const wavesurferRef = useRef(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [currentSegmentIdx, setCurrentSegmentIdx] = useState(-1);
  const [waveLoading, setWaveLoading] = useState(false);
  const [isUserSeeking, setIsUserSeeking] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  // Estado para la selección (ya no se usa, los segmentos vienen de la API)
  const [segments, setSegments] = useState(propSegments); // Estado para los segmentos
  const [jsonFile, setJsonFile] = useState(null); // Estado para el archivo JSON subido
  const [jsonValidation, setJsonValidation] = useState({ isValid: false, message: '' }); // Estado para validación
  const [isFullyLoaded, setIsFullyLoaded] = useState(false); // Estado para indicar que todo está cargado
  
  // Obtener el usuario actual del contexto de autenticación
  const { user } = useAuth();
  
  // Estados para los campos editables
  const [editableDescription, setEditableDescription] = useState('');
  const [editableProsody1, setEditableProsody1] = useState('');
  const [editableProsody2, setEditableProsody2] = useState('');
  
  // Estado para mostrar feedback de guardado
  const [saveStatus, setSaveStatus] = useState({});

  // Función para validar el archivo JSON
  const validateJsonFile = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target.result);
          
          // Verificar que sea un array
          if (!Array.isArray(jsonData)) {
            resolve({ isValid: false, message: 'El archivo JSON debe contener un array de segmentos' });
            return;
          }
          
          // Verificar que cada elemento tenga los campos requeridos
          for (let i = 0; i < jsonData.length; i++) {
            const segment = jsonData[i];
            if (!segment.hasOwnProperty('id') || !segment.hasOwnProperty('start') || !segment.hasOwnProperty('end')) {
              resolve({ 
                isValid: false, 
                message: `El segmento ${i + 1} no contiene los campos requeridos (id, start, end)` 
              });
              return;
            }
          }
          
          resolve({ isValid: true, message: `Archivo válido con ${jsonData.length} segmentos` });
        } catch (error) {
          resolve({ isValid: false, message: 'Error al parsear el archivo JSON: ' + error.message });
        }
      };
      reader.readAsText(file);
    });
  };

  // Función para manejar la carga del archivo JSON
  const handleJsonUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setJsonFile(file);
      const validation = await validateJsonFile(file);
      setJsonValidation(validation);
      
      if (validation.isValid) {
        // Cargar los segmentos del archivo JSON
        const reader = new FileReader();
        reader.onload = (e) => {
          const jsonData = JSON.parse(e.target.result);
          setSegments(jsonData);
        };
        reader.readAsText(file);
      }
    }
  };

  // Los segmentos ahora vienen de la API, no se cargan archivos locales

  // Función para obtener los datos del usuario actual del array descriptions_prosody
  const getUserDescriptionProsody = (segment) => {
    console.log('🔍 getUserDescriptionProsody - Usuario:', user?._id);
    console.log('🔍 getUserDescriptionProsody - Segmento:', segment);
    
    if (!user || !segment) {
      console.log('❌ No hay usuario o segmento');
      return { description: '', prosody1: '', prosody2: '' };
    }
    
    // Primero intentar obtener datos del localStorage (más actualizados)
    const storedProject = localStorage.getItem('currentProject');
    let fullSegment = null;
    
    if (storedProject) {
      const project = JSON.parse(storedProject);
      fullSegment = project.segments?.find(s => s._id === segment._id);
      console.log('🔍 getUserDescriptionProsody - Segmento desde localStorage:', fullSegment);
    }
    
    // Si no está en localStorage, usar projectData
    if (!fullSegment) {
      fullSegment = projectData?.segments?.find(s => s._id === segment._id);
      console.log('🔍 getUserDescriptionProsody - Segmento desde projectData:', fullSegment);
    }
    
    console.log('🔍 getUserDescriptionProsody - descriptions_prosody:', fullSegment?.descriptions_prosody);
    
    if (!fullSegment || !fullSegment.descriptions_prosody) {
      console.log('❌ No hay segmento completo o descriptions_prosody');
      return { description: '', prosody1: '', prosody2: '' };
    }
    
    const userEntry = fullSegment.descriptions_prosody.find(entry => entry.user_id === user._id);
    console.log('🔍 getUserDescriptionProsody - Entrada del usuario encontrada:', userEntry);
    
    if (!userEntry) {
      console.log('❌ No se encontró entrada para el usuario actual');
      return { description: '', prosody1: '', prosody2: '' };
    }
    
    const result = {
      description: userEntry.description || '',
      prosody1: userEntry['prosody 1'] || '',
      prosody2: userEntry['prosody 2'] || ''
    };
    
    console.log('✅ getUserDescriptionProsody - Resultado:', result);
    return result;
  };

  // Actualizar segmentos cuando cambian las props
  useEffect(() => {
    if (propSegments.length > 0) {
      setSegments(propSegments);
    }
  }, [propSegments]);

  // Cargar datos del localStorage al inicio si están disponibles
  useEffect(() => {
    const storedSegments = localStorage.getItem('currentSegments');
    if (storedSegments && !propSegments.length) {
      try {
        const parsedSegments = JSON.parse(storedSegments);
        console.log('📦 Cargando segmentos desde localStorage:', parsedSegments.length);
        setSegments(parsedSegments);
      } catch (error) {
        console.error('❌ Error cargando segmentos desde localStorage:', error);
      }
    }
  }, [propSegments.length]);

  // Actualizar campos editables cuando cambia el segmento actual o el usuario
  useEffect(() => {
    if (currentSegmentIdx >= 0 && segments[currentSegmentIdx]) {
      const currentSegment = segments[currentSegmentIdx];
      console.log('Segmento activo:', currentSegment); // <-- LOG NUEVO
      const userData = getUserDescriptionProsody(currentSegment);
      
      setEditableDescription(userData.description);
      setEditableProsody1(userData.prosody1);
      setEditableProsody2(userData.prosody2);
    } else {
      // Limpiar campos si no hay segmento seleccionado
      setEditableDescription('');
      setEditableProsody1('');
      setEditableProsody2('');
    }
  }, [currentSegmentIdx, segments, user]);

          // Resetear estado de carga cuando cambian los datos del proyecto
  useEffect(() => {
    if (projectData) {
      setIsFullyLoaded(false);
    }
  }, [projectData]);

  // Cargar video del proyecto cuando esté disponible
  useEffect(() => {
    if (projectData && projectData.video) {
      console.log("🎬 Cargando video del proyecto:", projectData.video);
      
      // Procesar URL según el servicio detectado
      let processedVideoUrl = projectData.video;
      let processedAudioUrl = projectData.video;

      if (isCloudinaryUrl(projectData.video)) {
        console.log("☁️ Detectada URL de Cloudinary, procesando...");
        processedVideoUrl = processCloudinaryUrl(projectData.video);
        processedAudioUrl = generateAudioUrl(projectData.video);
        console.log("✅ URLs procesadas para Cloudinary:", { video: processedVideoUrl, audio: processedAudioUrl });
        
        setVideoUrl(processedVideoUrl);
        setAudioUrl(processedAudioUrl);
        setWaveLoading(true);
      } else {
        // URL directa o de otro servicio
        console.log("🔗 URL directa detectada:", projectData.video);
        setVideoUrl(processedVideoUrl);
        setAudioUrl(processedAudioUrl);
        setWaveLoading(true);
      }
    }
  }, [projectData]);

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log("Archivo seleccionado:", file.name, "Tamaño:", file.size);
      const url = URL.createObjectURL(file);
      console.log("URL creada:", url);
      setVideoUrl(url);
      setAudioUrl(url);
      setWaveLoading(true);
    }
  };

  // Función para sincronizar video con WaveSurfer
  const syncVideoToWaveform = (progress) => {
    if (videoRef.current && videoRef.current.duration) {
      const newTime = progress * videoRef.current.duration;
      videoRef.current.currentTime = newTime;
    }
  };

  // Función para sincronizar WaveSurfer con video
  const syncWaveformToVideo = () => {
    if (videoRef.current && wavesurferRef.current && videoRef.current.duration) {
      const progress = videoRef.current.currentTime / videoRef.current.duration;
      wavesurferRef.current.seekTo(progress);
    }
  };

  useEffect(() => {
    console.log("useEffect audioUrl triggered, audioUrl:", audioUrl);
    console.log("projectData:", projectData);
    console.log("wavesurferRef.current:", wavesurferRef.current);
    
    if (audioUrl && projectData && !wavesurferRef.current) {
      console.log("Iniciando creación de WaveSurfer...");
      
      // Función para inicializar WaveSurfer con retraso para asegurar que el DOM esté listo
      const initializeWaveSurfer = () => {
        // Verificar que el contenedor existe
        const container = document.getElementById("waveform");
        console.log("Contenedor waveform encontrado:", container);
        
        if (!container) {
          console.error("No se encontró el contenedor #waveform, reintentando en 100ms...");
          setTimeout(initializeWaveSurfer, 100);
          return;
        }

      const regionsPlugin = RegionsPlugin.create();
      const timelinePlugin = TimelinePlugin.create();
      
      console.log("Plugins creados:", { regionsPlugin, timelinePlugin });
      
      try {
        wavesurferRef.current = WaveSurfer.create({
          container: "#waveform",
          waveColor: "#8B7355",
          progressColor: "#FF8C00",
          height: 80,
          responsive: true,
          backend: "WebAudio",
          plugins: [regionsPlugin, timelinePlugin],
          timeline: {
            container: "#timeline"
          },
          minPxPerSec: 100 * zoomLevel
        });
        
        console.log("WaveSurfer creado exitosamente:", wavesurferRef.current);
      } catch (error) {
        console.error("Error al crear WaveSurfer:", error);
        return;
      }

      console.log("Cargando audio URL:", audioUrl);
      wavesurferRef.current.load(audioUrl);
      setWaveLoading(true);

      wavesurferRef.current.on('ready', () => {
        console.log("WaveSurfer está listo!");
        
        // Verificar que el plugin de timeline esté disponible
        console.log("Plugin timeline disponible:", timelinePlugin);
        console.log("Plugins de WaveSurfer:", wavesurferRef.current.plugins);
        
        // Verificar que el plugin de regiones esté disponible
        if (regionsPlugin && segments.length > 0) {
          console.log("🎯 Agregando regiones automáticamente desde los segmentos cargados...");
          regionsPlugin.clearRegions();
          segments.forEach((seg, idx) => {
            // Convertir de milisegundos a segundos para WaveSurfer
            const startInSeconds = seg.start / 1000;
            const endInSeconds = seg.end / 1000;
            regionsPlugin.addRegion({
              id: String(seg.id),
              start: startInSeconds,
              end: endInSeconds,
              color: idx === currentSegmentIdx ? 'rgba(124,58,237,0.3)' : 'rgba(96,165,250,0.2)',
              drag: false,
              resize: false,
            });
          });
          console.log("✅ Regiones agregadas automáticamente:", segments.length);
        } else {
          console.log("⚠️ No hay segmentos disponibles para generar regiones");
        }
        
        setWaveLoading(false);
        setIsFullyLoaded(true);
        console.log("🎉 ¡Todo cargado exitosamente! Video y wave surfer listos para usar.");
        
        // Mostrar notificación de éxito
        if (projectData) {
          console.log(`✅ Proyecto "${projectData.name || 'Sin nombre'}" cargado con ${segments.length} segmentos`);
        }
      });

      wavesurferRef.current.on('error', (error) => {
        console.error("Error en WaveSurfer:", error);
        setWaveLoading(false);
      });

      wavesurferRef.current.on('loading', (progress) => {
        console.log("Cargando WaveSurfer:", progress * 100 + "%");
      });

      wavesurferRef.current.on('ready', () => {
        console.log("✅ WaveSurfer cargado exitosamente");
        setWaveLoading(false);
      });

      // Evento cuando el usuario hace clic en una región
      regionsPlugin.on('region-clicked', (region, e) => {
        console.log("Región clickeada:", region.id);
        e.stopPropagation();
        const segmentId = Number(region.id);
        const segment = segments.find(seg => seg.id === segmentId);
        if (segment) {
          setIsUserSeeking(true);
          syncVideoToWaveform((segment.start / 1000) / (videoRef.current?.duration || 1));
          setCurrentSegmentIdx(segments.findIndex(seg => seg.id === segmentId));
          setTimeout(() => setIsUserSeeking(false), 200);
        }
      });

      // Evento cuando el usuario hace clic en el WaveSurfer
      wavesurferRef.current.on('seek', (progress) => {
        if (!isUserSeeking) {
          setIsUserSeeking(true);
          syncVideoToWaveform(progress);
          // Obtener el tiempo actual del video después del seek
          const video = videoRef.current;
          let currentTime = 0;
          if (video && video.duration) {
            currentTime = progress * video.duration;
          }
          // Buscar el segmento correspondiente (convertir a milisegundos para comparar)
          const currentTimeMs = currentTime * 1000;
          const idx = segments.findIndex(seg => currentTimeMs >= seg.start && currentTimeMs <= seg.end);
          setCurrentSegmentIdx(idx !== -1 ? idx : -1);
          setTimeout(() => setIsUserSeeking(false), 200);
        }
      });

      // Evento de proceso de audio para detectar segmentos
      wavesurferRef.current.on('audioprocess', (time) => {
        if (!isUserSeeking) {
          // Convertir tiempo a milisegundos para comparar con los segmentos
          const timeMs = time * 1000;
          const idx = segments.findIndex(seg => timeMs >= seg.start && timeMs <= seg.end);
          if (idx !== -1 && idx !== currentSegmentIdx) {
            setCurrentSegmentIdx(idx);
          } else if (idx === -1 && currentSegmentIdx !== -1) {
            // Si no estamos en ningún segmento, limpiar la selección
            setCurrentSegmentIdx(-1);
          }
        }
      });
      };
      
      // Inicializar WaveSurfer
      initializeWaveSurfer();
    }

    return () => {
      if (wavesurferRef.current) {
        console.log("Destruyendo WaveSurfer...");
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
    };
  }, [audioUrl, projectData]);

  // Sincronizar video con WaveSurfer cuando el video se reproduce
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !wavesurferRef.current) return;

    const handleTimeUpdate = () => {
      if (!isUserSeeking && video.duration) {
        syncWaveformToVideo();
        // Buscar el segmento correspondiente al tiempo actual del video
        const currentTime = video.currentTime;
        const currentTimeMs = currentTime * 1000;
        const idx = segments.findIndex(seg => currentTimeMs >= seg.start && currentTimeMs <= seg.end);
        setCurrentSegmentIdx(idx !== -1 ? idx : -1);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [isUserSeeking, segments]);

  // Actualizar colores de regiones cuando cambia el segmento actual
  useEffect(() => {
    if (wavesurferRef.current) {
      const regionsPlugin = wavesurferRef.current.plugins.regions;
      if (regionsPlugin) {
        // Obtener todas las regiones existentes
        const allRegions = regionsPlugin.getRegions();
        allRegions.forEach(region => {
          // Buscar el índice del segmento correspondiente a esta región
          const idx = segments.findIndex(seg => String(seg.id) === region.id);
          // Actualizar el color según si es el segmento activo
          region.update({
            color: idx === currentSegmentIdx ? 'rgba(124,58,237,0.3)' : 'rgba(96,165,250,0.2)'
          });
        });
      }
    }
  }, [currentSegmentIdx, segments]);

  // Efecto para regenerar regiones cuando los segmentos cambien
  useEffect(() => {
    if (wavesurferRef.current && segments.length > 0) {
      const regionsPlugin = wavesurferRef.current.plugins.regions;
      if (regionsPlugin) {
        console.log("🔄 Regenerando regiones con nuevos segmentos:", segments.length);
        regionsPlugin.clearRegions();
        segments.forEach((seg, idx) => {
          const startInSeconds = seg.start / 1000;
          const endInSeconds = seg.end / 1000;
          regionsPlugin.addRegion({
            id: String(seg.id),
            start: startInSeconds,
            end: endInSeconds,
            color: idx === currentSegmentIdx ? 'rgba(124,58,237,0.3)' : 'rgba(96,165,250,0.2)',
            drag: false,
            resize: false,
          });
        });
        console.log("✅ Regiones regeneradas exitosamente");
      }
    }
  }, [segments]);

  // Actualizar el zoom dinámicamente
  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.options.minPxPerSec = 100 * zoomLevel;
      wavesurferRef.current.zoom(100 * zoomLevel);
    }
  }, [zoomLevel]);

  // Verificar que los contenedores del DOM estén disponibles
  useEffect(() => {
    console.log("Componente montado, verificando contenedores...");
    const waveformContainer = document.getElementById("waveform");
    const timelineContainer = document.getElementById("timeline");
    
    console.log("Contenedor waveform:", waveformContainer);
    console.log("Contenedor timeline:", timelineContainer);
    
    if (!waveformContainer) {
      console.warn("El contenedor #waveform no está disponible en el DOM");
    }
    if (!timelineContainer) {
      console.warn("El contenedor #timeline no está disponible en el DOM");
    }
  }, []);

  const goToSegment = (start) => {
    if (videoRef.current && wavesurferRef.current) {
      setIsUserSeeking(true);
      // Convertir de milisegundos a segundos para el video
      const startInSeconds = start / 1000;
      videoRef.current.currentTime = startInSeconds;
      videoRef.current.play();
      
      if (videoRef.current.duration) {
        const progress = startInSeconds / videoRef.current.duration;
        wavesurferRef.current.seekTo(progress);
      }
      
      setTimeout(() => setIsUserSeeking(false), 200);
    }
  };

  const goToPrevSegment = () => {
    if (currentSegmentIdx > 0) {
      const newIdx = currentSegmentIdx - 1;
      setCurrentSegmentIdx(newIdx);
      goToSegment(segments[newIdx].start);
    }
  };

  const goToNextSegment = () => {
    if (currentSegmentIdx < segments.length - 1) {
      const newIdx = currentSegmentIdx + 1;
      setCurrentSegmentIdx(newIdx);
      goToSegment(segments[newIdx].start);
    }
  };

  // Handler genérico para guardar campo editable
  const handleFieldBlur = async (fieldName, fieldValue) => {
    if (currentSegmentIdx === -1 || !user || !segments[currentSegmentIdx]) return;
    // Usar siempre el _id real de MongoDB
    const segmentId = segments[currentSegmentIdx]._id;
    const userId = user._id;
    const timestamp = new Date().toISOString();
    
    // Mostrar estado de guardando
    setSaveStatus(prev => ({ ...prev, [fieldName]: 'saving' }));
    
    try {
      // Actualizar localmente primero para feedback inmediato
      if (projectData && projectData._id) {
        // Buscar el proyecto en localStorage y actualizarlo
        const storedProject = localStorage.getItem('currentProject');
        if (storedProject) {
          const project = JSON.parse(storedProject);
          const updatedProject = {
            ...project,
            segments: project.segments.map(segment => {
              if (segment._id !== segmentId) return segment;
              
              // Crear o actualizar descriptions_prosody
              const existingDescriptionsProsody = segment.descriptions_prosody || [];
              const existingUserIndex = existingDescriptionsProsody.findIndex(
                entry => entry.user_id === userId
              );
              
              let updatedDescriptionsProsody;
              if (existingUserIndex >= 0) {
                // Actualizar entrada existente del usuario
                updatedDescriptionsProsody = [...existingDescriptionsProsody];
                updatedDescriptionsProsody[existingUserIndex] = {
                  ...updatedDescriptionsProsody[existingUserIndex],
                  [fieldName]: fieldValue,
                  timestamp: timestamp
                };
              } else {
                // Crear nueva entrada para el usuario
                updatedDescriptionsProsody = [
                  ...existingDescriptionsProsody,
                  {
                    user_id: userId,
                    [fieldName]: fieldValue,
                    timestamp: timestamp
                  }
                ];
              }
              
              return {
                ...segment,
                descriptions_prosody: updatedDescriptionsProsody
              };
            })
          };
          
          // Guardar en localStorage
          localStorage.setItem('currentProject', JSON.stringify(updatedProject));
          
          // Actualizar también los segmentos en localStorage
          const updatedSegments = updatedProject.segments.map((segment, index) => ({
            id: index + 1,
            start: segment.start_time * 1000,
            end: segment.end_time * 1000,
            duration: segment.duration || (segment.end_time - segment.start_time),
            description: segment.description || '',
            prosody: segment.prosody || '',
            prosody2: segment.prosody2 || '',
            views: segment.views || 0,
            likes: segment.likes || 0,
            _id: segment._id,
            projectid: segment.project_id,
            descriptions_prosody: segment.descriptions_prosody || []
          }));
          
          localStorage.setItem('currentSegments', JSON.stringify(updatedSegments));
          
          // Forzar re-renderizado actualizando el estado local
          setSegments(updatedSegments);
          
          // Mostrar estado de guardado local
          setSaveStatus(prev => ({ ...prev, [fieldName]: 'saved-local' }));
        }
      }
      
      // Enviar a la base de datos
      await apiService.postDescriptionProsody({
        segmentId,
        userId,
        fieldName,
        fieldValue,
        timestamp
      });
      
      // Mostrar estado de guardado completo
      setSaveStatus(prev => ({ ...prev, [fieldName]: 'saved' }));
      
      // Limpiar el estado después de 2 segundos
      setTimeout(() => {
        setSaveStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[fieldName];
          return newStatus;
        });
      }, 2000);
      
      console.log(`✅ Campo ${fieldName} guardado localmente y en la base de datos.`);
    } catch (err) {
      console.error(`❌ Error guardando ${fieldName}:`, err);
      setSaveStatus(prev => ({ ...prev, [fieldName]: 'error' }));
      
      // Limpiar el estado de error después de 3 segundos
      setTimeout(() => {
        setSaveStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[fieldName];
          return newStatus;
        });
      }, 3000);
    }
  };

  return (
    <div className="vsp-bg" style={{ 
      padding: '20px'
    }}>
      {waveLoading && (
        <div className="vsp-loading-overlay">
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '2rem',
            borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            textAlign: 'center',
            maxWidth: '400px'
          }}>
            <div className="vsp-spinner" style={{ margin: '0 auto 1rem' }}></div>
            <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>
              {projectData ? '🎬 Cargando proyecto automáticamente...' : 'Cargando onda de audio...'}
            </h3>
            {projectData && (
              <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
                <p style={{ margin: '0.5rem 0' }}>📡 Descargando video...</p>
                <p style={{ margin: '0.5rem 0' }}>🎵 Generando onda de audio...</p>
                <p style={{ margin: '0.5rem 0' }}>🎯 Configurando {segments.length} segmentos...</p>
              </div>
            )}
          </div>
        </div>
      )}






      {/* Input de archivo JSON al inicio (solo si no hay proyecto cargado) */}
      {!projectData && !jsonFile && !videoUrl && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1em', margin: '2em 0' }}>
          <h3 style={{ margin: '0', color: '#1e293b' }}>Paso 1: Subir archivo JSON de segmentos</h3>
          <label className="vsp-upload-label">
            <input
              type="file"
              accept=".json"
              onChange={handleJsonUpload}
              className="vsp-upload-input"
            />
            Seleccionar archivo JSON de segmentos
          </label>
          {jsonValidation.message && (
            <div style={{ 
              color: jsonValidation.isValid ? 'green' : 'red', 
              marginTop: '1em',
              padding: '0.5em',
              borderRadius: '4px',
              background: jsonValidation.isValid ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${jsonValidation.isValid ? '#22c55e' : '#ef4444'}`
            }}>
              {jsonValidation.message}
            </div>
          )}
        </div>
      )}

      {/* Los segmentos se cargan automáticamente desde la API */}

      {/* Input de video (solo si no hay proyecto cargado y no está oculto) */}
      {!hideUpload && !projectData && !videoUrl && jsonFile && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1em', margin: '2em 0' }}>
          <h3 style={{ margin: '0', color: '#1e293b' }}>Paso 2: Seleccionar video</h3>
          <label className="vsp-upload-label">
            <input
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              className="vsp-upload-input"
            />
            Seleccionar video
          </label>
        </div>
      )}

      {/* Mostrar información del archivo JSON cargado */}
      {jsonFile && (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '0.5em', 
          margin: '1em 0',
          padding: '1em',
          background: 'rgba(34, 197, 94, 0.1)',
          borderRadius: '8px',
          border: '1px solid #22c55e'
        }}>
          <div style={{ color: 'green', fontWeight: 'bold' }}>
            ✓ Archivo JSON cargado: {jsonFile.name}
          </div>
          <div style={{ color: '#1e293b', fontSize: '0.9em' }}>
            {segments.length} segmentos disponibles
          </div>
          <button 
            onClick={() => {
              setJsonFile(null);
              setSegments([]);
              setJsonValidation({ isValid: false, message: '' });
            }}
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              color: '#ef4444',
              padding: '0.5em 1em',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.8em'
            }}
          >
            Cambiar archivo JSON
          </button>
        </div>
      )}
      {/* El resto del renderizado igual, pero usando 'segments' del estado */}
      {videoUrl && segments.length > 0 && (
        <div style={{ 
          width: "100%", 
          maxWidth: "1800px",
          margin: "0 auto"
        }}>
          <div style={{ 
            display: 'flex', 
            gap: '2em', 
            marginBottom: '1em',
            alignItems: 'flex-start'
          }}>
            {/* Columna del video */}
            <div style={{ flex: '1', maxWidth: '900px' }}>
              <video
                ref={videoRef}
                src={videoUrl}
                className="vsp-video"
                controls
              />
            </div>
            
            {/* Columna de campos de texto - Ambas secciones apiladas */}
            <div className="vsp-fields-container" style={{ 
              flex: '1',
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1em',
              minWidth: '400px',
              maxWidth: '900px',
              margin: '0 auto'
            }}>
              {/* Sección Original */}
              <div style={{
                opacity: currentSegmentIdx === -1 ? 0.5 : 1,
                pointerEvents: currentSegmentIdx === -1 ? 'none' : 'auto',
                transition: 'opacity 0.3s ease'
              }}>
                
                                 <div style={{ 
                   background: currentSegmentIdx === -1 ? 'rgba(30,41,59,0.05)' : 'rgba(30,41,59,0.1)', 
                   padding: '0.75em', 
                   borderRadius: '8px',
                   border: `1px solid ${currentSegmentIdx === -1 ? 'rgba(30,41,59,0.1)' : 'rgba(30,41,59,0.2)'}`
                 }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5em', 
                    fontWeight: 'bold',
                    color: currentSegmentIdx === -1 ? '#94a3b8' : '#1e293b'
                  }}>
                    Descripción Original:
                  </label>
                  <textarea
                    value={currentSegmentIdx >= 0 ? segments[currentSegmentIdx]?.description || '' : ''}
                    readOnly
                    disabled={currentSegmentIdx === -1}
                    style={{
                      width: '100%',
                      minHeight: '40px',
                      maxHeight: '60px',
                      padding: '0.4em',
                      border: `1px solid ${currentSegmentIdx === -1 ? '#e2e8f0' : '#cbd5e1'}`,
                      borderRadius: '4px',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      fontSize: '14px',
                      background: currentSegmentIdx === -1 ? '#f1f5f9' : '#f8f9fa',
                      color: currentSegmentIdx === -1 ? '#94a3b8' : '#000',
                      cursor: currentSegmentIdx === -1 ? 'not-allowed' : 'default',
                      boxSizing: 'border-box'
                    }}
                    placeholder="Sin descripción disponible"
                  />
                </div>
                
                <div style={{ 
                  display: 'flex',
                  gap: '1em',
                  marginTop: '0.75em'
                }}>
                  <div style={{ 
                    flex: '1',
                    background: currentSegmentIdx === -1 ? 'rgba(30,41,59,0.05)' : 'rgba(30,41,59,0.1)', 
                    padding: '0.75em', 
                    borderRadius: '8px',
                    border: `1px solid ${currentSegmentIdx === -1 ? 'rgba(30,41,59,0.1)' : 'rgba(30,41,59,0.2)'}`
                  }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '0.5em', 
                      fontWeight: 'bold',
                      color: currentSegmentIdx === -1 ? '#94a3b8' : '#1e293b'
                    }}>
                      Prosody 1 Original:
                    </label>
                    <input
                      type="text"
                      value={currentSegmentIdx >= 0 ? segments[currentSegmentIdx]?.prosody || '' : ''}
                      readOnly
                      disabled={currentSegmentIdx === -1}
                      style={{
                        width: '100%',
                        padding: '0.4em',
                        border: `1px solid ${currentSegmentIdx === -1 ? '#e2e8f0' : '#cbd5e1'}`,
                        borderRadius: '4px',
                        fontFamily: 'inherit',
                        fontSize: '14px',
                        background: currentSegmentIdx === -1 ? '#f1f5f9' : '#f8f9fa',
                        color: currentSegmentIdx === -1 ? '#94a3b8' : '#000',
                        cursor: currentSegmentIdx === -1 ? 'not-allowed' : 'default',
                        boxSizing: 'border-box'
                      }}
                      placeholder="Sin emoción principal"
                    />
                  </div>
                  
                  <div style={{ 
                    flex: '1',
                    background: currentSegmentIdx === -1 ? 'rgba(30,41,59,0.05)' : 'rgba(30,41,59,0.1)', 
                    padding: '0.75em', 
                    borderRadius: '8px',
                    border: `1px solid ${currentSegmentIdx === -1 ? 'rgba(30,41,59,0.1)' : 'rgba(30,41,59,0.2)'}`
                  }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '0.5em', 
                      fontWeight: 'bold',
                      color: currentSegmentIdx === -1 ? '#94a3b8' : '#1e293b'
                    }}>
                      Prosody 2 Original:
                    </label>
                    <input
                      type="text"
                      value={currentSegmentIdx >= 0 ? segments[currentSegmentIdx]?.prosody2 || '' : ''}
                      readOnly
                      disabled={currentSegmentIdx === -1}
                      style={{
                        width: '100%',
                        padding: '0.4em',
                        border: `1px solid ${currentSegmentIdx === -1 ? '#e2e8f0' : '#cbd5e1'}`,
                        borderRadius: '4px',
                        fontFamily: 'inherit',
                        fontSize: '14px',
                        background: currentSegmentIdx === -1 ? '#f1f5f9' : '#f8f9fa',
                        color: currentSegmentIdx === -1 ? '#94a3b8' : '#000',
                        cursor: currentSegmentIdx === -1 ? 'not-allowed' : 'default',
                        boxSizing: 'border-box'
                      }}
                      placeholder="Sin emoción secundaria"
                    />
                  </div>
                </div>
              </div>
              
              {/* Sección Nueva (Editable) */}
              <div style={{
                opacity: currentSegmentIdx === -1 ? 0.5 : 1,
                pointerEvents: currentSegmentIdx === -1 ? 'none' : 'auto',
                transition: 'opacity 0.3s ease'
              }}>
                <div className="vsp-field-editable-block" style={{ 
                  background: currentSegmentIdx === -1 ? 'rgba(59,130,246,0.02)' : 'rgba(59,130,246,0.05)', 
                  padding: '0.75em', 
                  borderRadius: '8px',
                  border: `1px solid ${currentSegmentIdx === -1 ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.2)'}`,
                  marginBottom: '0.75em',
                  position: 'relative'
                }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5em', 
                    fontWeight: 'bold',
                    color: currentSegmentIdx === -1 ? '#94a3b8' : '#1e293b'
                  }}>
                    Descripción:
                    {saveStatus['description'] && (
                      <span style={{
                        marginLeft: '0.5em',
                        fontSize: '0.8em',
                        fontWeight: 'normal',
                        color: saveStatus['description'] === 'saving' ? '#f59e0b' :
                               saveStatus['description'] === 'saved-local' ? '#10b981' :
                               saveStatus['description'] === 'saved' ? '#059669' :
                               saveStatus['description'] === 'error' ? '#ef4444' : '#6b7280'
                      }}>
                        {saveStatus['description'] === 'saving' ? '⏳ Guardando...' :
                         saveStatus['description'] === 'saved-local' ? '💾 Guardado localmente' :
                         saveStatus['description'] === 'saved' ? '✅ Guardado' :
                         saveStatus['description'] === 'error' ? '❌ Error' : ''}
                      </span>
                    )}
                  </label>
                  <textarea
                    value={editableDescription}
                    onChange={(e) => setEditableDescription(e.target.value)}
                    onBlur={(e) => handleFieldBlur('description', e.target.value)}
                    placeholder="Escribe aquí la nueva descripción..."
                    disabled={currentSegmentIdx === -1}
                    style={{
                      width: '100%',
                      minHeight: '40px',
                      maxHeight: '60px',
                      padding: '0.4em',
                      border: `1px solid ${currentSegmentIdx === -1 ? '#e2e8f0' : '#cbd5e1'}`,
                      borderRadius: '4px',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      fontSize: '14px',
                      background: currentSegmentIdx === -1 ? '#f1f5f9' : '#ffffff',
                      color: currentSegmentIdx === -1 ? '#94a3b8' : '#000',
                      cursor: currentSegmentIdx === -1 ? 'not-allowed' : 'text',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                
                <div className="vsp-fields-prosody-row" style={{ 
                  display: 'flex',
                  gap: '0.75em'
                }}>
                  <div className="vsp-field-editable-block" style={{ 
                    flex: '1',
                    background: currentSegmentIdx === -1 ? 'rgba(59,130,246,0.02)' : 'rgba(59,130,246,0.05)', 
                    padding: '0.75em', 
                    borderRadius: '8px',
                    border: `1px solid ${currentSegmentIdx === -1 ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.2)'}`
                  }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '0.5em', 
                      fontWeight: 'bold',
                      color: currentSegmentIdx === -1 ? '#94a3b8' : '#1e293b'
                    }}>
                      Prosody 1:
                      {saveStatus['prosody 1'] && (
                        <span style={{
                          marginLeft: '0.5em',
                          fontSize: '0.8em',
                          fontWeight: 'normal',
                          color: saveStatus['prosody 1'] === 'saving' ? '#f59e0b' :
                                 saveStatus['prosody 1'] === 'saved-local' ? '#10b981' :
                                 saveStatus['prosody 1'] === 'saved' ? '#059669' :
                                 saveStatus['prosody 1'] === 'error' ? '#ef4444' : '#6b7280'
                        }}>
                          {saveStatus['prosody 1'] === 'saving' ? '⏳ Guardando...' :
                           saveStatus['prosody 1'] === 'saved-local' ? '💾 Guardado localmente' :
                           saveStatus['prosody 1'] === 'saved' ? '✅ Guardado' :
                           saveStatus['prosody 1'] === 'error' ? '❌ Error' : ''}
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={editableProsody1}
                      onChange={(e) => setEditableProsody1(e.target.value)}
                      onBlur={(e) => handleFieldBlur('prosody 1', e.target.value)}
                      placeholder="Escribe aquí la emoción principal..."
                      disabled={currentSegmentIdx === -1}
                      style={{
                        width: '100%',
                        padding: '0.4em',
                        border: `1px solid ${currentSegmentIdx === -1 ? '#e2e8f0' : '#cbd5e1'}`,
                        borderRadius: '4px',
                        fontFamily: 'inherit',
                        fontSize: '14px',
                        background: currentSegmentIdx === -1 ? '#f1f5f9' : '#ffffff',
                        color: currentSegmentIdx === -1 ? '#94a3b8' : '#000',
                        cursor: currentSegmentIdx === -1 ? 'not-allowed' : 'text',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  
                  <div className="vsp-field-editable-block" style={{ 
                    flex: '1',
                    background: currentSegmentIdx === -1 ? 'rgba(59,130,246,0.02)' : 'rgba(59,130,246,0.05)', 
                    padding: '0.75em', 
                    borderRadius: '8px',
                    border: `1px solid ${currentSegmentIdx === -1 ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.2)'}`
                  }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '0.5em', 
                      fontWeight: 'bold',
                      color: currentSegmentIdx === -1 ? '#94a3b8' : '#1e293b'
                    }}>
                      Prosody 2:
                      {saveStatus['prosody 2'] && (
                        <span style={{
                          marginLeft: '0.5em',
                          fontSize: '0.8em',
                          fontWeight: 'normal',
                          color: saveStatus['prosody 2'] === 'saving' ? '#f59e0b' :
                                 saveStatus['prosody 2'] === 'saved-local' ? '#10b981' :
                                 saveStatus['prosody 2'] === 'saved' ? '#059669' :
                                 saveStatus['prosody 2'] === 'error' ? '#ef4444' : '#6b7280'
                        }}>
                          {saveStatus['prosody 2'] === 'saving' ? '⏳ Guardando...' :
                           saveStatus['prosody 2'] === 'saved-local' ? '💾 Guardado localmente' :
                           saveStatus['prosody 2'] === 'saved' ? '✅ Guardado' :
                           saveStatus['prosody 2'] === 'error' ? '❌ Error' : ''}
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={editableProsody2}
                      onChange={(e) => setEditableProsody2(e.target.value)}
                      onBlur={(e) => handleFieldBlur('prosody 2', e.target.value)}
                      placeholder="Escribe aquí la emoción secundaria..."
                      disabled={currentSegmentIdx === -1}
                      style={{
                        width: '100%',
                        padding: '0.4em',
                        border: `1px solid ${currentSegmentIdx === -1 ? '#e2e8f0' : '#cbd5e1'}`,
                        borderRadius: '4px',
                        fontFamily: 'inherit',
                        fontSize: '14px',
                        background: currentSegmentIdx === -1 ? '#f1f5f9' : '#ffffff',
                        color: currentSegmentIdx === -1 ? '#94a3b8' : '#000',
                        cursor: currentSegmentIdx === -1 ? 'not-allowed' : 'text',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            gap: '1em',
            width: '100%',
            maxWidth: '1800px'
          }}>
            {/* Sidebar de controles */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.5em',
              padding: '0.5em',
              background: '#374151',
              borderRadius: '8px',
              minWidth: '80px'
            }}>
              {/* Controles de zoom */}
              <button
                onClick={() => setZoomLevel(z => Math.max(0.1, z - 0.25))}
                title="Zoom Out"
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '50%',
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#fff',
                  transition: 'background 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>-</span>
              </button>
              <button
                onClick={() => setZoomLevel(z => Math.min(5, z + 0.25))}
                title="Zoom In"
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '50%',
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#fff',
                  transition: 'background 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>+</span>
              </button>
              
              {/* Controles de navegación */}
              <button 
                onClick={goToPrevSegment} 
                disabled={currentSegmentIdx <= 0}
                title="Segmento Anterior"
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '50%',
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: currentSegmentIdx <= 0 ? 'not-allowed' : 'pointer',
                  color: currentSegmentIdx <= 0 ? 'rgba(255,255,255,0.3)' : '#fff',
                  transition: 'background 0.2s'
                }}
                onMouseOver={e => {
                  if (currentSegmentIdx > 0) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  }
                }}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                <ArrowLeftIcon style={{ fontSize: '20px' }} />
              </button>
              <button 
                onClick={goToNextSegment} 
                disabled={currentSegmentIdx >= segments.length - 1}
                title="Segmento Siguiente"
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '50%',
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: currentSegmentIdx >= segments.length - 1 ? 'not-allowed' : 'pointer',
                  color: currentSegmentIdx >= segments.length - 1 ? 'rgba(255,255,255,0.3)' : '#fff',
                  transition: 'background 0.2s'
                }}
                onMouseOver={e => {
                  if (currentSegmentIdx < segments.length - 1) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  }
                }}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                <ArrowRightIcon style={{ fontSize: '20px' }} />
              </button>
            </div>
            
            {/* Contenedor del waveform */}
            <div className="vsp-waveform-container" style={{ flex: 1 }}>
              <div id="waveform" className="vsp-waveform" />
              <div id="timeline" className="vsp-timeline" />
            </div>
          </div>
          <div className="vsp-segments">
            {segments.map((seg, idx) => (
              <button
                key={seg.id}
                onClick={() => { setCurrentSegmentIdx(idx); goToSegment(seg.start); }}
                className="vsp-segment-btn"
                style={idx === currentSegmentIdx ? { 
                  border: '2px solid #ea580c', 
                  background: '#ea580c',
                  color: '#fff'
                } : {}}
              >
                #{seg.id} ({(seg.start/1000).toFixed(1)}s - {(seg.end/1000).toFixed(1)}s)
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoSegmentPlayer;