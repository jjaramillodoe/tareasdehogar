import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://kids-rewards.preview.emergentagent.com';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  register: async (email: string, password: string, name: string) => {
    const response = await api.post('/auth/register', { email, password, name });
    return response.data;
  },
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Family API
export const familyAPI = {
  create: async (name: string, currency: string) => {
    const response = await api.post('/families', { name, currency });
    return response.data;
  },
  getMy: async () => {
    const response = await api.get('/families/my');
    return response.data;
  },
  update: async (data: { name?: string; currency?: string }) => {
    const response = await api.put('/families/my', data);
    return response.data;
  },
};

// Children API
export const childrenAPI = {
  create: async (name: string, age: number, alias?: string, pin?: string) => {
    const response = await api.post('/children', { name, age, alias, pin });
    return response.data;
  },
  getAll: async () => {
    const response = await api.get('/children');
    return response.data;
  },
  getOne: async (childId: string) => {
    const response = await api.get(`/children/${childId}`);
    return response.data;
  },
  update: async (childId: string, data: { name?: string; age?: number; alias?: string; pin?: string }) => {
    const response = await api.put(`/children/${childId}`, data);
    return response.data;
  },
  delete: async (childId: string) => {
    const response = await api.delete(`/children/${childId}`);
    return response.data;
  },
  login: async (childId: string, pin?: string) => {
    const response = await api.post('/children/login', { child_id: childId, pin });
    return response.data;
  },
};

// Chores API
export const choresAPI = {
  create: async (title: string, description: string | undefined, amount: number, frequency: string, assigned_to: string[]) => {
    const response = await api.post('/chores', { title, description, amount, frequency, assigned_to });
    return response.data;
  },
  getAll: async (status?: string) => {
    const params = status ? { status } : {};
    const response = await api.get('/chores', { params });
    return response.data;
  },
  getForChild: async (childId: string, status?: string) => {
    const params = status ? { status } : {};
    const response = await api.get(`/chores/child/${childId}`, { params });
    return response.data;
  },
  getOne: async (choreId: string) => {
    const response = await api.get(`/chores/${choreId}`);
    return response.data;
  },
  update: async (choreId: string, data: any) => {
    const response = await api.put(`/chores/${choreId}`, data);
    return response.data;
  },
  delete: async (choreId: string) => {
    const response = await api.delete(`/chores/${choreId}`);
    return response.data;
  },
  complete: async (choreId: string, childId: string, comment?: string) => {
    const response = await api.post(`/chores/${choreId}/complete?child_id=${childId}`, { comment });
    return response.data;
  },
  approve: async (choreId: string) => {
    const response = await api.post(`/chores/${choreId}/approve`);
    return response.data;
  },
  reject: async (choreId: string) => {
    const response = await api.post(`/chores/${choreId}/reject`);
    return response.data;
  },
  reset: async (choreId: string) => {
    const response = await api.post(`/chores/${choreId}/reset`);
    return response.data;
  },
};

// Payments API
export const paymentsAPI = {
  getAll: async () => {
    const response = await api.get('/payments');
    return response.data;
  },
  getForChild: async (childId: string) => {
    const response = await api.get(`/payments/child/${childId}`);
    return response.data;
  },
};

// Stats API
export const statsAPI = {
  getChildStats: async (childId: string) => {
    const response = await api.get(`/stats/child/${childId}`);
    return response.data;
  },
};

export default api;
