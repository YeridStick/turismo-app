import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, API_TIMEOUT, ENDPOINTS } from '../config/api.config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
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

// Los endpoints de lectura son la fuente de la URL prefirmada vigente.
// No reutilizar cover_image_key ni construir URLs de S3 en el cliente.
export const getPackageCover = async (id) => {
  const response = await getPackageById(id);
  return response?.data?.data || response?.data || null;
};
export const getPackageCoverImage = async (id) => {
  const response = await api.get(ENDPOINTS.PACKAGE_COVER_IMAGE(id));
  return response?.data?.data || response?.data || null;
};
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
export const selectReservationPaymentMode = (id, mode) =>
  api.post(ENDPOINTS.RESERVATION_PAYMENT_CHOICE(id), { mode });
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
export const requestAgencyInPersonPayment = (id, data = {}, options = {}) =>
  api.post(ENDPOINTS.AGENCY_IN_PERSON_PAYMENT_REQUEST(options.agencyId, id), data);
export const lookupAgencyInPersonPayment = (code, options = {}) =>
  api.get(ENDPOINTS.AGENCY_IN_PERSON_PAYMENT_LOOKUP(options.agencyId), { params: { code } });
export const verifyAgencyInPersonPayment = (reservationId, requestId, data = {}, options = {}) =>
  api.post(ENDPOINTS.AGENCY_IN_PERSON_PAYMENT_VERIFY(options.agencyId, reservationId, requestId), data);
export const cancelAgencyInPersonPayment = (reservationId, requestId, options = {}) =>
  api.post(ENDPOINTS.AGENCY_IN_PERSON_PAYMENT_CANCEL(options.agencyId, reservationId, requestId));

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
export const getUserInfo = (email) =>
  api.get(ENDPOINTS.USER_INFO, { params: { userEmail: email } });
const uploadPrivateImage = async (endpoint, file) => {
  if (!file?.uri || !file?.name || !file?.type) {
    throw new Error('El archivo debe incluir uri, name y type');
  }
  const token = await getAuthToken();
  if (!token) throw new Error('La sesión no tiene un token válido');
  const form = new FormData();
  form.append('file', file);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      body: form,
    });
  } catch (error) {
    const networkError = new Error('No se pudo conectar con el servidor para cargar la imagen.');
    networkError.cause = error;
    throw networkError;
  }
  const payload = await response.json().catch(() => ({ message: 'Respuesta inválida del servidor.', data: null }));
  if (!response.ok) {
    const requestError = new Error(payload?.message || 'No se pudo cargar la imagen.');
    requestError.response = { status: response.status, data: payload };
    throw requestError;
  }
  return { status: response.status, data: payload };
};

export const uploadProfileImage = (file) => uploadPrivateImage(ENDPOINTS.USERS_ME_PROFILE_IMAGE, file);
export const getProfileImage = () => api.get(ENDPOINTS.USERS_ME_PROFILE_IMAGE);
export const deleteProfileImage = () => api.delete(ENDPOINTS.USERS_ME_PROFILE_IMAGE);
export const uploadPackageCoverImage = (packageId, file) =>
  uploadPrivateImage(ENDPOINTS.PACKAGE_COVER_IMAGE(packageId), file);
export const deletePackageCoverImage = (packageId) => api.delete(ENDPOINTS.PACKAGE_COVER_IMAGE(packageId));
export const deletePlace = (siteId) => api.delete(ENDPOINTS.PLACE_DETAIL(siteId));
export const createCategory = (data) => api.post(ENDPOINTS.CATEGORIES, data);
export const updateCategory = (id, data) => api.patch(ENDPOINTS.CATEGORY_DETAIL(id), data);
export const createPlace = (data) => api.post(ENDPOINTS.PLACES_CREATE, data);
export const updatePlace = (id, data) => api.patch(ENDPOINTS.PLACE_UPDATE(id), data);
export const listPlaceMedia = (siteId) => api.get(ENDPOINTS.PLACE_MEDIA(siteId));
export const uploadPlaceMedia = async (siteId, file, category) => {
  if (!siteId) throw new Error('El sitio todavía no tiene ID');
  if (!file?.uri || !file?.name || !file?.type) {
    throw new Error('El archivo debe incluir uri, name y type');
  }

  const token = await getAuthToken();
  if (!token) throw new Error('La sesión no tiene un token válido');

  const form = new FormData();
  form.append('category', category);
  form.append('file', file);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${ENDPOINTS.PLACE_MEDIA(siteId)}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });
  } catch (error) {
    const networkError = new Error('No se pudo conectar con el servidor para cargar el archivo.');
    networkError.cause = error;
    throw networkError;
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = { message: 'El servidor devolvió una respuesta inválida.', data: null };
  }

  if (!response.ok) {
    const requestError = new Error(payload?.message || 'No se pudo cargar el archivo');
    requestError.response = { status: response.status, data: payload };
    throw requestError;
  }

  return { status: response.status, data: payload };
};
export const deletePlaceMedia = (siteId, mediaId) =>
  api.delete(ENDPOINTS.PLACE_MEDIA_ITEM(siteId, mediaId));

// New features: Edit / Delete Agencies and Packages
export const updateAgency = (id, data) => api.patch(`${ENDPOINTS.AGENCIES}/${id}`, data);
export const deleteAgency = (id) => api.delete(`${ENDPOINTS.AGENCIES}/${id}`);
export const updatePackage = (id, data) => api.patch(`${ENDPOINTS.PACKAGES}/${id}`, data);
export const deletePackage = (id) => api.delete(`${ENDPOINTS.PACKAGES}/${id}`);

export default api;
