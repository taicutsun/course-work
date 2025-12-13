import axios from "axios";

export const API_URL = "http://localhost:3001";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Keep basic error handling for non-RTK Query requests
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // For 401 errors, let RTK Query handle token refresh
      // The component will handle retry logic
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);
