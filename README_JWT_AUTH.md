# 🔐 Sistema de Autenticación JWT con Persistencia

## Descripción

Este sistema implementa autenticación JWT (JSON Web Tokens) con persistencia de sesión, permitiendo que los usuarios permanezcan logueados incluso después de recargar la página.

## 🚀 Funcionalidades Implementadas

### ✅ **Autenticación JWT**
- Login con email y contraseña
- Almacenamiento seguro del token JWT
- Verificación automática de autenticación
- Logout seguro con limpieza de datos

### ✅ **Persistencia de Sesión**
- Verificación automática al cargar la aplicación
- Token almacenado en localStorage
- Datos del usuario persistentes
- Redirección automática según estado de autenticación

### ✅ **Manejo de Errores**
- Interceptor automático para errores 401
- Limpieza automática de sesión expirada
- Mensajes de error descriptivos
- Recarga automática en caso de token inválido

### ✅ **Contexto de Autenticación**
- Estado global de autenticación
- Hooks personalizados para fácil acceso
- Manejo centralizado de login/logout
- Verificación automática de token

## 📁 Estructura de Archivos

```
src/
├── contexts/
│   └── AuthContext.jsx        # Contexto de autenticación
├── utils/
│   └── authInterceptor.js     # Interceptor para errores 401
├── services/
│   └── api.js                # Servicio de API con JWT
├── components/
│   └── Login.jsx             # Componente de login actualizado
├── main.jsx                  # Configuración con AuthProvider
└── App.jsx                   # Componente principal actualizado
```

## 🔧 Configuración

### 1. **AuthProvider en main.jsx**

```javascript
import { AuthProvider } from "./contexts/AuthContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
```

### 2. **Uso del Contexto en Componentes**

```javascript
import { useAuth } from '../contexts/AuthContext.jsx';

function MyComponent() {
  const { isAuthenticated, user, login, logout } = useAuth();
  
  // Usar las funciones de autenticación
}
```

### 3. **Servicio de API con JWT**

```javascript
// services/api.js
class ApiService {
  constructor() {
    this.token = localStorage.getItem('authToken');
  }
  
  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { 'Authorization': `Bearer ${this.token}` })
    };
    
    // ... resto de la lógica
  }
}
```

## 🎯 Flujo de Autenticación

### 1. **Carga Inicial de la Aplicación**
```
App se carga → AuthProvider verifica token → Token válido → Usuario autenticado
App se carga → AuthProvider verifica token → Token inválido → Mostrar login
```

### 2. **Proceso de Login**
```
Usuario ingresa credenciales → Login exitoso → Token guardado → Redirección automática
Usuario ingresa credenciales → Login fallido → Mostrar error
```

### 3. **Verificación Automática**
```
Cada petición HTTP → Interceptor verifica respuesta → 401 → Limpiar sesión
Cada petición HTTP → Interceptor verifica respuesta → 200 → Continuar
```

### 4. **Logout**
```
Usuario hace logout → Llamar endpoint → Limpiar localStorage → Redirección
```

## 🔌 Endpoints de la API

### **Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123"
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_id",
      "email": "usuario@ejemplo.com",
      "name": "Usuario Ejemplo"
    }
  }
}
```

### **Verificar Autenticación**
```http
GET /api/auth/verify
Authorization: Bearer <token>
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "usuario@ejemplo.com",
      "name": "Usuario Ejemplo"
    }
  }
}
```

### **Logout**
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

## 🛡️ Seguridad

### **Almacenamiento Seguro**
- Token JWT almacenado en localStorage
- Datos del usuario en localStorage
- Limpieza automática en logout

### **Verificación Automática**
- Verificación de token al cargar la aplicación
- Interceptor para errores 401
- Limpieza automática de sesión expirada

### **Headers de Autorización**
- Token incluido automáticamente en todas las peticiones
- Formato: `Authorization: Bearer <token>`

## 🎨 Características de UI/UX

### **Estados de Carga**
- Loading durante verificación de autenticación
- Loading durante login
- Mensajes descriptivos para cada estado

### **Manejo de Errores**
- Mensajes de error claros
- Limpieza automática en errores de autenticación
- Redirección automática en token expirado

### **Información del Usuario**
- Email del usuario mostrado en el header
- Estado de autenticación visible
- Logout accesible desde cualquier vista

## 🔧 Uso del Sistema

### **1. Login**
```javascript
const { login } = useAuth();

const handleLogin = async (credentials) => {
  const result = await login(credentials);
  if (result.success) {
    // Login exitoso, redirección automática
  } else {
    // Mostrar error
  }
};
```

### **2. Verificar Autenticación**
```javascript
const { isAuthenticated, user } = useAuth();

if (isAuthenticated) {
  // Usuario está logueado
  console.log('Usuario:', user);
}
```

### **3. Logout**
```javascript
const { logout } = useAuth();

const handleLogout = async () => {
  await logout();
  // Logout completado, redirección automática
};
```

## 🐛 Solución de Problemas

### **Token Expirado**
- El interceptor detecta automáticamente errores 401
- Limpia la sesión y redirige al login
- No requiere intervención manual

### **Error de CORS**
- Verificar configuración del servidor backend
- Asegurar que los headers de autorización estén permitidos

### **Token No Válido**
- Verificar formato del token en localStorage
- Comprobar que el backend esté configurado correctamente

### **Persistencia No Funciona**
- Verificar que localStorage esté habilitado
- Comprobar que el token se esté guardando correctamente

## 📝 Notas Técnicas

### **JWT (JSON Web Tokens)**
- Tokens firmados digitalmente
- Contienen información del usuario
- Expiran automáticamente
- No requieren almacenamiento en servidor

### **localStorage**
- Almacenamiento persistente en el navegador
- Datos sobreviven recargas de página
- Limitado a ~5-10MB por dominio
- Accesible solo desde el mismo dominio

### **Interceptor de Fetch**
- Intercepta todas las peticiones HTTP
- Maneja errores 401 automáticamente
- No requiere configuración manual en cada petición

### **Contexto de React**
- Estado global de autenticación
- Evita prop drilling
- Re-renderizado automático en cambios
- Hooks personalizados para fácil acceso

## 🎯 Beneficios

### **Para el Usuario**
- ✅ No necesita loguearse en cada visita
- ✅ Sesión persistente entre recargas
- ✅ Experiencia fluida y sin interrupciones
- ✅ Logout seguro y completo

### **Para el Desarrollador**
- ✅ Código limpio y organizado
- ✅ Manejo centralizado de autenticación
- ✅ Interceptor automático para errores
- ✅ Fácil integración con APIs protegidas

### **Para la Aplicación**
- ✅ Seguridad mejorada con JWT
- ✅ Performance optimizada
- ✅ Manejo robusto de errores
- ✅ Escalabilidad mejorada

## 🚀 Próximas Mejoras

- [ ] Implementar refresh tokens
- [ ] Agregar remember me functionality
- [ ] Implementar logout en todas las pestañas
- [ ] Agregar notificaciones push para sesión expirada
- [ ] Implementar autenticación de dos factores
- [ ] Agregar analytics de sesión 