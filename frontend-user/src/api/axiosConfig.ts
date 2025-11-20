import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { isTokenValid, getToken, clearToken } from '../utils/tokenManager';
import { store } from '../store/store';
import { logout } from '../features/auth/authSlice';

// TODO 
// In production we should hide that url
const API_BASE_URL = import.meta.env.VITE_ASP_NET_API_BASE || 'http://localhost:5000/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Lista endpointów, które nie wymagają autoryzacji
// Uwaga: niektóre endpointy mogą wymagać tokenu w zależności od kontekstu (np. publiczne vs prywatne datasety)
const PUBLIC_ENDPOINTS = [
  '/Auth/login', 
  '/Auth/register', 
  '/Project/All', 
  '/Project/New', 
  '/Project/Popular',
  '/Dataset' // Publiczne datasety mogą być dostępne bez tokenu
];

// Request interceptor - dodaje token do nagłówków i sprawdza ważność
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Sprawdź, czy endpoint wymaga autoryzacji
    const requiresAuth = !PUBLIC_ENDPOINTS.some(endpoint => 
      config.url?.includes(endpoint)
    );

    if (requiresAuth) {
      // Sprawdź ważność tokenu przed każdym requestem wymagającym autoryzacji
      // Nawet jeśli token jest już w nagłówkach (dodany ręcznie przez serwis)
      if (!isTokenValid()) {
        // Token wygasł - wyloguj użytkownika
        store.dispatch(logout());
        return Promise.reject(new Error('Token wygasł. Zaloguj się ponownie.'));
      }

      // Pobierz aktualny ważny token i dodaj do nagłówków (tylko jeśli nie został już dodany)
      const token = getToken();
      if (token && config.headers && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - obsługuje błędy 401 (Unauthorized)
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // Jeśli otrzymaliśmy 401, token jest nieprawidłowy - wyloguj użytkownika
    if (error.response?.status === 401) {
      clearToken();
      store.dispatch(logout());
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;