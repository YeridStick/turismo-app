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
export const getTopRatedPlaces = (limit = 8) => api.get(ENDPOINTS.PLACES_TOP_RATED, { params: { limit } });
export const getPackages = () => api.get(ENDPOINTS.PACKAGES);
export const createPackage = (data) => api.post(ENDPOINTS.PACKAGES, data);
export const getPackageById = (id) => api.get(`${ENDPOINTS.PACKAGES}/${id}`);
export const getAgencies = () => api.get(ENDPOINTS.AGENCIES);
export const createAgency = (data) => api.post(ENDPOINTS.AGENCIES, data);
export const getAgencyByEmail = (email) => 
  api.get(ENDPOINTS.AGENCY_BY_USER, { params: { email, userEmail: email } });
export const getMyAgencies = (email) => api.get(ENDPOINTS.AGENCY_MY, { params: { email } });
export const getAgencyPackages = (id) => api.get(ENDPOINTS.AGENCY_PACKAGES(id));

// Agency User Management
export const getAgencyUsers = (id) => api.get(ENDPOINTS.AGENCY_USERS(id));
export const updateAgencyUser = (agencyId, userId, data) => 
  api.patch(ENDPOINTS.AGENCY_USER_DETAIL(agencyId, userId), data);
export const deleteAgencyUser = (agencyId, userId) => 
  api.delete(ENDPOINTS.AGENCY_USER_DETAIL(agencyId, userId));
export const addAgencyUser = (data) => 
  api.post(`/api/agencies/users`, data);

export const getNearbyContext = (lat, lng) => 
  api.get(ENDPOINTS.PLACES_NEARBY_CONTEXT, { params: { lat, lng } });
export const getPlaceReviews = (placeId) => api.get(ENDPOINTS.PLACE_REVIEWS(placeId));
export const getPlaceRating = (placeId) => api.get(ENDPOINTS.PLACE_RATING(placeId));
export const createPlaceReview = (placeId, data) => api.post(ENDPOINTS.PLACE_REVIEWS(placeId), data);
export const createPlaceFeedback = (placeId, data) => api.post(ENDPOINTS.PLACE_FEEDBACK(placeId), data);
export const createVisit = (data) => api.post(ENDPOINTS.VISITS_CREATE, data);
export const createPlaceVisit = (placeId, data) => api.post(ENDPOINTS.PLACE_VISITS_CREATE(placeId), data);
export const checkinPlaceVisit = (placeId, data) => api.post(ENDPOINTS.PLACE_CHECKIN(placeId), data);
export const confirmVisit = (visitId, data) => api.patch(ENDPOINTS.VISIT_CONFIRM(visitId), data);

export const getMyPlaces = () => api.get(ENDPOINTS.PLACES_MINE);
export const createPlace = (data) => api.post(ENDPOINTS.PLACES_CREATE, data);
export const updatePlace = (id, data) => api.patch(ENDPOINTS.PLACE_UPDATE(id), data);

// New features: Edit / Delete Agencies and Packages
export const updateAgency = (id, data) => api.patch(`${ENDPOINTS.AGENCIES}/${id}`, data);
export const deleteAgency = (id) => api.delete(`${ENDPOINTS.AGENCIES}/${id}`);
export const updatePackage = (id, data) => api.patch(`${ENDPOINTS.PACKAGES}/${id}`, data);
export const deletePackage = (id) => api.delete(`${ENDPOINTS.PACKAGES}/${id}`);

export default api;
