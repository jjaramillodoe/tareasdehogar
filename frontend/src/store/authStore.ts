import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { authAPI, familyAPI } from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  family_id: string | null;
  family_role?: string | null;
}

interface Family {
  id: string;
  name: string;
  currency: string;
  country_code?: string | null;
  owner_id?: string;
  streak_bonus_amount?: number;
  savings_match_percent?: number;
  savings_match_weekly_cap?: number;
  family_challenge_target_percent?: number;
  child_login_code?: string;
  notifications_enabled_for_parents?: boolean;
  notifications_enabled_for_children?: boolean;
  notifications_quiet_hours_start?: number | null;
  notifications_quiet_hours_end?: number | null;
  min_withdrawal_amount?: number;
  max_withdrawal_amount?: number;
  max_daily_withdrawal_per_child?: number;
  demo_mode_enabled?: boolean;
  auto_logout_minutes?: number;
  permission_reset_activity_min_role?: 'owner' | 'admin' | 'parent';
  permission_approve_withdrawals_min_role?: 'owner' | 'admin' | 'parent';
  permission_edit_goals_min_role?: 'owner' | 'admin' | 'parent';
  pin_failed_attempt_limit?: number;
  pin_lockout_minutes?: number;
}

interface Child {
  id: string;
  name: string;
  age: number;
  alias?: string;
  gender?: 'mujer' | 'hombre' | null;
  balance: number;
  family_id: string;
  created_at?: string;
  savings_on_approve_percent?: number;
  savings_on_approve_goal_id?: string | null;
}

function mapChild(raw: Record<string, unknown>): Child {
  return {
    id: String(raw.id),
    name: String(raw.name),
    age: Number(raw.age),
    alias: raw.alias ? String(raw.alias) : undefined,
    gender: raw.gender === 'mujer' || raw.gender === 'hombre' ? raw.gender : undefined,
    balance: Number(raw.balance ?? 0),
    family_id: String(raw.family_id),
    created_at:
      typeof raw.created_at === 'string'
        ? raw.created_at
        : raw.created_at != null
          ? String(raw.created_at)
          : undefined,
    savings_on_approve_percent:
      raw.savings_on_approve_percent != null
        ? Number(raw.savings_on_approve_percent)
        : undefined,
    savings_on_approve_goal_id:
      raw.savings_on_approve_goal_id != null && raw.savings_on_approve_goal_id !== ''
        ? String(raw.savings_on_approve_goal_id)
        : raw.savings_on_approve_goal_id === null
          ? null
          : undefined,
  };
}

interface AuthState {
  user: User | null;
  family: Family | null;
  selectedChild: Child | null;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  isChildSession: boolean;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, inviteCode?: string) => Promise<void>;
  childLogin: (familyCode: string, childName: string, pin?: string) => Promise<void>;
  logout: () => Promise<void>;
  setFamily: (family: Family) => void;
  refreshUser: () => Promise<void>;
  refreshFamily: () => Promise<void>;
  setSelectedChild: (child: Child | null) => void;
  touchActivity: () => Promise<void>;
  enforceAutoLogout: () => Promise<boolean>;
}

const LAST_ACTIVITY_KEY = 'last_activity_ms';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  family: null,
  selectedChild: null,
  token: null,
  isLoading: false,
  isInitialized: false,
  isChildSession: false,

  initialize: async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        return;
      }
      await AsyncStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
      set({ token, isLoading: true });
      const session = await authAPI.getSession();
      if (session.type === 'child') {
        set({
          user: null,
          isChildSession: true,
          selectedChild: mapChild(session.child as Record<string, unknown>),
          family: session.family,
        });
      } else {
        const u = session.user as unknown as User;
        set({ user: u, isChildSession: false, selectedChild: null });
        if (u.family_id) {
          try {
            const fam = await familyAPI.getMy();
            set({ family: fam });
          } catch {
            /* ignore */
          }
        }
      }
    } catch {
      await AsyncStorage.removeItem('token');
      set({
        token: null,
        user: null,
        family: null,
        selectedChild: null,
        isChildSession: false,
      });
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const response = await authAPI.login(email, password);
      await AsyncStorage.setItem('token', response.access_token);
      await AsyncStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
      set({
        token: response.access_token,
        user: response.user,
        isChildSession: false,
        selectedChild: null,
      });

      if (response.user.family_id) {
        try {
          const family = await familyAPI.getMy();
          set({ family });
        } catch {
          /* ignore */
        }
      }
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email: string, password: string, name: string, inviteCode?: string) => {
    set({ isLoading: true });
    try {
      const response = await authAPI.register(email, password, name, inviteCode);
      await AsyncStorage.setItem('token', response.access_token);
      await AsyncStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
      set({
        token: response.access_token,
        user: response.user,
        isChildSession: false,
        selectedChild: null,
      });
      if (response.user.family_id) {
        try {
          const family = await familyAPI.getMy();
          set({ family });
        } catch {
          /* ignore */
        }
      }
    } finally {
      set({ isLoading: false });
    }
  },

  childLogin: async (familyCode: string, childName: string, pin?: string) => {
    set({ isLoading: true });
    try {
      const res = await authAPI.childLogin(familyCode, childName, pin);
      await AsyncStorage.setItem('token', res.access_token);
      await AsyncStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
      set({
        token: res.access_token,
        user: null,
        isChildSession: true,
        selectedChild: mapChild(res.child as Record<string, unknown>),
        family: res.family,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem(LAST_ACTIVITY_KEY);
    set({
      token: null,
      user: null,
      family: null,
      selectedChild: null,
      isChildSession: false,
    });
  },

  setFamily: (family: Family) => {
    set({ family });
  },

  refreshUser: async () => {
    if (get().isChildSession) {
      try {
        const session = await authAPI.getSession();
        if (session.type === 'child') {
          set({ selectedChild: mapChild(session.child as Record<string, unknown>) });
        }
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          await AsyncStorage.removeItem('token');
          set({
            token: null,
            user: null,
            family: null,
            selectedChild: null,
            isChildSession: false,
          });
        }
      }
      return;
    }
    try {
      const user = await authAPI.getMe();
      set({ user });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        await AsyncStorage.removeItem('token');
        set({
          token: null,
          user: null,
          family: null,
          selectedChild: null,
          isChildSession: false,
        });
        return;
      }
      console.error('Error refreshing user:', error);
    }
  },

  refreshFamily: async () => {
    if (get().isChildSession) return;
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

  touchActivity: async () => {
    await AsyncStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  },

  enforceAutoLogout: async () => {
    const { token, family } = get();
    if (!token) return false;
    const mins = Number(family?.auto_logout_minutes ?? 0);
    if (!Number.isFinite(mins) || mins <= 0) return false;
    const raw = await AsyncStorage.getItem(LAST_ACTIVITY_KEY);
    const last = raw ? Number(raw) : Date.now();
    if (Number.isFinite(last) && Date.now() - last > mins * 60 * 1000) {
      await get().logout();
      return true;
    }
    return false;
  },
}));
