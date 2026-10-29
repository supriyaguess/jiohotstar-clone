import axios from 'axios';

// Dev: Vite proxies /api to the backend. Prod: set VITE_API_URL to the API origin + /api.
export const API_URL = import.meta.env.VITE_API_URL || '/api';

let accessToken = null;
export const setAccessToken = (token) => { accessToken = token; };
export const getAccessToken = () => accessToken;

export const api = axios.create({ baseURL: API_URL, withCredentials: true });

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// Refresh tokens are single-use, so concurrent callers must share one in-flight request.
let refreshing = null;
export function refreshSession() {
  if (!refreshing) {
    refreshing = axios
      .post(`${API_URL}/auth/refresh`, null, { withCredentials: true })
      .then((res) => {
        setAccessToken(res.data.accessToken);
        return res.data.user;
      })
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

// On 401 for an authenticated request: refresh once, then retry.
api.interceptors.response.use(undefined, async (error) => {
  const { config, response } = error;
  if (response?.status !== 401 || !config?.headers?.Authorization || config._retried) throw error;
  config._retried = true;
  try {
    await refreshSession();
  } catch {
    setAccessToken(null);
    throw error;
  }
  return api(config);
});

export const apiError = (err, fallback = 'Something went wrong. Please try again.') =>
  err?.response?.data?.error || fallback;
