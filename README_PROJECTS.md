# 🎬 Sistema de Proyectos de Video

## Descripción

Este sistema permite a los usuarios autenticados acceder a una lista de proyectos de video, ver detalles de cada proyecto y reproducir videos con funcionalidades avanzadas de segmentación.

## 🚀 Funcionalidades Implementadas

### 1. **Lista de Proyectos**
- ✅ Fetch automático de proyectos desde la API
- ✅ Diseño responsive con grid de tarjetas
- ✅ Estados de loading, error y empty
- ✅ Thumbnails y preview de proyectos
- ✅ Información básica (nombre, fecha, ID)

### 2. **Detalle de Proyecto**
- ✅ Vista detallada de cada proyecto
- ✅ Reproductor de video integrado
- ✅ Información completa del proyecto
- ✅ Controles de video personalizados
- ✅ Soporte para URLs de Google Drive

### 3. **Reproductor Avanzado**
- ✅ Integración con VideoSegmentPlayer existente
- ✅ Carga automática de video y segmentos
- ✅ Wave surfer con regiones
- ✅ Sincronización video-waveform
- ✅ Controles de reproducción avanzados

### 4. **Navegación**
- ✅ Flujo intuitivo: Login → Lista → Detalle → Reproductor
- ✅ Botones de navegación entre vistas
- ✅ Estado persistente durante la sesión

## 📁 Estructura de Archivos

```
src/
├── components/
│   ├── ProjectList.jsx      # Lista de proyectos
│   ├── ProjectDetail.jsx    # Detalle y reproductor básico
│   └── Login.jsx           # Componente de autenticación
├── hooks/
│   └── useProjects.js      # Hooks personalizados para proyectos
├── services/
│   └── api.js             # Servicio de API actualizado
├── config.js              # Configuración de endpoints
└── App.jsx               # Componente principal con navegación
```

## 🔧 Configuración

### Endpoints de API

```javascript
// config.js
export const API_ENDPOINTS = {
  LOGIN: '/api/auth/login',
  PROJECT: (id) => `/api/projects/${id}`,
  PROJECTS: '/api/projects',        // Nuevo
  SEGMENTS: '/api/segments'
};
```

### Servicio de API

```javascript
// services/api.js
class ApiService {
  // Obtener todos los proyectos
  async getAllProjects() { ... }
  
  // Obtener proyecto específico
  async getProject(projectId) { ... }
  
  // Obtener segmentos
  async getSegments() { ... }
}
```

## 🎯 Flujo de Usuario

### 1. **Autenticación**
```
Usuario ingresa credenciales → Login exitoso → Redirección automática a lista de proyectos
```

### 2. **Navegación de Proyectos**
```
Lista de Proyectos → Click en proyecto → Detalle del Proyecto → Botón "Abrir Reproductor" → VideoSegmentPlayer
```

### 3. **Reproducción**
```
VideoSegmentPlayer → Carga automática de video y segmentos → Wave surfer con regiones → Reproducción sincronizada
```

## 🎨 Características de UI/UX

### Diseño Responsive
- ✅ Grid adaptativo para diferentes tamaños de pantalla
- ✅ Controles de video optimizados para móviles
- ✅ Navegación intuitiva con botones claros

### Estados de Carga
- ✅ Loading spinners durante fetch de datos
- ✅ Mensajes de error descriptivos
- ✅ Estados empty para listas vacías

### Animaciones
- ✅ Hover effects en tarjetas de proyectos
- ✅ Transiciones suaves entre vistas
- ✅ Feedback visual en controles

## 🔌 Integración con APIs

### Formato de Respuesta Esperado

```javascript
// GET /api/projects
{
  "success": true,
  "data": {
    "projects": [
      {
        "_id": "project_id",
        "name": "Nombre del Proyecto",
        "description": "Descripción opcional",
        "video": "https://drive.google.com/...",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
      }
    ]
  }
}

// GET /api/projects/{project_id}
{
  "success": true,
  "data": {
    "project": {
      "_id": "project_id",
      "name": "Nombre del Proyecto",
      "video": "https://drive.google.com/...",
      "created_at": "2024-01-01T00:00:00Z"
    }
  }
}
```

### Soporte para Google Drive

El sistema incluye conversión automática de URLs de Google Drive:

```javascript
// Conversión automática
const getVideoUrl = (url) => {
  if (url.includes('drive.google.com/file/d/')) {
    const fileId = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/)?.[1];
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }
  return url;
};
```

## 🚀 Uso

### 1. **Iniciar la aplicación**
```bash
cd front_taller
npm run dev
```

### 2. **Flujo de uso**
1. Ingresar credenciales en el login
2. Ver lista de proyectos disponibles
3. Hacer click en un proyecto para ver detalles
4. Usar "Abrir Reproductor" para acceder al VideoSegmentPlayer
5. Reproducir video con segmentos y wave surfer

## 🔧 Personalización

### Modificar estilos
Los componentes usan CSS-in-JS para fácil personalización:

```javascript
// Ejemplo de personalización de tarjeta de proyecto
<div style={{
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  borderRadius: '12px',
  padding: '1.5rem',
  // ... más estilos
}}>
```

### Agregar nuevas funcionalidades
Los hooks personalizados facilitan la extensión:

```javascript
// hooks/useProjects.js
export const useProjects = () => {
  // Lógica reutilizable para proyectos
};

export const useProject = (projectId) => {
  // Lógica reutilizable para proyecto específico
};
```

## 🐛 Solución de Problemas

### Error de CORS
- Verificar configuración del servidor backend
- Asegurar que los endpoints estén correctamente configurados

### Videos no se reproducen
- Verificar formato de URL de Google Drive
- Comprobar permisos de acceso al archivo

### Segmentos no se cargan
- Verificar endpoint de segmentos
- Comprobar formato de respuesta de la API

## 📝 Notas Técnicas

- **React Hooks**: Uso extensivo de hooks personalizados para lógica reutilizable
- **Estado Global**: Manejo de estado con useState en App.jsx
- **Navegación**: Sistema de vistas basado en estado (no requiere react-router)
- **Responsive**: Diseño mobile-first con CSS Grid y Flexbox
- **Performance**: Lazy loading y optimización de re-renders

## 🎯 Próximas Mejoras

- [ ] Implementar react-router para URLs más limpias
- [ ] Agregar sistema de favoritos
- [ ] Implementar búsqueda y filtros
- [ ] Agregar paginación para listas grandes
- [ ] Implementar cache de proyectos
- [ ] Agregar notificaciones push
- [ ] Implementar modo offline 