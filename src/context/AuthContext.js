import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { ENDPOINTS } from '../config/api.config';
import {
  confirmTotp as confirmTotpService,
  confirmRecovery as confirmRecoveryService,
  requestEmailValidation as requestEmailValidationService,
  loginPassword,
  loginTotp,
  refreshJwt,
  registerUser,
  requestRecovery as requestRecoveryService,
  setupTotp as setupTotpService,
  totpStatus as totpStatusService,
} from '../services/auth';

export const AuthContext = createContext();

const ACTIVE_TOKEN_KEY = 'token';
const ACTIVE_USER_KEY = 'user';
const SAVED_ACCOUNTS_KEY = 'turismo_saved_accounts';

const extractApiErrorMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (typeof data?.message === 'string' && data.message.trim()) return data.message.trim();
  if (typeof data?.error === 'string' && data.error.trim()) return data.error.trim();
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    const first = data.errors[0];
    if (typeof first === 'string' && first.trim()) return first.trim();
    if (typeof first?.message === 'string' && first.message.trim()) return first.message.trim();
  }
  if (typeof error?.message === 'string' && error.message.trim()) return error.message.trim();
  return fallback;
};

const extractLoginPayload = (response) => {
  return response?.data?.data || response?.data || {};
};

const extractRefreshToken = (response) => {
  const payload = response?.data?.data || response?.data || {};
  return payload?.token || payload?.accessToken || payload?.access_token || null;
};

const isPayloadAuthFailure = (payload) => {
  return payload?.success === false || payload?.ok === false || payload?.error === true;
};

const extractPayloadMessage = (payload) => {
  if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message.trim();
  if (typeof payload?.error === 'string' && payload.error.trim()) return payload.error.trim();
  return null;
};

const decodeJwtPayload = (token) => {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const payload = parts[1];
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  try {
    if (typeof atob === 'function') {
      return JSON.parse(atob(padded));
    }
    if (typeof globalThis !== 'undefined' && globalThis.Buffer) {
      return JSON.parse(globalThis.Buffer.from(padded, 'base64').toString('utf8'));
    }
  } catch (_err) {
    return null;
  }
  return null;
};

const getTokenExpirationMs = (token) => {
  const payload = decodeJwtPayload(token);
  return typeof payload?.exp === 'number' ? payload.exp * 1000 : null;
};

const isTokenExpired = (token) => {
  const expiresAt = getTokenExpirationMs(token);
  return !expiresAt || Date.now() >= expiresAt;
};

const sortSavedAccounts = (accounts) => {
  return [...accounts].sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0));
};

