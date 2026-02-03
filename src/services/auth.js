import api from './api';
import { ENDPOINTS } from '../config/api.config';

export const loginTotp = async ({ email, totpCode }) => {
  return api.post(ENDPOINTS.LOGIN, { email, totpCode });
};

export const loginPassword = async ({ email, password }) => {
  return api.post(ENDPOINTS.LOGIN_PASSWORD, { email, password });
};

export const registerUser = async (payload = {}) => {
  // Adapt local camelCase fields to API expected snake_case
  const body = {
    full_name: payload.fullName || payload.full_name,
    email: payload.email,
    url_avatar: payload.urlAvatar || payload.url_avatar,
    identification_type: payload.identificationType || payload.identification_type,
    identification_number: payload.identificationNumber || payload.identification_number,
    password: payload.password,
  };
  return api.post(ENDPOINTS.REGISTER, body);
};

export const requestEmailValidation = async ({ email }) => {
  return api.post(ENDPOINTS.EMAIL_REQUEST, { email });
};

export const setupTotp = async ({ email, password }) => {
  return api.post(ENDPOINTS.TOTP_SETUP, { email, password });
};

export const confirmTotp = async ({ email, code }) => {
  return api.post(ENDPOINTS.TOTP_CONFIRM, { email, code });
};

export const totpStatus = async (email) => {
  return api.get(ENDPOINTS.TOTP_STATUS, { params: { email } });
};

export const requestRecovery = async ({ email }) => {
  return api.post(ENDPOINTS.RECOVERY_REQUEST, { email });
};

export const confirmRecovery = async ({ token, newPassword }) => {
  return api.post(ENDPOINTS.RECOVERY_CONFIRM, { token, newPassword });
};
