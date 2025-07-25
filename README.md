# Video Segment Player

Un reproductor de video con segmentación y análisis de prosodia, integrado con una API REST.

## Características

- 🔐 Autenticación con API REST
- 📹 Reproductor de video con WaveSurfer.js
- 🎯 Segmentación de video con regiones interactivas
- 📊 Análisis de prosodia y emociones
- 📝 Descripciones detalladas por segmento
- 🎨 Interfaz moderna y responsiva

## Configuración

### Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_PROJECT_ID=6882f61f358cfb33745d32ca
```

### Endpoints de la API

La aplicación utiliza los siguientes endpoints:

- `POST /api/auth/login` - Autenticación con email y contraseña
- `GET /api/projects/:id` - Obtener proyecto con su video
- `GET /api/segments` - Obtener todos los segmentos del proyecto

### Estructura de Datos

Los segmentos deben tener la siguiente estructura:

```json
{
  "_id": "68830bb99d7c87af31aeed5e",
  "startTime": 0,
  "endTime": 10.345,
  "duration": 10.345,
  "views": 0,
  "likes": 0,
  "prosody": "Confianza 100%",
  "prosody2": "Aceptación",
  "description": "Una silueta de serpiente blanca destaca en fondo negro...",
  "projectid": "6882f61f358cfb33745d32ca"
}
```

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

## Construcción

```bash
npm run build
```

## Uso

1. **Autenticación**: Ingresa tus credenciales en la pantalla de login
2. **Carga automática**: El proyecto y segmentos se cargan automáticamente
3. **Reproducción**: Usa el reproductor de video con controles de segmentación
4. **Navegación**: Navega entre segmentos usando los botones o haciendo clic en las regiones

## Tecnologías

- React 19
- Vite
- WaveSurfer.js
- CSS3 con gradientes y animaciones
