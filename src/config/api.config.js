// Cambia esta URL por la de tu backend
export const API_BASE_URL = 'https://tu-backend.com/api';

// O si estás probando localmente:
// export const API_BASE_URL = 'http://192.168.1.X:3000/api'; // Reemplaza X con tu IP local

export const API_TIMEOUT = 10000;

export const ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  LOGOUT: '/auth/logout',

  // Destinations
  DESTINATIONS: '/destinations',
  DESTINATION_DETAIL: (id) => `/destinations/${id}`,
  POPULAR_DESTINATIONS: '/destinations/popular',
  SEARCH_DESTINATIONS: '/destinations/search',

  // Bookings
  BOOKINGS: '/bookings',
  CREATE_BOOKING: '/bookings',
  USER_BOOKINGS: '/bookings/user',

  // User
  PROFILE: '/user/profile',
  UPDATE_PROFILE: '/user/profile',
};
