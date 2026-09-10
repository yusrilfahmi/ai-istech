import type { ApiResponse } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${endpoint}`;

  const config: RequestInit = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Don't set Content-Type for FormData (let browser set it with boundary)
  if (options.body instanceof FormData) {
    delete (config.headers as Record<string, string>)['Content-Type'];
  }

  const response = await fetch(url, config);
  const data: ApiResponse<T> = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

// ============================================
// Auth
// ============================================
export const authApi = {
  login: (email: string, password: string) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    request('/api/auth/logout', { method: 'POST' }),

  me: () =>
    request('/api/auth/me'),
};

// ============================================
// Conversations
// ============================================
export const conversationApi = {
  list: (limit = 20) =>
    request(`/api/conversations?limit=${limit}`),

  create: (title?: string) =>
    request('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),

  get: (id: string) =>
    request(`/api/conversations/${id}`),

  delete: (id: string) =>
    request(`/api/conversations/${id}`, { method: 'DELETE' }),
};

// ============================================
// Messages
// ============================================
export const messageApi = {
  list: (conversationId: string) =>
    request(`/api/conversations/${conversationId}/messages`),

  send: (conversationId: string, content: string) =>
    request(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
};

// ============================================
// Knowledge
// ============================================
export const knowledgeApi = {
  list: (type?: string, status?: string) => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (status) params.set('status', status);
    const qs = params.toString();
    return request(`/api/knowledge${qs ? '?' + qs : ''}`);
  },

  get: (id: string) =>
    request(`/api/knowledge/${id}`),

  upload: (formData: FormData) =>
    request('/api/knowledge', {
      method: 'POST',
      body: formData,
    }),

  update: (id: string, data: Record<string, unknown>) =>
    request(`/api/knowledge/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  confirm: (id: string) =>
    request(`/api/knowledge/${id}/confirm`, { method: 'POST' }),

  archive: (id: string) =>
    request(`/api/knowledge/${id}/archive`, { method: 'POST' }),

  delete: (id: string) =>
    request(`/api/knowledge/${id}`, { method: 'DELETE' }),

  // ML Datasets
  listDatasets: () =>
    request('/api/knowledge/datasets'),

  createDataset: (data: Record<string, unknown>) =>
    request('/api/knowledge/datasets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ============================================
// Users
// ============================================
export const userApi = {
  list: () =>
    request('/api/users'),

  create: (data: Record<string, unknown>) =>
    request('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Record<string, unknown>) =>
    request(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  auditLogs: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/api/users/audit-logs${qs}`);
  },
};

// ============================================
// ML Training
// ============================================
export const mlTrainingApi = {
  list: () =>
    request('/api/ml-training'),

  get: (id: string) =>
    request(`/api/ml-training/${id}`),

  create: (data: Record<string, unknown>) =>
    request('/api/ml-training', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  unlock: (id: string) =>
    request(`/api/ml-training/${id}/unlock`, {
      method: 'PATCH',
    }),

  update: (id: string, data: Record<string, unknown>) =>
    request(`/api/ml-training/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request(`/api/ml-training/${id}`, {
      method: 'DELETE',
    }),
};


// ============================================
// Compressor Telemetry
// ============================================
export const compressorApi = {
  listTelemetry: (page = 1, limit = 50) =>
    request(`/api/compressor-telemetry?page=${page}&limit=${limit}`),
};
