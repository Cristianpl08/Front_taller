import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/api.js';
import { setupAuthInterceptor } from '../utils/authInterceptor.js';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verificar estado de autenticación al cargar la aplicación
  const checkAuthStatus = async () => {
    const token = localStorage.getItem('authToken');
    
    if (token) {
      try {
        console.log('🔍 Verificando token JWT...');
        // Actualizar el token en la instancia del API service
        apiService.updateToken();
        const response = await apiService.verifyAuth();
        
        if (response.success) {
          console.log('✅ Token válido, usuario autenticado');
          setIsAuthenticated(true);
          setUser(response.data?.user || JSON.parse(localStorage.getItem('user')));
        } else {
          console.log('❌ Token inválido, limpiando datos');
          await handleLogout();
        }
      } catch (error) {
        console.error('❌ Error verificando autenticación:', error);
        await handleLogout();
      }
    } else {
      console.log('📝 No hay token almacenado');
    }
    
    setLoading(false);
  };

  // Login
  const login = async (credentials) => {
    try {
      setLoading(true);
      const response = await apiService.login(credentials);
      
      if (response.success || response.data?.token || response.token) {
        console.log('✅ Login exitoso');
        // Actualizar el token en la instancia del API service
        apiService.updateToken();
        setIsAuthenticated(true);
        setUser(response.data?.user || response.user);
        return { success: true };
      } else {
        console.log('❌ Login fallido');
        return { success: false, message: response.message || 'Error en el login' };
      }
    } catch (error) {
      console.error('❌ Error en login:', error);
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  // Verificar autenticación al montar el componente
  useEffect(() => {
    checkAuthStatus();
    
    // Configurar interceptor de autenticación
    setupAuthInterceptor(handleLogout);
  }, []);

  const value = {
    isAuthenticated,
    user,
    loading,
    login,
    logout: handleLogout,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}; 