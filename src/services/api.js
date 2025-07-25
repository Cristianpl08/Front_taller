import { API_CONFIG, API_ENDPOINTS } from '../config.js';

class ApiService {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.token = localStorage.getItem('authToken');
    console.log('🔧 ApiService initialized with:', {
      baseURL: this.baseURL,
      hasToken: !!this.token
    });
  }

  // Método para hacer peticiones HTTP
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    console.log('🌐 API Request:', {
      url,
      method: options.method || 'GET',
      headers: options.headers,
      body: options.body
    });
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    // Agregar token de autenticación si existe
    if (this.token) {
      defaultHeaders['Authorization'] = `Bearer ${this.token}`;
    }

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      console.log('📡 API Response:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ API Success Response:', data);
      return data;
    } catch (error) {
      console.error('❌ API request failed:', error);
      throw error;
    }
  }

  // Login con credenciales
  async login(credentials) {
    try {
      const response = await this.request(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      
      // Guardar el token en localStorage
      if (response.token) {
        this.token = response.token;
        localStorage.setItem('authToken', response.token);
      }
      
      return response;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  // Obtener proyecto por ID
  async getProject(projectId = API_CONFIG.PROJECT_ID) {
    try {
      return await this.request(API_ENDPOINTS.PROJECT(projectId));
    } catch (error) {
      console.error('Failed to get project:', error);
      throw error;
    }
  }

  // Obtener todos los segmentos
  async getSegments() {
    try {
      return await this.request(API_ENDPOINTS.SEGMENTS);
    } catch (error) {
      console.error('Failed to get segments:', error);
      throw error;
    }
  }

  // Verificar si el usuario está autenticado
  isAuthenticated() {
    return !!this.token;
  }

  // Cerrar sesión
  logout() {
    this.token = null;
    localStorage.removeItem('authToken');
  }
}

export const apiService = new ApiService(); 