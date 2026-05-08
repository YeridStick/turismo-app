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
  registerUser,
  requestRecovery as requestRecoveryService,
  setupTotp as setupTotpService,
  totpStatus as totpStatusService,
} from '../services/auth';

export const AuthContext = createContext();

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

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userString = await AsyncStorage.getItem('user');

      if (token && userString) {
        setUser(JSON.parse(userString));
        const payload = decodeJwtPayload(token);
        setRoles(Array.isArray(payload?.roles) ? payload.roles : []);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
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
      const payload = response.data?.data || response.data;
      const token = payload?.token;

      if (token) {
        await AsyncStorage.setItem('token', token);
        const jwtPayload = decodeJwtPayload(token);
        setRoles(Array.isArray(jwtPayload?.roles) ? jwtPayload.roles : []);
      }
      const userData = await fetchUserInfo(email);
      if (userData) {
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      }
      return { success: true };
    } catch (error) {
      const status = error?.response?.status;
      const fallback = status === 401 || status === 403
        ? 'Usuario o código TOTP incorrecto.'
        : 'Error al iniciar sesión con TOTP';
      return {
        success: false,
        error: extractApiErrorMessage(error, fallback),
      };
    }
  };

  const loginWithPassword = async (email, password) => {
    try {
      const response = await loginPassword({ email, password });
      const payload = response.data?.data || response.data;
      const token = payload?.token;

      if (token) {
        await AsyncStorage.setItem('token', token);
        const jwtPayload = decodeJwtPayload(token);
        setRoles(Array.isArray(jwtPayload?.roles) ? jwtPayload.roles : []);
      }
      const userData = await fetchUserInfo(email);
      if (userData) {
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      }
      return { success: true };
    } catch (error) {
      const status = error?.response?.status;
      const fallback = status === 401 || status === 403
        ? 'Usuario o contraseña incorrectos.'
        : 'Error al iniciar sesión con contraseña';
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
      const userData = await fetchUserInfo(user?.email); // Refrescar info si hay Ã©xito
      if (userData) {
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      }
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Token invÃ¡lido o expirado',
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
    // 1. Limpiar estado local inmediatamente para respuesta instantÃ¡nea
    setUser(null);
    setRoles([]);
    
    try {
      // 2. Limpiar almacenamiento persistente
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      
      // 3. Notificar al backend en segundo plano (no bloqueante)
      api.post(ENDPOINTS.LOGOUT).catch(err => 
        console.error('Error logging out on server:', err.message)
      );
    } catch (error) {
      console.error('Error during logout process:', error);
    }
  };


  const confirmRecovery = async ({ token, newPassword }) => {
    try {
      await confirmRecoveryService({ token, newPassword });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'No se pudo confirmar la recuperaciÃ³n',
      };
    }
  };

  const updateUser = async (newUserData) => {
    try {
      const updatedUser = { ...user, ...newUserData };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser)); 
      setUser(updatedUser); 
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
        loading,
        login,
        loginWithPassword,
        register,
        logout,
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
