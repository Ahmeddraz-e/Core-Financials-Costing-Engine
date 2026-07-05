/**
 * Base API helper with authentication token management.
 * All API calls go through this helper to ensure auth headers are attached.
 */

const API_BASE_URL = '/api';

// ═══════════════════════════════════════
// TOKEN MANAGEMENT
// ═══════════════════════════════════════

export function getAuthToken(): string | null {
  return localStorage.getItem('erp_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('erp_token', token);
}

export function clearAuthToken(): void {
  localStorage.removeItem('erp_token');
  localStorage.removeItem('erp_user');
}

export function getSavedUser(): any | null {
  try {
    const raw = localStorage.getItem('erp_user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setSavedUser(user: any): void {
  localStorage.setItem('erp_user', JSON.stringify(user));
}

// ═══════════════════════════════════════
// API REQUEST HELPER
// ═══════════════════════════════════════

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    clearAuthToken();
    window.location.reload();
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(error.error || `API Error: ${res.status}`);
  }

  // Handle empty responses (204 No Content)
  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text);
}

// ═══════════════════════════════════════
// AUTH API
// ═══════════════════════════════════════

export async function login(username: string, password: string, company?: string, branch?: string): Promise<{
  token: string;
  user: any;
  expiresAt: string;
}> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, company, branch })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(err.error || 'Login failed');
  }

  const data = await res.json();
  setAuthToken(data.token);
  setSavedUser(data.user);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await apiRequest('/auth/logout', { method: 'POST' });
  } catch { /* ignore */ }
  clearAuthToken();
}

export async function getCurrentUser(): Promise<any> {
  return apiRequest('/auth/me');
}

// ═══════════════════════════════════════
// USER MANAGEMENT API
// ═══════════════════════════════════════

export async function getSystemUsers(): Promise<any[]> {
  return apiRequest('/auth/users');
}

