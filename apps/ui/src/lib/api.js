// src/lib/api.js
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://nexus-core-a0px.onrender.com/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000, // Increased to 45s for Render cold-starts
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("authToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new Event("auth:unauthorized"));
    }
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "API request failed";
    return Promise.reject(new Error(message));
  }
);

export const apiFetch = async (endpoint, options = {}) => {
  const method = (options.method || "GET").toLowerCase();
  const config = {
    url: endpoint,
    method,
    data: options.body,
    params: options.params,
    timeout: options.timeout || 45000,
    ...options,
  };

  return apiClient(config);
};