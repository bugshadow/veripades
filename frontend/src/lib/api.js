import axios from 'axios';

let accessToken = null;
let unauthorizedHandler = null;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 30000,
});

export const setAccessToken = (token) => { accessToken = token || null; };
export const setUnauthorizedHandler = (handler) => { unauthorizedHandler = handler; };

api.interceptors.request.use((config) => {
  if (config.publicRequest) {
    delete config.headers?.Authorization;
    return config;
  }
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && accessToken && unauthorizedHandler) unauthorizedHandler();
    return Promise.reject(error);
  },
);

const parseBlobAsJson = async (data) => {
  if (!(data instanceof Blob)) return null;
  try {
    const text = await data.text();
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export const getApiErrorMessage = async (error, fallback = 'La requête n’a pas pu aboutir.') => {
  const data = error?.response?.data;
  if (data instanceof Blob) {
    const parsed = await parseBlobAsJson(data);
    if (parsed?.error) return parsed.error;
    if (parsed?.detail) return parsed.detail;
  }
  return (
    data?.error
    || data?.detail
    || (error?.code === 'ECONNABORTED' ? 'Le service met trop de temps à répondre.' : null)
    || (error?.message === 'Network Error' ? 'Connexion à l’API impossible. Vérifiez que les services sont démarrés.' : null)
    || fallback
  );
};

export const downloadFile = async (url, filename, options = {}) => {
  try {
    const response = await api.get(url, { responseType: 'blob', ...options });
    const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/octet-stream' });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
    return { success: true };
  } catch (error) {
    const message = await getApiErrorMessage(error, 'Échec du téléchargement.');
    return { success: false, message };
  }
};

export const copyToClipboard = async (text) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const succeeded = document.execCommand('copy');
    document.body.removeChild(textarea);
    return succeeded;
  } catch {
    return false;
  }
};

export default api;