export async function createSystemUser(data: {
  username: string;
  password: string;
  role: string;
  nameAr: string;
  nameEn: string;
  permissions?: any;
}): Promise<any> {
  return apiRequest('/auth/users', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateSystemUser(id: string, data: {
  nameAr?: string;
  nameEn?: string;
  role?: string;
  active?: boolean;
  password?: string;
  permissions?: any;
}): Promise<any> {
  return apiRequest(`/auth/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function deleteSystemUser(id: string): Promise<void> {
  return apiRequest(`/auth/users/${id}`, { method: 'DELETE' });
}


// ═══════════════════════════════════════
// LEGACY API (backward compatibility)
// ═══════════════════════════════════════

import { ERPData } from '../types';

export async function fetchERPData(): Promise<ERPData> {
  return apiRequest<ERPData>('/erp-data');
}

export async function saveERPData(data: ERPData): Promise<void> {
  await apiRequest('/erp-data', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

// ═══════════════════════════════════════
// SYSTEM API
// ═══════════════════════════════════════

export async function createDatabaseBackup(): Promise<{ messageAr: string; messageEn: string }> {
  return apiRequest('/system/backup', { method: 'POST' });
}

export async function restoreDatabaseBackup(): Promise<{ messageAr: string; messageEn: string }> {
  return apiRequest('/system/restore', { method: 'POST' });
}

export async function resetDatabaseToDefault(): Promise<{ messageAr: string; messageEn: string }> {
  return apiRequest('/system/reset', { method: 'POST' });
}

export async function fetchDashboardData(): Promise<any> {
  return apiRequest('/system/dashboard');
}

export async function fetchBadges(): Promise<{ pendingPRs: number; lowStockItems: number; bouncedCheques: number }> {
  return apiRequest('/system/badges');
}

export async function fetchNotifications(): Promise<any[]> {
  return apiRequest('/system/notifications');
}

// ═══════════════════════════════════════
// CHART ENDPOINTS (legacy compat)
// ═══════════════════════════════════════

export async function fetchSalesDailyTotals(): Promise<{ date: string; total: number; foodCost: number }[]> {
  try { return await apiRequest('/charts/sales-daily'); } catch { return []; }
}

export async function fetchAccountBalancesByType(): Promise<{ type: string; total: number }[]> {
  try { return await apiRequest('/charts/account-balances'); } catch { return []; }
}

export async function fetchInventorySummary(): Promise<{ category: string; totalValue: number; totalQty: number }[]> {
  try { return await apiRequest('/charts/inventory-summary'); } catch { return []; }
}

export async function fetchMonthlySales(): Promise<{ month: string; total: number }[]> {
  try { return await apiRequest('/charts/monthly-sales'); } catch { return []; }
}

export async function fetchTopSellingItems(): Promise<{ nameAr: string; nameEn: string; totalQty: number; totalRevenue: number }[]> {
  try { return await apiRequest('/charts/top-items'); } catch { return []; }
}

// ═══════════════════════════════════════
// MODULE-SPECIFIC APIs
// ═══════════════════════════════════════

export const accountsApi = {
  getAll: () => apiRequest<any[]>('/accounts'),
  getById: (id: string) => apiRequest<any>(`/accounts/${id}`),
  create: (data: any) => apiRequest<any>('/accounts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiRequest<any>(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiRequest<void>(`/accounts/${id}`, { method: 'DELETE' }),
};

export const journalApi = {
  getAll: () => apiRequest<any[]>('/journal-entries'),
  getById: (id: string) => apiRequest<any>(`/journal-entries/${id}`),
  create: (data: any) => apiRequest<any>('/journal-entries', { method: 'POST', body: JSON.stringify(data) }),
  approve: (id: string) => apiRequest<any>(`/journal-entries/${id}/approve`, { method: 'PUT' }),
  delete: (id: string) => apiRequest<void>(`/journal-entries/${id}`, { method: 'DELETE' }),
};

export const salesApi = {
  getAll: () => apiRequest<any[]>('/sales'),
  getById: (id: string) => apiRequest<any>(`/sales/${id}`),
  create: (data: any) => apiRequest<any>('/sales', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string, body?: any) => apiRequest<void>(`/sales/${id}`, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined }),
  dailyTotals: () => apiRequest<any[]>('/sales/charts/daily'),
  monthlyTotals: () => apiRequest<any[]>('/sales/charts/monthly'),
  topItems: () => apiRequest<any[]>('/sales/charts/top-items'),
};

export const purchasesApi = {
  getAll: () => apiRequest<any[]>('/purchases'),
  getById: (id: string) => apiRequest<any>(`/purchases/${id}`),
  create: (data: any) => apiRequest<any>('/purchases', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id: string, data: any) => apiRequest<any>(`/purchases/${id}/status`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiRequest<void>(`/purchases/${id}`, { method: 'DELETE' }),
};

export const inventoryApi = {
  getAll: () => apiRequest<any[]>('/inventory'),
  getById: (id: string) => apiRequest<any>(`/inventory/${id}`),
  create: (data: any) => apiRequest<any>('/inventory', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiRequest<any>(`/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adjust: (id: string, delta: number) => apiRequest<any>(`/inventory/${id}/adjust`, { method: 'PUT', body: JSON.stringify({ delta }) }),
  delete: (id: string) => apiRequest<void>(`/inventory/${id}`, { method: 'DELETE' }),
  summary: () => apiRequest<any[]>('/inventory/summary'),
  lowStock: () => apiRequest<any[]>('/inventory/low-stock'),
  // Wastage
  getAllWastage: () => apiRequest<any[]>('/inventory/wastage/all'),
  createWastage: (data: any) => apiRequest<any>('/inventory/wastage', { method: 'POST', body: JSON.stringify(data) }),
  // Recipes
  getAllRecipes: () => apiRequest<any[]>('/inventory/recipes/all'),
  getRecipe: (id: string) => apiRequest<any>(`/inventory/recipes/${id}`),
  createRecipe: (data: any) => apiRequest<any>('/inventory/recipes', { method: 'POST', body: JSON.stringify(data) }),
  updateRecipe: (id: string, data: any) => apiRequest<any>(`/inventory/recipes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRecipe: (id: string) => apiRequest<void>(`/inventory/recipes/${id}`, { method: 'DELETE' }),
};

export const treasuryApi = {
  getCashboxes: () => apiRequest<any[]>('/treasury/cashboxes'),
  createCashbox: (data: any) => apiRequest<any>('/treasury/cashboxes', { method: 'POST', body: JSON.stringify(data) }),
  updateCashbox: (id: string, data: any) => apiRequest<any>(`/treasury/cashboxes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCashbox: (id: string) => apiRequest<void>(`/treasury/cashboxes/${id}`, { method: 'DELETE' }),
  getBanks: () => apiRequest<any[]>('/treasury/banks'),
  createBank: (data: any) => apiRequest<any>('/treasury/banks', { method: 'POST', body: JSON.stringify(data) }),
  updateBank: (id: string, data: any) => apiRequest<any>(`/treasury/banks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBank: (id: string) => apiRequest<void>(`/treasury/banks/${id}`, { method: 'DELETE' }),
  getCheques: () => apiRequest<any[]>('/treasury/cheques'),
  createCheque: (data: any) => apiRequest<any>('/treasury/cheques', { method: 'POST', body: JSON.stringify(data) }),
  updateChequeStatus: (id: string, status: string) => apiRequest<any>(`/treasury/cheques/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  deleteCheque: (id: string) => apiRequest<void>(`/treasury/cheques/${id}`, { method: 'DELETE' }),
  getTransactions: () => apiRequest<any[]>('/treasury/transactions'),
  createTransaction: (data: any) => apiRequest<any>('/treasury/transactions', { method: 'POST', body: JSON.stringify(data) }),
  deleteTransaction: (id: string) => apiRequest<void>(`/treasury/transactions/${id}`, { method: 'DELETE' }),
};

export const employeesApi = {
  getAll: () => apiRequest<any[]>('/employees'),
  getById: (id: string) => apiRequest<any>(`/employees/${id}`),
  create: (data: any) => apiRequest<any>('/employees', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiRequest<any>(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiRequest<void>(`/employees/${id}`, { method: 'DELETE' }),
};

export const fixedAssetsApi = {
  getAll: () => apiRequest<any[]>('/fixed-assets'),
  create: (data: any) => apiRequest<any>('/fixed-assets', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiRequest<any>(`/fixed-assets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiRequest<void>(`/fixed-assets/${id}`, { method: 'DELETE' }),
};

export const suppliersApi = {
  getAll: () => apiRequest<any[]>('/suppliers'),
  create: (data: any) => apiRequest<any>('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiRequest<any>(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiRequest<void>(`/suppliers/${id}`, { method: 'DELETE' }),
};

export const customersApi = {
  getAll: () => apiRequest<any[]>('/customers'),
  create: (data: any) => apiRequest<any>('/customers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiRequest<any>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiRequest<void>(`/customers/${id}`, { method: 'DELETE' }),
};

export const budgetsApi = {
  getAll: () => apiRequest<any[]>('/budgets'),
  create: (data: any) => apiRequest<any>('/budgets', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiRequest<any>(`/budgets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiRequest<void>(`/budgets/${id}`, { method: 'DELETE' }),
};

export const auditApi = {
  getAll: () => apiRequest<any[]>('/audit-logs'),
  clear: () => apiRequest<void>('/audit-logs', { method: 'DELETE' }),
};
