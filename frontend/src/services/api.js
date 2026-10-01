import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

let accessToken = null;
export const setToken = (t) => { accessToken = t; };
export const getToken = () => accessToken;

api.interceptors.request.use((cfg) => {
  if (accessToken) cfg.headers.Authorization = `Bearer ${accessToken}`;
  return cfg;
});

let refreshing = null;
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry &&
        !original.url.includes('/auth/')) {
      original._retry = true;
      try {
        refreshing = refreshing || api.post('/auth/refresh');
        const { data } = await refreshing;
        refreshing = null;
        setToken(data.data.accessToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        refreshing = null; setToken(null);
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export const getErrorMessage = (e) =>
  e?.response?.data?.error?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่';
