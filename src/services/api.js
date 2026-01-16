import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, API_TIMEOUT } from '../config/api.config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

const PROTECTED_PREFIXES = [
  '/api/auth/refresh',
  '/api/info/user',
  '/api/users/me',
  '/api/places/mine',
  '/api/agencies/by-user',
  '/api/agencies/dashboard',
  '/api/agencies/users',
  '/api/tools/geocode',
  '/api/categories',
  '/admin',
  '/api/pruebas/places/', // feedback/checkin/reviews si están protegidos
];

const WRITE_METHODS = ['post', 'patch', 'put', 'delete'];

const needsAuth = (config = {}) => {
  const url = config?.url || '';
  const method = (config?.method || 'get').toLowerCase();
  if (
    WRITE_METHODS.includes(method) &&
    (url.startsWith('/api/places') || url.startsWith('/api/packages'))
  ) {
    return true;
  }
  return PROTECTED_PREFIXES.some((p) => url.startsWith(p));
};

// Interceptor para agregar el token a cada request
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token && needsAuth(config)) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        delete config.headers.Authorization;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de respuesta
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      // Aquí podrías redirigir al login
    }
    return Promise.reject(error);
  }
);

export default api;
