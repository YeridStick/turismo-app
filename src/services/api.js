import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, API_TIMEOUT, ENDPOINTS } from '../config/api.config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token a cada request
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
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
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

// Named Exports for useHomeData and other components
export const getPlaces = (params) => api.get(ENDPOINTS.PLACES_SEARCH, { params });
export const getNearbyPlaces = (lat, lng, dist) => 
  api.get(ENDPOINTS.PLACES_SEARCH, { params: { lat, lng, dist, all: false } });
export const getPopularPlaces = () => 
  api.get(ENDPOINTS.PLACES_SEARCH, { params: { limit: 10, sort: 'rating,desc' } });
export const getTopPlaces = () => api.get(ENDPOINTS.PLACES_TOP);
export const getPackages = () => api.get(ENDPOINTS.PACKAGES);
export const getAgencies = () => api.get(ENDPOINTS.AGENCIES);
export const getNearbyContext = (lat, lng) => 
  api.get(ENDPOINTS.PLACES_NEARBY_CONTEXT, { params: { lat, lng } });

export const getMyPlaces = () => api.get(ENDPOINTS.PLACES_MINE);
export const createPlace = (data) => api.post(ENDPOINTS.PLACES_CREATE, data);
export const updatePlace = (id, data) => api.patch(ENDPOINTS.PLACE_UPDATE(id), data);

export default api;
