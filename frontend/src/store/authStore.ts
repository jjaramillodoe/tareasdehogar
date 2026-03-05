import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, familyAPI } from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  family_id: string | null;
}

interface Family {
  id: string;
  name: string;
  currency: string;
  owner_id: string;
}

interface Child {
  id: string;
  name: string;
  age: number;
  alias?: string;
  balance: number;
  family_id: string;
}

interface AuthState {
  user: User | null;
  family: Family | null;
  selectedChild: Child | null;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  setFamily: (family: Family) => void;
  refreshUser: () => Promise<void>;
  refreshFamily: () => Promise<void>;
  setSelectedChild: (child: Child | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  family: null,
  selectedChild: null,
  token: null,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        set({ token, isLoading: true });
        const user = await authAPI.getMe();
        set({ user });
        
        if (user.family_id) {
          try {
            const family = await familyAPI.getMy();
            set({ family });
          } catch (e) {
            // Family might not exist
          }
        }
      }
    } catch (error) {
      // Token invalid, clear it
      await AsyncStorage.removeItem('token');
      set({ token: null, user: null, family: null });
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const response = await authAPI.login(email, password);
      await AsyncStorage.setItem('token', response.access_token);
      set({ token: response.access_token, user: response.user });
      
      if (response.user.family_id) {
        try {
          const family = await familyAPI.getMy();
          set({ family });
        } catch (e) {
          // Family might not exist
        }
      }
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email: string, password: string, name: string) => {
    set({ isLoading: true });
    try {
      const response = await authAPI.register(email, password, name);
      await AsyncStorage.setItem('token', response.access_token);
      set({ token: response.access_token, user: response.user });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('token');
    set({ token: null, user: null, family: null, selectedChild: null });
  },

  setFamily: (family: Family) => {
    set({ family });
  },

  refreshUser: async () => {
    try {
      const user = await authAPI.getMe();
      set({ user });
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  },

  refreshFamily: async () => {
    try {
      const family = await familyAPI.getMy();
      set({ family });
    } catch (error) {
      console.error('Error refreshing family:', error);
    }
  },

  setSelectedChild: (child: Child | null) => {
    set({ selectedChild: child });
  },
}));
