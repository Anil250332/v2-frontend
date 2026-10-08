import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://v2-backend-zflw.onrender.com/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT token automatically to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('v2online_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle global 401 unauthorized errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('v2online_token');
      localStorage.removeItem('v2online_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
