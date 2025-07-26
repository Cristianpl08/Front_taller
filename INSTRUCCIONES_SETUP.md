# 🚀 Instrucciones de Configuración

## 📋 Pasos para Configurar el Proyecto

### 1. Crear el archivo .env
Renombrar el archivo `config.env` a `.env`:
```bash
# En Windows (PowerShell)
Rename-Item config.env .env

# En Linux/Mac
mv config.env .env
```

### 2. Verificar la configuración
El archivo `.env` debe contener:
```env
VITE_API_BASE_URL=http://localhost:5000
VITE_PROJECT_ID=6882f61f358cfb33745d32ca
```

### 3. Ejecutar la aplicación
```bash
npm run dev
```

## 🎯 Funcionalidad Implementada

✅ **Carga automática del proyecto** después del login
✅ **Descarga de segmentos** desde la API
✅ **Procesamiento de URLs de Google Drive**
✅ **Reproductor de video** con waveform sincronizado
✅ **Navegación por segmentos** con emociones y descripciones
✅ **Interfaz de carga** con mensajes informativos

## 🔧 Configuración del Backend

Asegúrate de que el backend esté ejecutándose en:
- **URL**: http://localhost:5000
- **Proyecto ID**: 6882f61f358cfb33745d32ca

## 🎬 Flujo de Uso

1. **Login** con credenciales válidas
2. **Carga automática** del proyecto y segmentos
3. **Reproductor** listo para usar con:
   - Video sincronizado
   - 13 segmentos con emociones
   - Navegación interactiva
   - Información en tiempo real

## 🚨 Solución de Problemas

### Error de CORS con Google Drive
Si el video no carga, puede ser un problema de CORS. En ese caso:
1. Verificar que el video esté configurado como "público" en Google Drive
2. Usar una URL de descarga directa en lugar de la URL de vista

### Error de conexión al backend
1. Verificar que el backend esté ejecutándose en http://localhost:5000
2. Verificar que el proyecto ID sea correcto
3. Verificar las credenciales de login

## 📞 Soporte

Si tienes problemas, revisa:
1. La consola del navegador para errores
2. Los logs del backend
3. La configuración del archivo `.env` 