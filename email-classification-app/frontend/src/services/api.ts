import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Implement token refresh logic here
        // const newToken = await refreshToken();
        // localStorage.setItem('access_token', newToken);
        // return api(originalRequest);
      } catch (refreshError) {
        // Redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API methods
export const emailsApi = {
  getAll: (params?: { category?: string; status?: string; page?: number; limit?: number }) =>
    api.get('/api/emails', { params }),
  getById: (id: string) =>
    api.get(`/api/emails/${id}`),
  process: (id: string) =>
    api.post(`/api/emails/${id}/process`)
};

export const draftsApi = {
  getAll: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get('/api/drafts', { params }),
  getById: (id: string) =>
    api.get(`/api/drafts/${id}`),
  update: (id: string, data: { body?: string; subject?: string }) =>
    api.put(`/api/drafts/${id}`, data),
  send: (id: string) =>
    api.post(`/api/drafts/${id}/send`),
  approve: (id: string) =>
    api.post(`/api/drafts/${id}/approve`),
  reject: (id: string) =>
    api.post(`/api/drafts/${id}/reject`)
};

export const statsApi = {
  getDashboard: () =>
    api.get('/api/stats/dashboard'),
  getTimeline: (days: number = 7) =>
    api.get('/api/stats/timeline', { params: { days } })
};

export const settingsApi = {
  get: () =>
    api.get('/api/settings'),
  update: (data: any) =>
    api.put('/api/settings', data)
};

export const authApi = {
  login: (code: string) =>
    api.post('/api/auth/login', { code }),
  logout: () =>
    api.post('/api/auth/logout'),
  getMe: () =>
    api.get('/api/auth/me')
};
