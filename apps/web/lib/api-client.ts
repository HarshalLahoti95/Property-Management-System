import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 15000,
  withCredentials: true,
});

// Mutex-like lock to prevent concurrent refresh calls.
// Without this, multiple simultaneous 401 responses each independently
// trigger a refresh, causing race conditions where tokens get rotated
// out from under in-flight retry requests.
let isRefreshing = false;
let refreshSubscribers: Array<(err?: Error) => void> = [];

function subscribeToRefresh(callback: (err?: Error) => void) {
  refreshSubscribers.push(callback);
}

function onRefreshComplete(err?: Error) {
  refreshSubscribers.forEach((cb) => cb(err));
  refreshSubscribers = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check for 401 Unauthorized and that we haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // If a refresh is already in progress, queue this request
      // to retry after the refresh completes (instead of firing
      // a second concurrent refresh).
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeToRefresh((refreshErr?: Error) => {
            if (refreshErr) {
              reject(refreshErr);
            } else {
              resolve(apiClient(originalRequest));
            }
          });
        });
      }

      isRefreshing = true;

      try {
        await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        onRefreshComplete();
        return apiClient(originalRequest);
      } catch (refreshErr) {
        const refreshError = refreshErr instanceof Error ? refreshErr : new Error('Token refresh failed');
        onRefreshComplete(refreshError);
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    // Centralized API error parsing
    const errorMessage = error.response?.data?.message || error.message || 'API request failed';
    return Promise.reject(new Error(errorMessage));
  }
);
