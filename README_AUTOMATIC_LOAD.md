# 🚀 Carga Automática de Proyectos

## ✨ Nueva Funcionalidad

Después de hacer login exitosamente, la aplicación ahora:

1. **Carga automáticamente** el proyecto configurado en las variables de entorno
2. **Descarga los segmentos** asociados al proyecto
3. **Muestra el reproductor de video** con todos los datos cargados
4. **Procesa URLs de Google Drive** para permitir la reproducción de videos

## 🔧 Configuración

### Opción 1: Configuración Automática
```bash
npm run setup
```

### Opción 2: Configuración Manual
Crear un archivo `.env` en la raíz del proyecto:

```env
# Configuración de la API
VITE_API_BASE_URL=http://localhost:5000
VITE_PROJECT_ID=6882f61f358cfb33745d32ca
```

## 🎯 Flujo de Funcionamiento

### 1. Login
- El usuario ingresa sus credenciales
- Se autentica con el backend
- Se obtiene el token JWT

### 2. Carga Automática del Proyecto
- Se hace una llamada a: `GET /api/projects/6882f61f358cfb33745d32ca`
- Se obtienen los datos del proyecto incluyendo:
  - URL del video (Google Drive)
  - URL del audio (Google Drive)
  - Metadatos del proyecto

### 3. Carga de Segmentos
- Se hace una llamada a: `GET /api/projects/6882f61f358cfb33745d32ca/segments`
- Se obtienen todos los segmentos con:
  - Tiempos de inicio y fin
  - Descripciones
  - Emociones (prosody)
  - Estadísticas (likes, views)

### 4. Procesamiento de URLs
- Las URLs de Google Drive se convierten automáticamente a URLs de descarga directa
- Se configuran para permitir la reproducción en el navegador

### 5. Carga del Reproductor
- Se muestra el VideoSegmentPlayer con:
  - Video cargado automáticamente
  - Waveform generado del audio
  - Segmentos configurados y sincronizados
  - Interfaz lista para usar

## 📊 Datos del Proyecto

El proyecto configurado contiene:

- **13 segmentos** con diferentes emociones y descripciones
- **Video**: 4 minutos 41 segundos aproximadamente
- **Emociones detectadas**: Confianza, Serenidad, Tristeza, Alegría, Miedo
- **Descripciones detalladas** de cada segmento

## 🎬 Características del Reproductor

- **Sincronización automática** entre video y waveform
- **Navegación por segmentos** con botones y clics en el waveform
- **Información en tiempo real** de cada segmento
- **Zoom dinámico** del waveform
- **Controles de reproducción** estándar

## 🔍 Mensajes de Carga

Durante el proceso se muestran mensajes informativos:

1. **"Verificando autenticación..."** - Durante el login
2. **"Cargando proyecto automáticamente..."** - Descargando datos
3. **"Descargando video desde Google Drive..."** - Procesando video
4. **"Generando onda de audio..."** - Creando waveform
5. **"Configurando X segmentos..."** - Preparando segmentos

## 🚨 Manejo de Errores

- **Errores de CORS**: Se muestran mensajes específicos para problemas de Google Drive
- **Errores de red**: Se reintenta la conexión automáticamente
- **Errores de autenticación**: Se redirige al login
- **Errores de carga**: Se muestran mensajes informativos en la consola

## 💾 Almacenamiento Local

Los datos se guardan en localStorage para:
- **Carga más rápida** en visitas posteriores
- **Funcionamiento offline** de la interfaz
- **Persistencia** de la sesión

## 🎯 Uso

1. Ejecutar `npm run dev`
2. Hacer login con las credenciales
3. El proyecto se carga automáticamente
4. ¡Disfrutar del reproductor!

## 🔧 Personalización

Para cambiar el proyecto:
1. Modificar `VITE_PROJECT_ID` en el archivo `.env`
2. Reiniciar la aplicación
3. El nuevo proyecto se cargará automáticamente

Para cambiar el backend:
1. Modificar `VITE_API_BASE_URL` en el archivo `.env`
2. Reiniciar la aplicación 