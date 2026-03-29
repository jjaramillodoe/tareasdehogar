import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

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
  getFamilyReport: async (days: number = 7) => {
    const response = await api.get(`/stats/family/report?days=${days}`);
    return response.data;
  },
};

// Goals API (Metas)
export const goalsAPI = {
  create: async (title: string, description: string | undefined, target_tasks: number, bonus_amount: number, child_id: string, start_date?: string, end_date?: string) => {
    const response = await api.post('/goals', { title, description, target_tasks, bonus_amount, child_id, start_date, end_date });
    return response.data;
  },
  getAll: async (childId?: string) => {
    const params = childId ? { child_id: childId } : {};
    const response = await api.get('/goals', { params });
    return response.data;
  },
  getOne: async (goalId: string) => {
    const response = await api.get(`/goals/${goalId}`);
    return response.data;
  },
  update: async (goalId: string, data: any) => {
    const response = await api.put(`/goals/${goalId}`, data);
    return response.data;
  },
  delete: async (goalId: string) => {
    const response = await api.delete(`/goals/${goalId}`);
    return response.data;
  },
  payBonus: async (goalId: string) => {
    const response = await api.post(`/goals/${goalId}/pay-bonus`);
    return response.data;
  },
};

// Notifications API
export const notificationsAPI = {
  getAll: async (unreadOnly: boolean = false) => {
    const response = await api.get(`/notifications?unread_only=${unreadOnly}`);
    return response.data;
  },
  getUnreadCount: async () => {
    const response = await api.get('/notifications/count');
    return response.data;
  },
  markRead: async (notificationId: string) => {
    const response = await api.post(`/notifications/${notificationId}/read`);
    return response.data;
  },
  markAllRead: async () => {
    const response = await api.post('/notifications/read-all');
    return response.data;
  },
};

// Achievements API (Logros)
export const achievementsAPI = {
  getForChild: async (childId: string) => {
    const response = await api.get(`/achievements/child/${childId}`);
    return response.data;
  },
  getDefinitions: async () => {
    const response = await api.get('/achievements/definitions');
    return response.data;
  },
};

export default api;
