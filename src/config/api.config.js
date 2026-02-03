// Cambia esta URL por la de tu backend
export const API_BASE_URL = 'https://turismo-back-production.up.railway.app';//https://turismo-back-uv7n.onrender.com // http://localhost:8082 

// O si estás probando localmente en LAN:
// export const API_BASE_URL = 'http://192.168.1.X:8082'; // Reemplaza X con tu IP local

export const API_TIMEOUT = 10000;

export const ENDPOINTS = {
  // Auth (TOTP)
  LOGIN: '/api/auth/login-code',
  LOGIN_PASSWORD: '/api/auth/login-password',
  REGISTER: '/api/auth/create/user',
  EMAIL_REQUEST: '/api/auth/email/request',
  EMAIL_VERIFY: '/api/auth/email/verify',
  RECOVERY_REQUEST: '/api/auth/recovery/request',
  RECOVERY_CONFIRM: '/api/auth/recovery/confirm',
  REFRESH: '/api/auth/refresh',
  LOGOUT: '/api/auth/logout',
  TOTP_SETUP: '/api/auth/code/setup',
  TOTP_CONFIRM: '/api/auth/code/confirm',
  TOTP_STATUS: '/api/auth/code/status',

  // Places
  PLACES_ALL: '/api/places/all',
  PLACES_NEARBY: '/api/places/nearby',
  PLACES_SEARCH: '/api/places/search',
  PLACE_DETAIL: (id) => `/api/places/${id}`,
  PLACES_CREATE: '/api/places',
  PLACES_TOP: '/api/pruebas/analytics/places/top',

  // Feedback / Reviews
  PLACE_RATING: (id) => `/api/pruebas/places/${id}/rating`,
  PLACE_REVIEWS: (id) => `/api/pruebas/places/${id}/reviews`,
  PLACE_FEEDBACK: (id) => `/api/pruebas/places/${id}/feedback`,
  PLACES_NEARBY_CONTEXT: "/api/pruebas/places/nearby/getpalce",

  // Packages / Agencies
  PACKAGES: "/api/packages",
  AGENCIES: "/api/agencies",
  AGENCY_BY_USER: "/api/agencies/by-user",
  AGENCY_DASHBOARD: "/api/agencies/dashboard",
  GEOCODE: "/api/tools/geocode",
  CATEGORIES: "/api/categories",
};
