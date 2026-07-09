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

let cachedAuthToken;
let tokenReadPromise = null;

export const getAuthToken = async () => {
  if (cachedAuthToken !== undefined) {
    return cachedAuthToken;
  }

  if (!tokenReadPromise) {
    tokenReadPromise = AsyncStorage.getItem('token')
      .then((token) => {
        cachedAuthToken = token || null;
        return cachedAuthToken;
      })
      .finally(() => {
        tokenReadPromise = null;
      });
  }

  return tokenReadPromise;
};

export const setAuthTokenCache = (token) => {
  cachedAuthToken = token || null;
};

export const clearAuthTokenCache = () => {
  cachedAuthToken = null;
};

export const resetAuthTokenCache = () => {
  cachedAuthToken = undefined;
  tokenReadPromise = null;
};

// Interceptor para agregar el token a cada request
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await getAuthToken();
      const hasExplicitAuth =
        config.headers?.Authorization || config.headers?.authorization;
      if (token && !hasExplicitAuth) {
        config.headers = config.headers || {};
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
    if (error.response?.status === 401 && !error.config?.skipAuthCleanup) {
      clearAuthTokenCache();
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
export const getPackages = (params = {}) => api.get(ENDPOINTS.PACKAGES, { params });
export const createPackage = (data) => api.post(ENDPOINTS.PACKAGES, data);
export const getPackageById = (id) => api.get(`${ENDPOINTS.PACKAGES}/${id}`);
export const getAgencies = (params = {}) => api.get(ENDPOINTS.AGENCIES, { params });
export const searchAgencies = (params = {}) => api.get(ENDPOINTS.AGENCIES_SEARCH, { params });
export const createAgency = (data) => api.post(ENDPOINTS.AGENCIES, data);
export const getAgencyByEmail = (email) => 
  api.get(ENDPOINTS.AGENCY_BY_USER, { params: { email, userEmail: email } });
export const getMyAgencies = () => api.get(ENDPOINTS.AGENCY_MY);
export const getAgencyPackages = (id, params = {}) => api.get(ENDPOINTS.AGENCY_PACKAGES(id), { params });

// Reservations
export const createReservation = (data) => api.post(ENDPOINTS.RESERVATIONS, data);
export const getMyReservations = (params = {}) => api.get(ENDPOINTS.RESERVATIONS_ME, { params });
export const getReservationById = (id) => api.get(ENDPOINTS.RESERVATION_DETAIL(id));
export const updateReservation = (id, data) => api.patch(ENDPOINTS.RESERVATION_DETAIL(id), data);
export const deleteReservation = (id) => api.delete(ENDPOINTS.RESERVATION_DETAIL(id));
export const getReservationMessages = (id, params = {}) =>
  api.get(ENDPOINTS.RESERVATION_MESSAGES(id), { params });
export const sendReservationMessage = (id, message) =>
  api.post(ENDPOINTS.RESERVATION_MESSAGES(id), { message });
export const initiateReservationPayment = (id, data = { provider: "wompi" }) =>
  api.post(ENDPOINTS.RESERVATION_PAYMENT_CHECKOUT(id), data);
export const getReservationPaymentStatus = (id) =>
  api.get(ENDPOINTS.RESERVATION_PAYMENT_STATUS(id));
export const getAgencyReservations = (params = {}, options = {}) => {
  const endpoint = options.agencyId
    ? ENDPOINTS.AGENCY_SCOPED_RESERVATIONS(options.agencyId)
    : ENDPOINTS.AGENCY_RESERVATIONS;

  return api.get(endpoint, { params });
};
export const getAgencyReservationById = (id, options = {}) => {
  const endpoint = options.agencyId
    ? ENDPOINTS.AGENCY_SCOPED_RESERVATION_DETAIL(options.agencyId, id)
    : ENDPOINTS.AGENCY_RESERVATION_DETAIL(id);

  return api.get(endpoint);
};
export const updateAgencyReservationStatus = (id, status, notes = "", options = {}) => {
  const endpoint = options.agencyId
    ? ENDPOINTS.AGENCY_SCOPED_RESERVATION_STATUS(options.agencyId, id)
    : ENDPOINTS.AGENCY_RESERVATION_STATUS(id);

  return api.patch(endpoint, { status, notes });
};
export const getAgencyReservationMessages = (id, params = {}, options = {}) => {
  const endpoint = options.agencyId
    ? ENDPOINTS.AGENCY_SCOPED_RESERVATION_MESSAGES(options.agencyId, id)
    : ENDPOINTS.AGENCY_RESERVATION_MESSAGES(id);

  return api.get(endpoint, { params });
};
export const sendAgencyReservationMessage = (id, message, options = {}) => {
  const endpoint = options.agencyId
    ? ENDPOINTS.AGENCY_SCOPED_RESERVATION_MESSAGES(options.agencyId, id)
    : ENDPOINTS.AGENCY_RESERVATION_MESSAGES(id);

  return api.post(endpoint, { message });
};

// Notifications
export const getNotifications = (params = {}) =>
  api.get(ENDPOINTS.NOTIFICATIONS, { params });
export const markNotificationRead = (id) =>
  api.patch(ENDPOINTS.NOTIFICATION_READ(id));
export const markAllNotificationsRead = () =>
  api.patch(ENDPOINTS.NOTIFICATIONS_READ_ALL);

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
export const getFavoritePlaces = (params = {}) => api.get(ENDPOINTS.FAVORITES, { params });
export const addFavoritePlace = (placeId) => api.post(ENDPOINTS.FAVORITE_PLACE(placeId));
export const removeFavoritePlace = (placeId) => api.delete(ENDPOINTS.FAVORITE_PLACE(placeId));

export const getMyPlaces = () => api.get(ENDPOINTS.PLACES_MINE);
export const createPlace = (data) => api.post(ENDPOINTS.PLACES_CREATE, data);
export const updatePlace = (id, data) => api.patch(ENDPOINTS.PLACE_UPDATE(id), data);

// New features: Edit / Delete Agencies and Packages
export const updateAgency = (id, data) => api.patch(`${ENDPOINTS.AGENCIES}/${id}`, data);
export const deleteAgency = (id) => api.delete(`${ENDPOINTS.AGENCIES}/${id}`);
export const updatePackage = (id, data) => api.patch(`${ENDPOINTS.PACKAGES}/${id}`, data);
export const deletePackage = (id) => api.delete(`${ENDPOINTS.PACKAGES}/${id}`);

export default api;
