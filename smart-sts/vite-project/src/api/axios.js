// src/api/axios.js
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// Response interceptor — unwrap { success, data }
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.error || 'Network error';
    return Promise.reject(new Error(message));
  }
);

// ── Supplier API ──────────────────────────
export const supplierAPI = {
  getAll:     ()       => api.get('/suppliers'),
  getById:    (id)     => api.get(`/suppliers/${id}`),
  getNextId:  ()       => api.get('/suppliers/generate/next-id'),
  create:     (data)   => api.post('/suppliers', data),
  update:     (id, data) => api.put(`/suppliers/${id}`, data),
  delete:     (id)     => api.delete(`/suppliers/${id}`),
  search:     (query)  => api.get(`/suppliers/search/${query}`),
};

// ── Customer API ──────────────────────────
export const customerAPI = {
  getAll:     ()       => api.get('/customers'),
  getById:    (id)     => api.get(`/customers/${id}`),
  getNextId:  ()       => api.get('/customers/generate/next-id'),
  create:     (data)   => api.post('/customers', data),
  update:     (id, data) => api.put(`/customers/${id}`, data),
  delete:     (id)     => api.delete(`/customers/${id}`),
  search:     (query)  => api.get(`/customers/search/${query}`),
};

// ── Product API ───────────────────────────
export const productAPI = {
  getAll:     ()       => api.get('/products'),
  getById:    (id)     => api.get(`/products/${id}`),
  create:     (data)   => api.post('/products', data),
  update:     (id, data) => api.put(`/products/${id}`, data),
  delete:     (id)     => api.delete(`/products/${id}`),
  search:     (query)  => api.get(`/products/search/${query}`),
  getItems:   (id)     => api.get(`/products/${id}/items`),
};

export default api;
