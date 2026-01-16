import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { ENDPOINTS } from '../config/api.config';
import {
  confirmTotp as confirmTotpService,
  loginTotp,
  registerUser,
  setupTotp as setupTotpService,
  totpStatus as totpStatusService,
} from '../services/auth';

export const AuthContext = createContext();

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
    if (typeof Buffer !== 'undefined') {
      return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
    }
  } catch (err) {
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
      const response = await api.get('/api/info/user', { params: { userEmail: email } });
      return response.data?.data || response.data || null;
    } catch (err) {
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
      return {
        success: false,
        error: error.response?.data?.message || 'Error al iniciar sesión con TOTP',
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
        error: error.response?.data?.message || 'Error al registrarse',
      };
    }
  };

  const logout = async () => {
    try {
      await api.post(ENDPOINTS.LOGOUT);
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      setUser(null);
      setRoles([]);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        roles,
        loading,
        login,
        register,
        logout,
        setupTotp: setupTotpService,
        confirmTotp: confirmTotpService,
        totpStatus: totpStatusService,
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