const MAX_SAVED_ACCOUNTS = 2;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      let token = await AsyncStorage.getItem(ACTIVE_TOKEN_KEY);
      const userString = await AsyncStorage.getItem(ACTIVE_USER_KEY);
      await loadSavedAccounts();

      if (token && userString) {
        if (isTokenExpired(token)) {
          const refreshed = await refreshStoredToken(token);
          if (!refreshed.success) {
            await AsyncStorage.removeItem(ACTIVE_TOKEN_KEY);
            await AsyncStorage.removeItem(ACTIVE_USER_KEY);
            return;
          }
          token = refreshed.token;
          await AsyncStorage.setItem(ACTIVE_TOKEN_KEY, token);
        }
        const parsedUser = JSON.parse(userString);
        setUser(parsedUser);
        const payload = decodeJwtPayload(token);
        setRoles(Array.isArray(payload?.roles) ? payload.roles : []);
        await rememberAccount({ token, userData: parsedUser, email: parsedUser.email });
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedAccounts = async () => {
    try {
      const raw = await AsyncStorage.getItem(SAVED_ACCOUNTS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const valid = (Array.isArray(parsed) ? parsed : [])
        .filter((account) => account?.token)
        .slice(0, MAX_SAVED_ACCOUNTS);
      if (raw) {
        await AsyncStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(sortSavedAccounts(valid)));
      }
      setSavedAccounts(sortSavedAccounts(valid));
      return valid;
    } catch (_err) {
      setSavedAccounts([]);
      return [];
    }
  };

  const persistSavedAccounts = async (accounts) => {
    const sorted = sortSavedAccounts(accounts);
    await AsyncStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(sorted));
    setSavedAccounts(sorted);
    return sorted;
  };

  const refreshStoredToken = async (token) => {
    if (!token || typeof token !== 'string') {
      return { success: false, unauthorized: true };
    }

    try {
      const response = await refreshJwt(token);
      const nextToken = extractRefreshToken(response);
      if (!nextToken || typeof nextToken !== 'string') {
        return { success: false };
      }
      return { success: true, token: nextToken };
    } catch (error) {
      return {
        success: false,
        unauthorized: error?.response?.status === 401,
      };
    }
  };

  const rememberAccount = async ({ token, userData, email }) => {
    if (!token || !userData?.email && !email) return;

    const accountEmail = String(userData?.email || email).trim().toLowerCase();
    const existing = await loadSavedAccounts();
    const nextAccount = {
      email: accountEmail,
      token,
      user: { ...userData, email: userData?.email || email },
      roles: Array.isArray(decodeJwtPayload(token)?.roles)
        ? decodeJwtPayload(token).roles
        : [],
      expiresAt: getTokenExpirationMs(token),
      lastUsedAt: Date.now(),
    };

    await persistSavedAccounts([
      nextAccount,
      ...existing.filter((account) => String(account.email).toLowerCase() !== accountEmail),
    ].slice(0, MAX_SAVED_ACCOUNTS));
  };

  const activateSession = async ({ token, userData, email, remember = true }) => {
    if (!token || isTokenExpired(token)) {
      return { success: false, error: 'La sesion guardada expiro. Inicia sesion nuevamente.' };
    }

    await AsyncStorage.setItem(ACTIVE_TOKEN_KEY, token);
    const jwtPayload = decodeJwtPayload(token);
    const nextRoles = Array.isArray(jwtPayload?.roles) ? jwtPayload.roles : [];
    setRoles(nextRoles);

    const nextUser = userData || await fetchUserInfo(email);
    if (!nextUser) {
      return { success: false, error: 'No pudimos cargar la informacion de esta cuenta.' };
    }

    await AsyncStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);

    if (remember) {
      await rememberAccount({ token, userData: nextUser, email });
    }

    return { success: true };
  };

  const fetchUserInfo = async (email) => {
    try {
      console.log('[Auth] Fetching info for:', email);
      const response = await api.get('/api/info/user', { params: { userEmail: email } });
      
      const payload = response.data?.data || response.data || null;
      if (!payload) {
        console.warn('[Auth] No data in userInfo response');
        return null;
      }

      if (payload.user) {
        console.log('[Auth] User found:', payload.user.fullName);
        return {
          ...payload.user,
          emailVerified: payload.emailVerified,
          passwordEnabled: payload.passwordEnabled,
          identificationType: payload.user.identificationType || '',
          identificationNumber: payload.user.identificationNumber || '',
          urlAvatar: payload.user.urlAvatar || payload.user.avatar || null,
          fullName: payload.user.fullName || payload.user.name || '',
          createdAt: payload.user.createdAt || null,
        };
      }
      return payload;
    } catch (err) {
      console.error('[Auth] Error fetching user info:', err.message);
      return null;
    }
  };


  const login = async (email, totpCode) => {
    try {
      const response = await loginTotp({ email, totpCode });
      const payload = extractLoginPayload(response);
      if (isPayloadAuthFailure(payload)) {
        return {
          success: false,
          error: extractPayloadMessage(payload) || 'Usuario o codigo TOTP incorrecto.',
        };
      }
      const token = payload?.token || payload?.accessToken || payload?.access_token;
      if (!token || typeof token !== 'string') {
        return {
          success: false,
          error: extractPayloadMessage(payload) || 'No se recibio un token de autenticacion.',
        };
      }

      const userData = await fetchUserInfo(email);
      return activateSession({ token, userData, email });
    } catch (error) {
      const status = error?.response?.status;
      const fallback = status === 401 || status === 403
        ? 'Usuario o codigo TOTP incorrecto.'
        : 'Error al iniciar sesion con TOTP';
      return {
        success: false,
        error: extractApiErrorMessage(error, fallback),
      };
    }
  };

  const loginWithPassword = async (email, password) => {
    try {
      const response = await loginPassword({ email, password });
      const payload = extractLoginPayload(response);
      if (isPayloadAuthFailure(payload)) {
        return {
          success: false,
          error: extractPayloadMessage(payload) || 'Usuario o contrasena incorrectos.',
        };
      }
      const token = payload?.token || payload?.accessToken || payload?.access_token;
      if (!token || typeof token !== 'string') {
        return {
          success: false,
          error: extractPayloadMessage(payload) || 'No se recibio un token de autenticacion.',
        };
      }

      const userData = await fetchUserInfo(email);
      return activateSession({ token, userData, email });
    } catch (error) {
      const status = error?.response?.status;
      const fallback = status === 401 || status === 403
        ? 'Usuario o contrasena incorrectos.'
        : 'Error al iniciar sesion con contrasena';
      return {
        success: false,
        error: extractApiErrorMessage(error, fallback),
      };
    }
  };

  const requestEmailValidation = async (email) => {
    try {
      const response = await requestEmailValidationService({ email });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'No se pudo validar el correo',
      };
    }
  };

  const verifyEmailToken = async (token) => {
    try {
      // GET /api/auth/email/verify?token=...
      const response = await api.get(ENDPOINTS.EMAIL_VERIFY, { params: { token } });
      const userData = await fetchUserInfo(user?.email); // Refrescar info si hay exito
      if (userData) {
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      }
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Token invalido o expirado',
      };
    }
  };


  const register = async (userData) => {
    try {
      const response = await registerUser(userData);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: extractApiErrorMessage(error, 'Error al registrarse'),
      };
    }
  };

  const logout = async () => {
    // 1. Limpiar estado local inmediatamente para respuesta instantanea
    setUser(null);
    setRoles([]);
    
    try {
      // 2. Limpiar almacenamiento persistente
      await AsyncStorage.removeItem(ACTIVE_TOKEN_KEY);
      await AsyncStorage.removeItem(ACTIVE_USER_KEY);
      
      // 3. Notificar al backend en segundo plano (no bloqueante)
      api.post(ENDPOINTS.LOGOUT).catch(err => 
        console.error('Error logging out on server:', err.message)
      );
    } catch (error) {
      console.error('Error during logout process:', error);
    }
  };

  const switchAccount = async (email) => {
    const accountEmail = String(email || '').trim().toLowerCase();
    const accounts = await loadSavedAccounts();
    const account = accounts.find((item) => String(item.email).toLowerCase() === accountEmail);

    if (!account) {
      return { success: false, error: 'No encontramos esa cuenta guardada.' };
    }

    let token = account.token;
    const refreshResult = await refreshStoredToken(token);

    if (refreshResult.success) {
      token = refreshResult.token;
    } else if (refreshResult.unauthorized || isTokenExpired(token)) {
      await persistSavedAccounts(accounts.filter((item) => String(item.email).toLowerCase() !== accountEmail));
      return { success: false, error: 'La sesion de esa cuenta expiro. Inicia sesion nuevamente.' };
    }

    const result = await activateSession({
      token,
      userData: account.user,
      email: account.email,
      remember: true,
    });

    return result;
  };

  const removeSavedAccount = async (email) => {
    const accountEmail = String(email || '').trim().toLowerCase();
    const accounts = await loadSavedAccounts();
    await persistSavedAccounts(accounts.filter((item) => String(item.email).toLowerCase() !== accountEmail));
  };


  const confirmRecovery = async ({ token, newPassword }) => {
    try {
      await confirmRecoveryService({ token, newPassword });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'No se pudo confirmar la recuperacion',
      };
    }
  };

  const updateUser = async (newUserData) => {
    try {
      const updatedUser = { ...user, ...newUserData };
      await AsyncStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(updatedUser)); 
      setUser(updatedUser); 
      const token = await AsyncStorage.getItem(ACTIVE_TOKEN_KEY);
      if (token) {
        await rememberAccount({ token, userData: updatedUser, email: updatedUser.email });
      }
      return { success: true };
    } catch (error) {
      console.error('Error updating user in context:', error);
      return { success: false, error: 'Error al actualizar el estado local' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        roles,
        savedAccounts,
        loading,
        login,
        loginWithPassword,
        register,
        logout,
        switchAccount,
        removeSavedAccount,
        updateUser,
        setupTotp: setupTotpService,
        confirmTotp: confirmTotpService,
        totpStatus: totpStatusService,
        requestRecovery: requestRecoveryService,
        confirmRecovery,
        requestEmailValidation,
        verifyEmailToken,
      }}
    >
      {children}
    </AuthContext.Provider>

  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
