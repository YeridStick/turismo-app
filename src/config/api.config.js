// Cambia esta URL por la de tu backend
export const API_BASE_URL = 'http://3.211.84.105'; //https://turismo-back-uv7n.onrender.com //https://turismo-back-uv7n.onrender.com //http://192.168.80.113:7860 http://localhost:8082

// O si estás probando localmente en LAN:
// export const API_BASE_URL = 'http://192.168.1.X:8082'; // Reemplaza X con tu IP local

export const API_TIMEOUT = 60000;


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
  PLACES_SEARCH: '/api/places/search',
  PLACE_DETAIL: (id) => `/api/places/${id}`,
  PLACE_UPDATE: (id) => `/api/places/${id}`,
  PLACES_CREATE: '/api/places',
  PLACES_MINE: '/api/places/mine',
  PLACE_MEDIA: (id) => `/api/places/${id}/media`,
  PLACE_MEDIA_ITEM: (placeId, mediaId) => `/api/places/${placeId}/media/${mediaId}`,
  PLACES_TOP: '/api/pruebas/analytics/places/top',
  PLACES_TOP_RATED: '/api/pruebas/places/top-rated',

  // Feedback / Reviews
  PLACE_RATING: (id) => `/api/pruebas/places/${id}/rating`,
  PLACE_REVIEWS: (id) => `/api/pruebas/places/${id}/reviews`,
  PLACE_FEEDBACK: (id) => `/api/pruebas/places/${id}/feedback`,
  PLACES_NEARBY_CONTEXT: "/api/pruebas/places/nearby/getpalce",
  PLACE_CHECKIN: (id) => `/api/pruebas/places/${id}/checkin`,
  VISITS_CREATE: "/api/pruebas/visits",
  VISIT_CONFIRM: (id) => `/api/pruebas/visits/${id}/confirm`,
  PLACE_VISITS_CREATE: (id) => `/api/pruebas/places/${id}/visits`,
  FAVORITES: "/api/pruebas/users/me/favorites",
  FAVORITE_PLACE: (placeId) => `/api/pruebas/users/me/favorites/${placeId}`,

  // Packages / Agencies
  PACKAGES: "/api/packages",
  AGENCIES: "/api/agencies",
  AGENCIES_SEARCH: "/api/agencies/search",
  AGENCY_BY_USER: "/api/agencies/by-user",
  AGENCY_MY: "/api/agencies/my",
  AGENCY_PACKAGES: (id) => `/api/agencies/${id}/packages`,
  AGENCY_DASHBOARD: "/api/agencies/dashboard",
  RESERVATIONS: "/api/reservations",
  RESERVATIONS_ME: "/api/reservations/me",
  RESERVATION_DETAIL: (id) => `/api/reservations/${id}`,
  RESERVATION_MESSAGES: (id) => `/api/reservations/${id}/messages`,
  RESERVATION_PAYMENT_CHECKOUT: (id) => `/api/reservations/${id}/payment/checkout`,
  RESERVATION_PAYMENT_STATUS: (id) => `/api/reservations/${id}/payment/status`,
  RESERVATION_PAYMENT_CHOICE: (id) => `/api/reservations/${id}/payment-choice`,
  AGENCY_RESERVATIONS: "/api/agencies/me/reservations",
  AGENCY_RESERVATION_DETAIL: (id) => `/api/agencies/me/reservations/${id}`,
  AGENCY_RESERVATION_STATUS: (id) => `/api/agencies/me/reservations/${id}/status`,
  AGENCY_RESERVATION_MESSAGES: (id) => `/api/agencies/me/reservations/${id}/messages`,
  AGENCY_SCOPED_RESERVATIONS: (agencyId) => `/api/agencies/${agencyId}/reservations`,
  AGENCY_SCOPED_RESERVATION_DETAIL: (agencyId, id) => `/api/agencies/${agencyId}/reservations/${id}`,
  AGENCY_SCOPED_RESERVATION_STATUS: (agencyId, id) => `/api/agencies/${agencyId}/reservations/${id}/status`,
  AGENCY_SCOPED_RESERVATION_MESSAGES: (agencyId, id) => `/api/agencies/${agencyId}/reservations/${id}/messages`,
  AGENCY_IN_PERSON_PAYMENT_REQUEST: (agencyId, id) => `/api/agencies/${agencyId}/reservations/${id}/payment-requests`,
  AGENCY_IN_PERSON_PAYMENT_LOOKUP: (agencyId) => `/api/agencies/${agencyId}/reservations/payment-requests/lookup`,
  AGENCY_IN_PERSON_PAYMENT_VERIFY: (agencyId, reservationId, requestId) => `/api/agencies/${agencyId}/reservations/${reservationId}/payment-requests/${requestId}/verify`,
  AGENCY_IN_PERSON_PAYMENT_CANCEL: (agencyId, reservationId, requestId) => `/api/agencies/${agencyId}/reservations/${reservationId}/payment-requests/${requestId}/cancel`,
  NOTIFICATIONS_STREAM: "/api/notifications/stream",
  NOTIFICATIONS: "/api/notifications",
  NOTIFICATION_READ: (id) => `/api/notifications/${id}/read`,
  NOTIFICATIONS_READ_ALL: "/api/notifications/read-all",
  GEOCODE: "/api/tools/geocode",
  CATEGORIES: "/api/categories",
  CATEGORY_DETAIL: (id) => `/api/categories/${id}`,
  
  // Agency User Management
  AGENCY_USERS: (id) => `/api/agencies/${id}/users`,
  AGENCY_USER_DETAIL: (agencyId, userId) => `/api/agencies/${agencyId}/users/${userId}`,

  // User Management
  USERS_ME: '/api/users/me',
  USER_INFO: '/api/info/user',
  USERS_ME_PROFILE_IMAGE: '/api/users/me/profile-image',
  USERS_ME_PASSWORD: '/api/users/me/password',
  PACKAGE_COVER_IMAGE: (id) => `/api/packages/${id}/cover-image`,
  ADMIN_USERS: '/api/admin/all/user',
};
