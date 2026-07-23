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

export default apiClient;
