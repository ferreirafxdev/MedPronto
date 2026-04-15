import axios from 'axios';
import { useStore } from '../store/useStore';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
});

// Interceptor to add Authorization header
apiClient.interceptors.request.use(
  (config) => {
    // We can't use useStore() hook here directly if it's outside a component,
    // so we accesszustand state directly if needed, or use the store's getState.
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
