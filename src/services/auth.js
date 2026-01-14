import api from './api';
import { ENDPOINTS } from '../config/api.config';

export const loginTotp = async ({ email, totpCode }) => {
  return api.post(ENDPOINTS.LOGIN, { email, totpCode });
};

export const registerUser = async (payload) => {
  return api.post(ENDPOINTS.REGISTER, payload);
};

export const setupTotp = async (email) => {
  return api.post(ENDPOINTS.TOTP_SETUP, { email });
};

export const confirmTotp = async ({ email, code }) => {
  return api.post(ENDPOINTS.TOTP_CONFIRM, { email, code });
};

export const totpStatus = async (email) => {
  return api.get(ENDPOINTS.TOTP_STATUS, { params: { email } });
};
