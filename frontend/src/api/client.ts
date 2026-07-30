import axios from 'axios';
import { useStore } from '../store/useStore';

// Sanitiza a URL Base para evitar duplicidades do prefixo /api
const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const baseURL = rawBaseUrl.replace(/\/api\/?$/, '');

const apiClient = axios.create({
  baseURL: baseURL,
});

// Interceptor para injetar o token JWT de Autorização
apiClient.interceptors.request.use(
  (config) => {
    const state = useStore.getState();
    const token = state.user?.token;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de resposta: detecta token expirado/inválido (403) e faz logout automático
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isAuthError = status === 403 || status === 401;
    const isTokenError = error.response?.data?.error?.toLowerCase().includes('token') ||
                         error.response?.data?.error?.toLowerCase().includes('inválido') ||
                         error.response?.data?.error?.toLowerCase().includes('autorizado');

    // Se 401/403 com erro de token, limpa a sessão e redireciona ao login
    if (isAuthError && isTokenError) {
      console.warn('[Auth] Token inválido ou expirado. Fazendo logout automático...');
      useStore.getState().setUser(null);
      localStorage.clear();
      // Redireciona para login do paciente preservando a URL atual
      const currentPath = window.location.pathname;
      const isDoctor = currentPath.includes('/doctor');
      window.location.href = isDoctor ? '/doctor/login' : '/patient/login';
    }

    return Promise.reject(error);
  }
);

export default apiClient;
