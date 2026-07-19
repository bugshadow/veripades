import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  if (config.publicRequest) {
    config.headers?.delete?.('Authorization');
    config.headers?.delete?.('authorization');
    delete config.headers?.Authorization;
    delete config.headers?.authorization;
    return config;
  }

  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getApiErrorMessage = (error) => {
  return error?.response?.data?.error || error?.response?.data?.detail || error?.message || 'Erreur API inconnue';
};

export default api;
