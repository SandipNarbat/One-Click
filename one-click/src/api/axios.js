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

// ── Item API ──────────────────────────────
export const itemAPI = {
  getAll:     ()          => api.get('/items'),
  getById:    (id)        => api.get(`/items/${id}`),
  getNextId:  ()          => api.get('/items/generate/next-id'),
  create:     (data)      => api.post('/items', data),
  update:     (id, data)  => api.put(`/items/${id}`, data),
  delete:     (id)        => api.delete(`/items/${id}`),
  search:     (query)     => api.get(`/items/search/${query}`),
};

// ── Sales Person API ──────────────────────
export const salesPersonAPI = {
  getAll:    ()          => api.get('/salespersons'),
  getById:   (id)        => api.get(`/salespersons/${id}`),
  getNextId: ()          => api.get('/salespersons/generate/next-id'),
  create:    (data)      => api.post('/salespersons', data),
  update:    (id, data)  => api.put(`/salespersons/${id}`, data),
  delete:    (id)        => api.delete(`/salespersons/${id}`),
  search:    (query)     => api.get(`/salespersons/search/${query}`),
};

// ── Service Center API ────────────────────
export const serviceCenterAPI = {
  getAll:          ()         => api.get('/servicecenters'),
  getById:         (id)       => api.get(`/servicecenters/${id}`),
  getNextSerial:   ()         => api.get('/servicecenters/generate/next-serial'),
  getProductTypes: ()         => api.get('/servicecenters/options/product-types'),
  getBrands:       ()         => api.get('/servicecenters/options/brands'),
  create:          (data)     => api.post('/servicecenters', data),
  update:          (id, data) => api.put(`/servicecenters/${id}`, data),
  delete:          (id)       => api.delete(`/servicecenters/${id}`),
};

// ── DOA API ───────────────────────────────
export const doaAPI = {
  getAll:           (supplierId) => api.get('/doa', { params: { supplierId } }),
  getById:          (id)         => api.get(`/doa/${id}`),
  getBySupplier:    (supplierId) => api.get(`/doa/supplier/${supplierId}`),
  getSupplierStats: (supplierId) => api.get(`/doa/stats/supplier/${supplierId}`),
  create:           (data)       => api.post('/doa', data),
  update:           (id, data)   => api.put(`/doa/${id}`, data),
  delete:           (id)         => api.delete(`/doa/${id}`),
};

// ── Price Drop API ────────────────────────
export const priceDropAPI = {
  getItems:      (params) => api.get('/pricedrop/items', { params }),
  getModels:     (params) => api.get('/pricedrop/options/models', { params }),
  getBrands:     (params) => api.get('/pricedrop/options/brands', { params }),
  applyDrop:     (data)   => api.post('/pricedrop/apply', data),
  getHistory:    (itemId) => api.get(`/pricedrop/history/${itemId}`),
  getAllHistory:  (params) => api.get('/pricedrop/history', { params }),
};

// ── Change Master API ─────────────────────
export const changeAPI = {
  getItems:          (params)    => api.get('/change/items', { params }),
  getItemById:       (itemId)    => api.get(`/change/item/${itemId}`),
  getModels:         ()          => api.get('/change/options/models'),
  getBrands:         ()          => api.get('/change/options/brands'),
  getColours:        ()          => api.get('/change/options/colours'),
  changeSalePrice:   (id, data)  => api.put(`/change/sale-price/${id}`, data),
  changeSalePriceBulk: (data)    => api.put('/change/sale-price-bulk', data),
  changeProductDetails:(id, data)=> api.put(`/change/product-details/${id}`, data),
  changeImei:        (id, data)  => api.put(`/change/imei/${id}`, data),
};

// ── Report API ────────────────────────────
export const reportAPI = {
  getReport:        (params) => api.get('/report', { params }),
  getSuppliers:     ()       => api.get('/report/options/suppliers'),
  getProducts:      ()       => api.get('/report/options/products'),
  getBrands:        ()       => api.get('/report/options/brands'),
  getModels:        ()       => api.get('/report/options/models'),
  getSummaryStats:  ()       => api.get('/report/stats/summary'),
  createSale:       (data)   => api.post('/report', data),
  updateSale:       (id, data) => api.put(`/report/${id}`, data),
  deleteSale:       (id)     => api.delete(`/report/${id}`),
};

// ── Purchase API ──────────────────────────
export const purchaseAPI = {
  getAll:   ()           => api.get('/purchases/all'),
  getById:  (id)         => api.get(`/purchases/view/${id}`),
  create:   (data)       => api.post('/purchases/new', data),
  update:   (id, data)   => api.put(`/purchases/update/${id}`, data),
  delete:   (id)         => api.delete(`/purchases/delete/${id}`),
  search:   (query)      => api.get(`/purchases/search/${query}`),
};

export default api;
