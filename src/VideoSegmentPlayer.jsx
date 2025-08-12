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

function VideoSegmentPlayer({ hideUpload, segments: propSegments = [], projectData, selectedActivity = 'actividad1' }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const wavesurferRef = useRef(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [currentSegmentIdx, setCurrentSegmentIdx] = useState(-1);
  const [waveLoading, setWaveLoading] = useState(false);
  // Estado para forzar re-renderizado del tiempo
  const [currentTime, setCurrentTime] = useState(0);
  
  // Estado para controlar si el usuario está haciendo seek manual
  const [isUserSeeking, setIsUserSeeking] = useState(false);
  
  // Estado para el tiempo sincronizado entre video y WaveSurfer
  const [synchronizedTime, setSynchronizedTime] = useState(0);
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
  const [editableProsody3, setEditableProsody3] = useState(''); // Nuevo campo para prosody 3
  const [editableMemory, setEditableMemory] = useState(''); // Nuevo campo para el recuerdo activado
  
  // Estado para mostrar feedback de guardado
  const [saveStatus, setSaveStatus] = useState({});

  // Emociones basadas en la rueda de emociones
  const emotions = [
    // Joy (Alegría)
    { value: 'SERENIDAD', label: 'SERENIDAD (Serenidad)', category: 'Joy' },
    { value: 'JOY', label: 'JOY (Alegría)', category: 'Joy' },
    { value: 'ECSTASY', label: 'ECSTASY (Éxtasis)', category: 'Joy' },
    
    // Trust (Confianza)
    { value: 'ACEPTACION', label: 'ACEPTACIÓN (Aceptación)', category: 'Trust' },
    { value: 'TRUST', label: 'TRUST (Confianza)', category: 'Trust' },
    { value: 'LOVE', label: 'LOVE (Amor)', category: 'Trust' },
    
    // Fear (Miedo)
    { value: 'APRENSION', label: 'APRENSIÓN (Aprensión)', category: 'Fear' },
    { value: 'FEAR', label: 'FEAR (Miedo)', category: 'Fear' },
    { value: 'TERROR', label: 'TERROR (Terror)', category: 'Fear' },
    
    // Surprise (Sorpresa)
    { value: 'DISTRACCION', label: 'DISTRACCIÓN (Distracción)', category: 'Surprise' },
    { value: 'SURPRISE', label: 'SURPRISE (Sorpresa)', category: 'Surprise' },
    { value: 'ASOMBRO', label: 'ASOMBRO (Asombro)', category: 'Surprise' },
    
    // Sadness (Tristeza)
    { value: 'PENSATIVO', label: 'PENSATIVO (Pensativo)', category: 'Sadness' },
    { value: 'SADNESS', label: 'SADNESS (Tristeza)', category: 'Sadness' },
    { value: 'GRIEF', label: 'GRIEF (Pena)', category: 'Sadness' },
    
    // Disgust (Disgusto)
    { value: 'ABURRIMIENTO', label: 'ABURRIMIENTO (Aburrimiento)', category: 'Disgust' },
    { value: 'DISGUST', label: 'DISGUST (Disgusto)', category: 'Disgust' },
    { value: 'ASCO', label: 'ASCO (Asco)', category: 'Disgust' },
    
    // Anger (Enfado)
    { value: 'MOLESTIA', label: 'MOLESTIA (Molestia)', category: 'Anger' },
    { value: 'ANGER', label: 'ANGER (Enfado)', category: 'Anger' },
    { value: 'RAGE', label: 'RAGE (Ira)', category: 'Anger' },
    
    // Anticipation (Anticipación)
    { value: 'INTERES', label: 'INTERÉS (Interés)', category: 'Anticipation' },
    { value: 'ANTICIPATION', label: 'ANTICIPATION (Anticipación)', category: 'Anticipation' },
    { value: 'VIGILANCIA', label: 'VIGILANCIA (Vigilancia)', category: 'Anticipation' },
    
    // Combinaciones
    { value: 'OPTIMISMO', label: 'OPTIMISMO (Optimismo)', category: 'Combination' },
    { value: 'SUBMISION', label: 'SUBMISIÓN (Sumisión)', category: 'Combination' },
    { value: 'AWE', label: 'AWE (Temor)', category: 'Combination' },
    { value: 'DESAPROBACION', label: 'DESAPROBACIÓN (Desaprobación)', category: 'Combination' },
    { value: 'REMORDIMIENTO', label: 'REMORDIMIENTO (Remordimiento)', category: 'Combination' },
    { value: 'CONTEMPT', label: 'CONTEMPT (Desprecio)', category: 'Combination' },
    { value: 'AGRESIVIDAD', label: 'AGRESIVIDAD (Agresividad)', category: 'Combination' }
  ];

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
      return { description: '', prosody1: '', prosody2: '', prosody3: '', memory: '' };
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
      return { description: '', prosody1: '', prosody2: '', prosody3: '', memory: '' };
    }
    
    const userEntry = fullSegment.descriptions_prosody.find(entry => entry.user_id === user._id);
    console.log('🔍 getUserDescriptionProsody - Entrada del usuario encontrada:', userEntry);
    
    if (!userEntry) {
      console.log('❌ No se encontró entrada para el usuario actual');
      return { description: '', prosody1: '', prosody2: '', prosody3: '', memory: '' };
    }
    
    const result = {
      description: userEntry.description || '',
      prosody1: userEntry['prosody 1'] || '',
      prosody2: userEntry['prosody 2'] || '',
      prosody3: userEntry['prosody 3'] || '',
      memory: userEntry.memory || ''
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
      setEditableProsody3(userData.prosody3);
      setEditableMemory(userData.memory);
    } else {
      // Limpiar campos si no hay segmento seleccionado
      setEditableDescription('');
      setEditableProsody1('');
      setEditableProsody2('');
      setEditableProsody3('');
      setEditableMemory('');
    }
  }, [currentSegmentIdx, segments, user]);

          // Resetear estado de carga cuando cambian los datos del proyecto
  useEffect(() => {
    if (projectData) {
      setIsFullyLoaded(false);
    }
  }, [projectData]);

  // Cargar video y audio del proyecto cuando esté disponible
  useEffect(() => {
    if (projectData) {
      console.log("🎬 Cargando proyecto:", projectData);
      
      // Procesar URL del video
      let processedVideoUrl = projectData.video;
      let processedAudioUrl = null;

      // Priorizar audiofinal si está disponible, sino usar el audio del video
      if (projectData.audiofinal) {
        console.log("🎵 Usando audiofinal del proyecto:", projectData.audiofinal);
        processedAudioUrl = projectData.audiofinal;
      } else if (projectData.audio) {
        console.log("🎵 Usando audio del proyecto:", projectData.audio);
        processedAudioUrl = projectData.audio;
      } else if (projectData.video) {
        console.log("🎵 Generando audio desde el video:", projectData.video);
        if (isCloudinaryUrl(projectData.video)) {
          processedAudioUrl = generateAudioUrl(projectData.video);
        } else {
          processedAudioUrl = projectData.video;
        }
      }

      if (isCloudinaryUrl(projectData.video)) {
        console.log("☁️ Detectada URL de Cloudinary, procesando...");
        processedVideoUrl = processCloudinaryUrl(projectData.video);
        console.log("✅ URLs procesadas para Cloudinary:", { video: processedVideoUrl, audio: processedAudioUrl });
      } else {
        console.log("🔗 URL directa detectada:", projectData.video);
      }
      
      setVideoUrl(processedVideoUrl);
      setAudioUrl(processedAudioUrl);
      setWaveLoading(true);
    }
  }, [projectData]);

  // Función para sincronización completa entre video, audio y WaveSurfer
  const syncAllMedia = (targetTime, source = 'video') => {
    try {
      if (!videoRef.current || !wavesurferRef.current) return;
      
      const video = videoRef.current;
      const audio = audioRef.current;
      
      if (source === 'wavesurfer') {
        // Si el cambio viene de WaveSurfer, sincronizar video y audio
        if (video.duration) {
          video.currentTime = targetTime;
          if (audio && projectData?.audiofinal) {
            audio.currentTime = targetTime;
          }
          // Actualizar el tiempo sincronizado
          setCurrentTime(targetTime);
          setSynchronizedTime(targetTime);
        }
      } else if (source === 'region') {
        // Si el cambio viene de una región, sincronizar todo
        if (video.duration) {
          video.currentTime = targetTime;
          if (audio && projectData?.audiofinal) {
            audio.currentTime = targetTime;
          }
          // Actualizar el tiempo sincronizado
          setCurrentTime(targetTime);
          setSynchronizedTime(targetTime);
          // Sincronizar WaveSurfer después de un pequeño delay para evitar conflictos
          setTimeout(() => {
            if (wavesurferRef.current && video.duration) {
              const progress = targetTime / video.duration;
              wavesurferRef.current.seekTo(progress);
            }
          }, 50);
        }
      } else {
        // Si el cambio viene del video, sincronizar WaveSurfer y audio
        if (video.duration) {
          const progress = targetTime / video.duration;
          if (wavesurferRef.current) {
            wavesurferRef.current.seekTo(progress);
          }
          if (audio && projectData?.audiofinal) {
            audio.currentTime = targetTime;
          }
          // Actualizar el tiempo sincronizado
          setCurrentTime(targetTime);
          setSynchronizedTime(targetTime);
        }
      }
    } catch (error) {
      console.error('Error en sincronización completa:', error);
    }
  };

  // Sincronizar cuando el video se carga completamente
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !wavesurferRef.current) return;

    const handleLoadedMetadata = () => {
      console.log("🎬 Video metadata cargado, sincronizando con WaveSurfer...");
      if (video.duration && wavesurferRef.current) {
        // Sincronizar la posición inicial
        const currentProgress = video.currentTime / video.duration;
        wavesurferRef.current.seekTo(currentProgress);
      }
    };

    const handleCanPlay = () => {
      console.log("🎬 Video listo para reproducir");
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [videoUrl, wavesurferRef.current]);

  // Sincronización principal entre video, audio y WaveSurfer
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !wavesurferRef.current) return;

    const handleTimeUpdate = () => {
      if (!isUserSeeking && video.duration) {
        try {
          const progress = video.currentTime / video.duration;
          wavesurferRef.current.seekTo(progress);
          
          // Actualizar el tiempo sincronizado
          setCurrentTime(video.currentTime);
          setSynchronizedTime(video.currentTime);
        } catch (error) {
          console.warn('Error sincronizando WaveSurfer:', error);
        }
        
        // Buscar el segmento correspondiente al tiempo actual del video
        const currentTime = video.currentTime;
        const currentTimeMs = currentTime * 1000;
        const idx = segments.findIndex(seg => currentTimeMs >= seg.start && currentTimeMs <= seg.end);
        setCurrentSegmentIdx(idx !== -1 ? idx : -1);
      }
    };

    const handlePlay = () => {
      try {
        // Sincronizar audio si está disponible
        if (audio && projectData?.audiofinal) {
          audio.currentTime = video.currentTime;
        }
        // Sincronizar WaveSurfer
        if (wavesurferRef.current && !wavesurferRef.current.isPlaying()) {
          wavesurferRef.current.play();
        }
      } catch (error) {
        console.warn('Error iniciando reproducción:', error);
      }
    };

    const handlePause = () => {
      try {
        // Pausar audio si está disponible
        if (audio && projectData?.audiofinal) {
          audio.pause();
        }
        // Pausar WaveSurfer
        if (wavesurferRef.current && wavesurferRef.current.isPlaying()) {
          wavesurferRef.current.pause();
        }
      } catch (error) {
        console.warn('Error pausando reproducción:', error);
      }
    };

    const handleSeeked = () => {
      try {
        // Sincronizar audio después del seek
        if (audio && projectData?.audiofinal) {
          audio.currentTime = video.currentTime;
        }
        // Sincronizar WaveSurfer después del seek
        if (video.duration && wavesurferRef.current) {
          const progress = video.currentTime / video.duration;
          wavesurferRef.current.seekTo(progress);
        }
        // Actualizar el tiempo sincronizado
        setCurrentTime(video.currentTime);
        setSynchronizedTime(video.currentTime);
      } catch (error) {
        console.warn('Error sincronizando después del seek:', error);
      }
    };

    // Sincronizar cuando el usuario arrastra la barra de progreso del video
    const handleSeeking = () => {
      if (!isUserSeeking && video.duration && wavesurferRef.current) {
        try {
          const progress = video.currentTime / video.duration;
          wavesurferRef.current.seekTo(progress);
          // Actualizar el tiempo sincronizado
          setCurrentTime(video.currentTime);
          setSynchronizedTime(video.currentTime);
        } catch (error) {
          console.warn('Error sincronizando durante seek del video:', error);
        }
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('seeking', handleSeeking);
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('seeking', handleSeeking);
    };
  }, [isUserSeeking, segments, projectData?.audiofinal]);

  // Actualizar tiempo cada 100ms para mostrar en la UI
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => {
      // Obtener el tiempo del video
      const videoTime = video.currentTime || 0;
      
      // Obtener el tiempo de WaveSurfer si está disponible
      let wavesurferTime = 0;
      if (wavesurferRef.current && video.duration) {
        try {
          const progress = wavesurferRef.current.getCurrentTime() || 0;
          wavesurferTime = progress;
        } catch (error) {
          console.warn('Error obteniendo tiempo de WaveSurfer:', error);
        }
      }
      
      // Usar el tiempo del video como fuente principal, pero verificar que esté sincronizado
      let finalTime = videoTime;
      
      // Si hay una diferencia significativa entre video y WaveSurfer, usar el de WaveSurfer
      if (Math.abs(videoTime - wavesurferTime) > 0.5 && wavesurferTime > 0) {
        console.log('🔄 Corrigiendo desincronización:', { videoTime, wavesurferTime });
        finalTime = wavesurferTime;
        
        // Sincronizar el video si hay mucha diferencia
        if (Math.abs(videoTime - wavesurferTime) > 1) {
          try {
            video.currentTime = wavesurferTime;
            console.log('✅ Video sincronizado con WaveSurfer');
          } catch (error) {
            console.warn('Error sincronizando video:', error);
          }
        }
      }
      
      setCurrentTime(finalTime);
      setSynchronizedTime(finalTime);
    };

    const interval = setInterval(updateTime, 100);
    return () => clearInterval(interval);
  }, [wavesurferRef.current]);

  // Sincronizar audio con video cuando se hace seek manual
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    
    if (!video || !audio || !projectData?.audiofinal) return;

    const handleSeeking = () => {
      if (!isUserSeeking) {
        audio.currentTime = video.currentTime;
      }
    };

    video.addEventListener('seeking', handleSeeking);
    return () => video.removeEventListener('seeking', handleSeeking);
  }, [projectData?.audiofinal, isUserSeeking]);

  // Función para formatear tiempo en formato MM:SS.S
  const formatTime = (timeInSeconds) => {
    if (!timeInSeconds || isNaN(timeInSeconds)) return '0:00.0';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = (timeInSeconds % 60).toFixed(1);
    return `${minutes}:${seconds.padStart(4, '0')}`;
  };

  // useEffect principal para inicializar WaveSurfer
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
            backend: "MediaElement",
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
        if (projectData?.audiofinal) {
          // Si tenemos audiofinal, conectar WaveSurfer al elemento de audio
          wavesurferRef.current.load(audioUrl, null, audioRef.current);
        } else {
          wavesurferRef.current.load(audioUrl);
        }
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

        // Evento cuando el usuario hace clic en una región
        regionsPlugin.on('region-clicked', (region, e) => {
          console.log("Región clickeada:", region.id);
          e.stopPropagation();
          const segmentId = Number(region.id);
          const segment = segments.find(seg => seg.id === segmentId);
          if (segment) {
            setIsUserSeeking(true);
            const startTimeInSeconds = segment.start / 1000;
            
            // Usar la función de sincronización completa
            syncAllMedia(startTimeInSeconds, 'region');
            
            setCurrentSegmentIdx(segments.findIndex(seg => seg.id === segmentId));
            setTimeout(() => setIsUserSeeking(false), 200);
          }
        });

        // Evento cuando el usuario hace clic en el WaveSurfer
        wavesurferRef.current.on('seek', (progress) => {
          if (!isUserSeeking) {
            setIsUserSeeking(true);
            
            // Usar la función de sincronización completa
            if (videoRef.current && videoRef.current.duration) {
              const targetTime = progress * videoRef.current.duration;
              syncAllMedia(targetTime, 'wavesurfer');
            }
            
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
            
            // Actualizar el tiempo sincronizado inmediatamente
            setCurrentTime(currentTime);
            setSynchronizedTime(currentTime);
            
            setTimeout(() => setIsUserSeeking(false), 200);
          }
        });

        // Evento adicional para sincronización en tiempo real de WaveSurfer
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
            
            // Actualizar el tiempo sincronizado desde WaveSurfer
            setCurrentTime(time);
            setSynchronizedTime(time);
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
      
      // Usar la función de sincronización completa
      syncAllMedia(startInSeconds, 'region');
      
      // Reproducir el video
      videoRef.current.play();
      
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
    console.log('='.repeat(80));
    console.log('🚀 INICIO DE handleFieldBlur');
    console.log('='.repeat(80));
    
    // 1. PARÁMETROS RECIBIDOS
    console.log('📥 PARÁMETROS RECIBIDOS:');
    console.log('   fieldName:', fieldName);
    console.log('   fieldValue:', fieldValue);
    console.log('   Tipo de fieldName:', typeof fieldName);
    console.log('   Tipo de fieldValue:', typeof fieldValue);
    
    // 2. VERIFICACIÓN DE ESTADO
    console.log('🔍 VERIFICACIÓN DE ESTADO:');
    console.log('   currentSegmentIdx:', currentSegmentIdx);
    console.log('   user:', user);
    console.log('   user._id:', user?._id);
    console.log('   segments:', segments);
    console.log('   segments[currentSegmentIdx]:', segments[currentSegmentIdx]);
    
    if (currentSegmentIdx === -1 || !user || !segments[currentSegmentIdx]) {
      console.log('❌ VALIDACIÓN FALLIDA:');
      console.log('   currentSegmentIdx === -1:', currentSegmentIdx === -1);
      console.log('   !user:', !user);
      console.log('   !segments[currentSegmentIdx]:', !segments[currentSegmentIdx]);
      console.log('❌ No se puede guardar: segmento no seleccionado o usuario no autenticado');
      return;
    }
    
    // 3. EXTRACCIÓN DE DATOS
    const segmentId = segments[currentSegmentIdx]._id;
    const userId = user._id;
    const timestamp = new Date().toISOString();
    
    console.log('🔑 DATOS EXTRAÍDOS:');
    console.log('   segmentId:', segmentId);
    console.log('   userId:', userId);
    console.log('   timestamp:', timestamp);
    
    // 4. ESTADO DE GUARDADO
    console.log('💾 ACTUALIZANDO ESTADO DE GUARDADO...');
    setSaveStatus(prev => ({ ...prev, [fieldName]: 'saving' }));
    console.log('   Estado de guardado actualizado a "saving"');
    
    try {
      // 5. ACTUALIZACIÓN LOCAL
      console.log('🏠 INICIANDO ACTUALIZACIÓN LOCAL...');
      
      if (projectData && projectData._id) {
        console.log('📊 projectData disponible:', {
          id: projectData._id,
          name: projectData.name,
          segments: projectData.segments?.length || 0
        });
        
        // Buscar el proyecto en localStorage
        const storedProject = localStorage.getItem('currentProject');
        console.log('🔍 localStorage.getItem("currentProject"):', storedProject ? 'ENCONTRADO' : 'NO ENCONTRADO');
        
        if (storedProject) {
          const project = JSON.parse(storedProject);
          console.log('📦 PROYECTO EN localStorage:');
          console.log('   ID:', project._id);
          console.log('   Nombre:', project.name);
          console.log('   Segmentos:', project.segments?.length || 0);
          
          // Buscar el segmento específico
          const targetSegment = project.segments?.find(s => s._id === segmentId);
          console.log('🎯 SEGMENTO OBJETIVO EN localStorage:');
          console.log('   Encontrado:', !!targetSegment);
          console.log('   Segmento:', targetSegment);
          
          if (targetSegment) {
            console.log('📝 DESCRIPTIONS_PROSODY ACTUAL:');
            console.log('   Original:', targetSegment.descriptions_prosody);
            console.log('   Tipo:', typeof targetSegment.descriptions_prosody);
            console.log('   Es array:', Array.isArray(targetSegment.descriptions_prosody));
            
            const existingDescriptionsProsody = targetSegment.descriptions_prosody || [];
            const existingUserIndex = existingDescriptionsProsody.findIndex(
              entry => entry.user_id === userId
            );
            
            console.log('👤 BÚSQUEDA DE USUARIO EXISTENTE:');
            console.log('   existingUserIndex:', existingUserIndex);
            console.log('   existingDescriptionsProsody:', existingDescriptionsProsody);
            
            let updatedDescriptionsProsody;
            if (existingUserIndex >= 0) {
              console.log('✏️ ACTUALIZANDO ENTRADA EXISTENTE...');
              updatedDescriptionsProsody = [...existingDescriptionsProsody];
              const oldEntry = updatedDescriptionsProsody[existingUserIndex];
              console.log('   Entrada anterior:', oldEntry);
              
              updatedDescriptionsProsody[existingUserIndex] = {
                ...oldEntry,
                [fieldName]: fieldValue,
                timestamp: timestamp
              };
              
              console.log('   Entrada actualizada:', updatedDescriptionsProsody[existingUserIndex]);
            } else {
              console.log('🆕 CREANDO NUEVA ENTRADA...');
              const newEntry = {
                user_id: userId,
                [fieldName]: fieldValue,
                timestamp: timestamp
              };
              console.log('   Nueva entrada:', newEntry);
              
              updatedDescriptionsProsody = [
                ...existingDescriptionsProsody,
                newEntry
              ];
            }
            
            console.log('💾 DESCRIPTIONS_PROSODY FINAL:');
            console.log('   Array completo:', updatedDescriptionsProsody);
            console.log('   Cantidad de entradas:', updatedDescriptionsProsody.length);
            
            // Actualizar el proyecto
            const updatedProject = {
              ...project,
              segments: project.segments.map(segment => {
                if (segment._id !== segmentId) return segment;
                
                return {
                  ...segment,
                  descriptions_prosody: updatedDescriptionsProsody
                };
              })
            };
            
            // Guardar en localStorage
            console.log('💾 GUARDANDO EN localStorage...');
            localStorage.setItem('currentProject', JSON.stringify(updatedProject));
            console.log('   ✅ currentProject guardado');
            
            // Actualizar segmentos en localStorage
            const updatedSegments = updatedProject.segments.map((segment, index) => ({
              id: index + 1,
              start: segment.start_time * 1000,
              end: segment.end_time * 1000,
              duration: segment.duration || (segment.end_time - segment.start_time),
              description: segment.description || '',
              prosody: segment.prosody || '',
              prosody2: segment.prosody2 || '',
              prosody3: segment.prosody3 || '',
              views: segment.views || 0,
              likes: segment.likes || 0,
              _id: segment._id,
              projectid: segment.project_id,
              descriptions_prosody: segment.descriptions_prosody || []
            }));
            
            localStorage.setItem('currentSegments', JSON.stringify(updatedSegments));
            console.log('   ✅ currentSegments guardado');
            
            // Actualizar estado local
            setSegments(updatedSegments);
            console.log('   ✅ Estado local actualizado');
            
            // Actualizar estado de guardado
            setSaveStatus(prev => ({ ...prev, [fieldName]: 'saved-local' }));
            console.log('   ✅ Estado de guardado: "saved-local"');
            
          } else {
            console.log('⚠️ SEGMENTO NO ENCONTRADO EN localStorage');
          }
        } else {
          console.log('⚠️ PROYECTO NO ENCONTRADO EN localStorage');
        }
      } else {
        console.log('⚠️ projectData NO DISPONIBLE:', {
          projectData: !!projectData,
          projectDataId: projectData?._id
        });
      }
      
      // 6. ENVÍO A BASE DE DATOS
      console.log('🌐 ENVIANDO A BASE DE DATOS...');
      console.log('📤 PARÁMETROS PARA API:');
      console.log('   segmentId:', segmentId);
      console.log('   userId:', userId);
      console.log('   fieldName:', fieldName);
      console.log('   fieldValue:', fieldValue);
      console.log('   timestamp:', timestamp);
      
      const apiParams = {
        segmentId,
        userId,
        fieldName,
        fieldValue,
        timestamp
      };
      console.log('📦 OBJETO COMPLETO:', apiParams);
      
      await apiService.postDescriptionProsody(apiParams);
      console.log('✅ API RESPONDIDA EXITOSAMENTE');
      
      // 7. ESTADO FINAL
      setSaveStatus(prev => ({ ...prev, [fieldName]: 'saved' }));
      console.log('💾 ESTADO FINAL: "saved"');
      
      // 8. LIMPIEZA
      setTimeout(() => {
        setSaveStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[fieldName];
          return newStatus;
        });
        console.log('🧹 ESTADO LIMPIADO');
      }, 2000);
      
      console.log('='.repeat(80));
      console.log('🎉 handleFieldBlur COMPLETADO EXITOSAMENTE');
      console.log('='.repeat(80));
      
    } catch (err) {
      console.error('='.repeat(80));
      console.error('💥 ERROR EN handleFieldBlur');
      console.error('='.repeat(80));
      console.error('❌ Error completo:', err);
      console.error('📋 Stack trace:', err.stack);
      console.error('🔍 Contexto del error:');
      console.error('   fieldName:', fieldName);
      console.error('   fieldValue:', fieldValue);
      console.error('   segmentId:', segmentId);
      console.error('   userId:', userId);
      console.error('   timestamp:', timestamp);
      
      setSaveStatus(prev => ({ ...prev, [fieldName]: 'error' }));
      console.error('💾 Estado de guardado: "error"');
      
      // Limpiar estado de error
      setTimeout(() => {
        setSaveStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[fieldName];
          return newStatus;
        });
        console.error('🧹 Estado de error limpiado');
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
                <p style={{ margin: '0.5rem 0' }}>
                  🎵 {projectData.audiofinal ? 'Usando audio final del proyecto' : 'Generando onda de audio desde video'}...
                </p>
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
            {/* Columna del video (ahora solo audio) */}
            <div style={{ flex: '1', maxWidth: '900px' }}>
              {/* Elemento de audio para reproducir el audiofinal */}
              {projectData?.audiofinal && (
                <audio
                  ref={audioRef}
                  src={projectData.audiofinal}
                  style={{ display: 'none' }}
                />
              )}
              {/* Video sin controles, solo imagen */}
              <video
                ref={videoRef}
                src={videoUrl}
                style={{ 
                  width: '100%', 
                  maxWidth: '900px',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
                muted={true}
                controls={false}
              />
              
              
            </div>
            
            {/* Columna de campos de texto - Cambia según la actividad seleccionada */}
            <div className="vsp-fields-container" style={{ 
              flex: '1',
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1em',
              minWidth: '400px',
              maxWidth: '900px',
              margin: '0 auto'
            }}>
              {/* Renderizar contenido según la actividad seleccionada */}
              {selectedActivity === 'actividad1' && (
                <>
                  {/* Pregunta de la Actividad 1 - Solo visible cuando hay segmento activo */}
                  {currentSegmentIdx >= 0 && (
                    <div style={{
                      background: 'rgba(59,130,246,0.1)',
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(59,130,246,0.2)',
                      marginBottom: '1rem'
                    }}>
                      <h3 style={{
                        margin: '0 0 0.5rem 0',
                        color: '#1e40af',
                        fontSize: '1.1rem'
                      }}>
                        📝 Actividad 1
                      </h3>
                      <p style={{
                        margin: '0',
                        color: '#374151',
                        fontSize: '1rem',
                        lineHeight: '1.5'
                      }}>
                        ¿Qué emociones sentiste al ver y escuchar la audiodescripción del segmento de video?
                      </p>
                    </div>
                  )}
                  
                  {/* Solo los 3 campos de prosody */}
                  <div style={{
                    opacity: currentSegmentIdx === -1 ? 0.5 : 1,
                    pointerEvents: currentSegmentIdx === -1 ? 'none' : 'auto',
                    transition: 'opacity 0.3s ease'
                  }}>
                    <div className="vsp-fields-prosody-row" style={{ 
                      display: 'flex',
                      gap: '0.75em',
                      flexWrap: 'wrap'
                    }}>
                      <div className="vsp-field-editable-block" style={{ 
                        flex: '1',
                        minWidth: '200px',
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
                        <select
                          value={editableProsody1}
                          onChange={(e) => setEditableProsody1(e.target.value)}
                          onBlur={(e) => handleFieldBlur('prosody 1', e.target.value)}
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
                            cursor: currentSegmentIdx === -1 ? 'not-allowed' : 'pointer',
                            boxSizing: 'border-box'
                          }}
                        >
                          <option value="">Selecciona una emoción...</option>
                          {emotions.map((emotion, index) => (
                            <option key={index} value={emotion.value}>
                              {emotion.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="vsp-field-editable-block" style={{ 
                        flex: '1',
                        minWidth: '200px',
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
                        <select
                          value={editableProsody2}
                          onChange={(e) => setEditableProsody2(e.target.value)}
                          onBlur={(e) => handleFieldBlur('prosody 2', e.target.value)}
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
                            cursor: currentSegmentIdx === -1 ? 'not-allowed' : 'pointer',
                            boxSizing: 'border-box'
                          }}
                        >
                          <option value="">Selecciona una emoción...</option>
                          {emotions.map((emotion, index) => (
                            <option key={index} value={emotion.value}>
                              {emotion.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="vsp-field-editable-block" style={{ 
                        flex: '1',
                        minWidth: '200px',
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
                          Prosody 3:
                          {saveStatus['prosody 3'] && (
                            <span style={{
                              marginLeft: '0.5em',
                              fontSize: '0.8em',
                              fontWeight: 'normal',
                              color: saveStatus['prosody 3'] === 'saving' ? '#f59e0b' :
                                     saveStatus['prosody 3'] === 'saved-local' ? '#10b981' :
                                     saveStatus['prosody 3'] === 'saved' ? '#059669' :
                                     saveStatus['prosody 3'] === 'error' ? '#ef4444' : '#6b7280'
                            }}>
                              {saveStatus['prosody 3'] === 'saving' ? '⏳ Guardando...' :
                               saveStatus['prosody 3'] === 'saved-local' ? '💾 Guardado localmente' :
                               saveStatus['prosody 3'] === 'saved' ? '✅ Guardado' :
                               saveStatus['prosody 3'] === 'error' ? '❌ Error' : ''}
                            </span>
                          )}
                        </label>
                        <select
                          value={editableProsody3}
                          onChange={(e) => setEditableProsody3(e.target.value)}
                          onBlur={(e) => handleFieldBlur('prosody 3', e.target.value)}
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
                            cursor: currentSegmentIdx === -1 ? 'not-allowed' : 'pointer',
                            boxSizing: 'border-box'
                          }}
                        >
                          <option value="">Selecciona una emoción...</option>
                          {emotions.map((emotion, index) => (
                            <option key={index} value={emotion.value}>
                              {emotion.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              {/* Actividad 2 - Campo de texto para recuerdo activado */}
              {selectedActivity === 'actividad2' && (
                <div style={{
                  background: 'rgba(156,163,175,0.1)',
                  padding: '2rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(156,163,175,0.2)'
                }}>
                  <h3 style={{
                    margin: '0 0 1rem 0',
                    color: '#6b7280',
                    fontSize: '1.2rem'
                  }}>
                    📋 Actividad 2
                  </h3>
                  
                  {/* Pregunta de la Actividad 2 - Solo visible cuando hay segmento activo */}
                  {currentSegmentIdx >= 0 && (
                    <div style={{
                      background: 'rgba(255,255,255,0.8)',
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(156,163,175,0.2)',
                      marginBottom: '1rem'
                    }}>
                      <p style={{
                        margin: '0 0 0.5rem 0',
                        color: '#374151',
                        fontSize: '1rem',
                        lineHeight: '1.5',
                        fontWeight: '500'
                      }}>
                        ¿Qué recuerdo se activó en ti a partir de este contenido?
                      </p>
                      
                      {/* Campo de texto editable */}
                      <div style={{
                        opacity: currentSegmentIdx === -1 ? 0.5 : 1,
                        pointerEvents: currentSegmentIdx === -1 ? 'none' : 'auto',
                        transition: 'opacity 0.3s ease'
                      }}>
                        <textarea
                          value={editableMemory}
                          onChange={(e) => setEditableMemory(e.target.value)}
                          onBlur={() => handleFieldBlur('memory', editableMemory)}
                          placeholder="Escribe aquí tu recuerdo..."
                          disabled={currentSegmentIdx === -1}
                          style={{
                            width: '100%',
                            minHeight: '80px',
                            padding: '0.75rem',
                            border: `1px solid ${currentSegmentIdx === -1 ? '#e2e8f0' : '#cbd5e1'}`,
                            borderRadius: '6px',
                            resize: 'vertical',
                            fontFamily: 'inherit',
                            fontSize: '14px',
                            background: currentSegmentIdx === -1 ? '#f1f5f9' : '#ffffff',
                            color: currentSegmentIdx === -1 ? '#94a3b8' : '#374151',
                            cursor: currentSegmentIdx === -1 ? 'not-allowed' : 'text',
                            boxSizing: 'border-box',
                            lineHeight: '1.5'
                          }}
                        />
                        
                        {/* Indicador de estado de guardado */}
                        {saveStatus['memory'] && (
                          <div style={{
                            marginTop: '0.5rem',
                            fontSize: '0.875rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}>
                            {saveStatus['memory'] === 'saving' && (
                              <span style={{ color: '#f59e0b' }}>
                                💾 Guardando...
                              </span>
                            )}
                            {saveStatus['memory'] === 'saved' && (
                              <span style={{ color: '#10b981' }}>
                                ✅ Guardado
                              </span>
                            )}
                            {saveStatus['memory'] === 'error' && (
                              <span style={{ color: '#ef4444' }}>
                                ❌ Error al guardar
                              </span>
                              )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Mensaje cuando no hay segmento seleccionado */}
                  {currentSegmentIdx === -1 && (
                    <div style={{
                      textAlign: 'center',
                      padding: '2rem'
                    }}>
                      <p style={{
                        margin: '0',
                        color: '#9ca3af',
                        fontSize: '1rem'
                      }}>
                        Selecciona un segmento de video para comenzar la actividad.
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Actividad 3 - Descripción original y editable */}
              {selectedActivity === 'actividad3' && (
                <>
                  {/* Pregunta de la Actividad 3 - Solo visible cuando hay segmento activo */}
                  {currentSegmentIdx >= 0 && (
                    <div style={{
                      background: 'rgba(156,163,175,0.1)',
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(156,163,175,0.2)',
                      marginBottom: '1rem'
                    }}>
                      <h3 style={{
                        margin: '0 0 0.5rem 0',
                        color: '#6b7280',
                        fontSize: '1.1rem'
                      }}>
                        📊 Actividad 3
                      </h3>
                      <p style={{
                        margin: '0',
                        color: '#374151',
                        fontSize: '1rem',
                        lineHeight: '1.5'
                      }}>
                        ¿Cómo describirías este segmento de video?
                      </p>
                    </div>
                  )}
                  
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
                  </div>
                </>
              )}
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
              gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
              gap: '0.5em',
              padding: '0.5em',
              background: '#374151',
              borderRadius: '8px',
              minWidth: '200px'
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
              
              {/* Controles de reproducción de video */}
              <button 
                onClick={() => {
                  if (videoRef.current && wavesurferRef.current) {
                    try {
                      if (videoRef.current.paused) {
                        videoRef.current.play();
                        // Sincronizar audio si está disponible
                        if (audioRef.current && projectData?.audiofinal) {
                          audioRef.current.currentTime = videoRef.current.currentTime;
                          audioRef.current.play();
                        }
                        // Iniciar reproducción en WaveSurfer
                        if (wavesurferRef.current && !wavesurferRef.current.isPlaying()) {
                          wavesurferRef.current.play();
                        }
                      } else {
                        videoRef.current.pause();
                        // Pausar audio si está disponible
                        if (audioRef.current && projectData?.audiofinal) {
                          audioRef.current.pause();
                        }
                        // Pausar reproducción en WaveSurfer
                        if (wavesurferRef.current && wavesurferRef.current.isPlaying()) {
                          wavesurferRef.current.pause();
                        }
                      }
                    } catch (error) {
                      console.error('Error en reproducción:', error);
                    }
                  }
                }}
                title="Play/Pause"
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
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>▶</span>
              </button>
              
              {/* Control de retroceder 10 segundos */}
              <button 
                onClick={() => {
                  if (videoRef.current && wavesurferRef.current) {
                    try {
                      const newTime = Math.max(0, videoRef.current.currentTime - 10);
                      videoRef.current.currentTime = newTime;
                      
                      // Sincronizar audio si está disponible
                      if (audioRef.current && projectData?.audiofinal) {
                        audioRef.current.currentTime = newTime;
                      }
                      
                      // Sincronizar WaveSurfer
                      if (videoRef.current.duration) {
                        const progress = newTime / videoRef.current.duration;
                        wavesurferRef.current.seekTo(progress);
                      }
                    } catch (error) {
                      console.error('Error al retroceder:', error);
                    }
                  }
                }}
                title="Retroceder 10s"
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
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>⏪</span>
              </button>
              
              {/* Control de adelantar 10 segundos */}
              <button 
                onClick={() => {
                  if (videoRef.current && wavesurferRef.current) {
                    try {
                      const newTime = Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + 10);
                      videoRef.current.currentTime = newTime;
                      
                      // Sincronizar audio si está disponible
                      if (audioRef.current && projectData?.audiofinal) {
                        audioRef.current.currentTime = newTime;
                      }
                      
                      // Sincronizar WaveSurfer
                      if (videoRef.current.duration) {
                        const progress = newTime / videoRef.current.duration;
                        wavesurferRef.current.seekTo(progress);
                      }
                    } catch (error) {
                      console.error('Error al adelantar:', error);
                    }
                  }
                }}
                title="Adelantar 10s"
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
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>⏩</span>
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
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                }}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                <ArrowRightIcon style={{ fontSize: '20px' }} />
              </button>
            </div>
            
            {/* Contenedor del waveform */}
            <div className="vsp-waveform-container" style={{ flex: 1 }}>
              {/* Indicador de tiempo del video */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '0.5rem',
                padding: '0.5rem',
                background: 'rgba(55, 65, 81, 0.1)',
                borderRadius: '4px',
                fontSize: '0.9rem',
                color: '#374151'
              }}>
                <span>⏱️ Tiempo: {formatTime(synchronizedTime)}</span>
                {videoRef.current?.duration && (
                  <span>/ {formatTime(videoRef.current.duration)}</span>
                )}
              </div>
              
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