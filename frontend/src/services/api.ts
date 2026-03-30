import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const LAST_ACTIVITY_KEY = 'last_activity_ms';

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
    // Keep idle timer fresh while the user is actively using the app.
    await AsyncStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  }
  return config;
});

// Auth API
export const authAPI = {
  register: async (
    email: string,
    password: string,
    name: string,
    invite_code?: string,
    device_name?: string
  ) => {
    const body: Record<string, string> = { email, password, name };
    if (invite_code?.trim()) body.invite_code = invite_code.trim();
    if (device_name?.trim()) body.device_name = device_name.trim();
    const response = await api.post('/auth/register', body);
    return response.data;
  },
  login: async (email: string, password: string, device_name?: string) => {
    const response = await api.post('/auth/login', { email, password, device_name });
    return response.data;
  },
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  getSession: async () => {
    const response = await api.get('/auth/session');
    return response.data as
      | { type: 'parent'; user: Record<string, unknown> }
      | {
          type: 'child';
          child: Record<string, unknown>;
          family: { id: string; name: string; currency: string };
        };
  },
  childLogin: async (family_code: string, child_name: string, pin?: string, device_name?: string) => {
    const response = await api.post('/auth/child-login', {
      family_code: family_code.trim(),
      child_name: child_name.trim(),
      pin: pin?.trim() || undefined,
      device_name: device_name?.trim() || undefined,
    });
    return response.data as {
      access_token: string;
      child: Record<string, unknown>;
      family: { id: string; name: string; currency: string };
    };
  },
  changePassword: async (current_password: string, new_password: string) => {
    const response = await api.post('/auth/change-password', { current_password, new_password });
    return response.data as { ok: boolean };
  },
  changeChildPin: async (data: { new_pin: string; current_pin?: string; child_id?: string }) => {
    const response = await api.post('/auth/change-child-pin', data);
    return response.data as { ok: boolean };
  },
  logoutAllSessions: async () => {
    const response = await api.post('/auth/logout-all-sessions');
    return response.data as { ok: boolean };
  },
  getSessions: async () => {
    const response = await api.get('/auth/sessions');
    return response.data as {
      id: string;
      device_name: string;
      created_at?: string;
      last_seen_at?: string;
      is_current: boolean;
    }[];
  },
  revokeSession: async (sessionId: string) => {
    const response = await api.post(`/auth/sessions/${encodeURIComponent(sessionId)}/revoke`);
    return response.data as { ok: boolean };
  },
};

// Family API
export const familyAPI = {
  create: async (data: { name: string; currency: string; country_code?: string | null }) => {
    const response = await api.post('/families', data);
    return response.data;
  },
  getMy: async () => {
    const response = await api.get('/families/my');
    return response.data;
  },
  update: async (data: {
    name?: string;
    currency?: string;
    country_code?: string | null;
    savings_match_percent?: number;
    savings_match_weekly_cap?: number;
    family_challenge_target_percent?: number;
    streak_bonus_amount?: number;
    notifications_enabled_for_parents?: boolean;
    notifications_enabled_for_children?: boolean;
    notifications_quiet_hours_start?: number;
    notifications_quiet_hours_end?: number;
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
  }) => {
    const response = await api.put('/families/my', data);
    return response.data;
  },
  createInvite: async () => {
    const response = await api.post('/families/invite');
    return response.data;
  },
  getMembers: async () => {
    const response = await api.get('/families/members');
    return response.data;
  },
  updateMemberRole: async (userId: string, role: 'admin' | 'parent') => {
    const response = await api.post(`/families/members/${encodeURIComponent(userId)}/role`, null, {
      params: { role },
    });
    return response.data as { ok: boolean; user_id: string; family_role: 'admin' | 'parent' };
  },
  resetActivity: async () => {
    const response = await api.post('/families/reset-activity');
    return response.data as {
      ok: boolean;
      deleted: Record<string, number>;
    };
  },
  exportActivityBackup: async () => {
    const response = await api.get('/families/activity-backup');
    return response.data as {
      exported_at: string;
      family_id: string;
      family: Record<string, unknown> | null;
      children: Record<string, unknown>[];
      activity: Record<string, unknown[]>;
      counts: Record<string, number>;
    };
  },
  partialResetActivity: async (data: {
    chores?: boolean;
    goals?: boolean;
    savings_goals?: boolean;
    payments?: boolean;
    withdrawals?: boolean;
    achievements?: boolean;
    notifications?: boolean;
    family_challenge_history?: boolean;
    reset_children_balance_and_streaks?: boolean;
  }) => {
    const response = await api.post('/families/reset-activity/partial', data);
    return response.data as { ok: boolean; deleted: Record<string, number> };
  },
  getAuditLog: async (limit: number = 50) => {
    const response = await api.get('/families/audit-log', { params: { limit } });
    return response.data as Array<{
      id: string;
      action: string;
      created_at: string;
      actor_user_id?: string | null;
      actor_child_id?: string | null;
      target_type?: string | null;
      target_id?: string | null;
      metadata?: Record<string, unknown>;
    }>;
  },
  restoreActivity: async (backup: Record<string, unknown>, apply: boolean = false) => {
    const response = await api.post('/families/activity-restore', { backup, apply });
    return response.data as {
      ok: boolean;
      applied: boolean;
      family_matches: boolean;
      backup_family_id?: string;
      current_family_id?: string;
      backup_counts?: Record<string, number>;
      current_counts?: Record<string, number>;
      inserted_counts?: Record<string, number>;
    };
  },
  demoSeed: async () => {
    const response = await api.post('/families/demo/seed');
    return response.data as { ok: boolean; created: Record<string, number> };
  },
  demoClear: async () => {
    const response = await api.post('/families/demo/clear');
    return response.data as { ok: boolean; deleted: Record<string, number> };
  },
  diagnostics: async () => {
    const response = await api.get('/families/diagnostics');
    return response.data as {
      server_time: string;
      api_status: string;
      db_status: string;
      family_id: string;
      last_backup_at?: string | null;
    };
  },
  getPublicByChildCode: async (code: string) => {
    const response = await api.get(
      `/families/public-by-code/${encodeURIComponent(code.trim().toUpperCase())}`
    );
    return response.data as {
      family_name: string;
      currency: string;
      children: { name: string; alias?: string | null }[];
    };
  },
};

// Children API
export const childrenAPI = {
  create: async (
    name: string,
    age: number,
    alias?: string,
    pin?: string,
    gender?: 'mujer' | 'hombre' | null
  ) => {
    const response = await api.post('/children', {
      name,
      age,
      alias,
      pin,
      ...(gender != null ? { gender } : {}),
    });
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
  update: async (
    childId: string,
    data: {
      name?: string;
      age?: number;
      alias?: string;
      pin?: string;
      gender?: 'mujer' | 'hombre' | null;
      savings_on_approve_percent?: number;
      savings_on_approve_goal_id?: string | null;
    }
  ) => {
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

export type SavingsSplitPreviewDTO = {
  total_pay: number;
  to_balance: number;
  to_savings: number;
  savings_goal_id: string | null;
  goal_title: string | null;
  goal_just_completed: boolean;
  auto_save_floor_applied?: boolean;
  auto_save_min_amount?: number | null;
};

// Chores API
export const choresAPI = {
  create: async (
    title: string,
    description: string | undefined,
    amount: number,
    frequency: string,
    assigned_to: string[],
    scheduled_date?: string,
    consecutive_days?: number
  ) => {
    const response = await api.post('/chores', {
      title,
      description,
      amount,
      frequency,
      assigned_to,
      scheduled_date,
      consecutive_days: consecutive_days ?? 1,
    });
    return response.data as unknown;
  },
  getCalendar: async (year: number, month: number) => {
    const response = await api.get('/chores/calendar', { params: { year, month } });
    return response.data as { date: string; chores: unknown[] }[];
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
  complete: async (choreId: string, childId: string, comment?: string, photo_url?: string) => {
    const response = await api.post(`/chores/${choreId}/complete?child_id=${childId}`, {
      comment,
      photo_url,
    });
    return response.data;
  },
  approve: async (
    choreId: string,
    opts?: {
      rating?: number;
      parent_feedback?: string;
      quality_bonus?: number;
      savings_percent?: number;
      savings_amount?: number;
      savings_goal_id?: string;
      savings_reason_note?: string;
    }
  ) => {
    const response = await api.post(`/chores/${choreId}/approve`, opts ?? {});
    return response.data;
  },
  /** Vista previa del reparto saldo / meta de ahorro (misma lógica que al aprobar). */
  previewSavingsSplit: async (
    childId: string,
    amount: number,
    opts?: {
      savings_percent?: number;
      savings_amount?: number;
      savings_goal_id?: string;
    }
  ) => {
    const params: Record<string, string | number> = {
      child_id: childId,
      amount,
    };
    if (opts?.savings_goal_id) params.savings_goal_id = opts.savings_goal_id;
    if (opts?.savings_percent != null) params.savings_percent = opts.savings_percent;
    if (opts?.savings_amount != null) params.savings_amount = opts.savings_amount;
    const response = await api.get('/chores/savings-split-preview', { params });
    return response.data as SavingsSplitPreviewDTO;
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
  updatePurpose: async (paymentId: string, purpose_note: string) => {
    const response = await api.patch(`/payments/${paymentId}/purpose`, { purpose_note });
    return response.data;
  },
};

// Withdrawals (retiros de saldo)
export const withdrawalsAPI = {
  request: async (
    child_id: string,
    amount: number,
    note?: string,
    purpose_type?: 'necesidad' | 'deseo',
    goal_impact_note?: string
  ) => {
    const response = await api.post('/withdrawals/request', {
      child_id,
      amount,
      note,
      purpose_type,
      goal_impact_note,
    });
    return response.data;
  },
  list: async (status?: string) => {
    const params = status ? { status } : {};
    const response = await api.get('/withdrawals', { params });
    return response.data;
  },
  approve: async (withdrawalId: string, parent_note?: string) => {
    const response = await api.post(`/withdrawals/${withdrawalId}/approve`, {
      parent_note: parent_note ?? null,
    });
    return response.data;
  },
  approveSmallBulk: async (max_amount: number, parent_note?: string) => {
    const response = await api.post('/withdrawals/approve-small/bulk', {
      max_amount,
      parent_note: parent_note ?? null,
    });
    return response.data as { approved_count: number; skipped_count: number; total_amount: number };
  },
  reject: async (withdrawalId: string) => {
    const response = await api.post(`/withdrawals/${withdrawalId}/reject`);
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
  create: async (
    title: string,
    description: string | undefined,
    target_tasks: number,
    bonus_amount: number,
    child_id: string,
    start_date?: string,
    end_date?: string,
    goal_period: 'semanal' | 'personalizado' = 'personalizado'
  ) => {
    const response = await api.post('/goals', {
      title,
      description,
      target_tasks,
      bonus_amount,
      child_id,
      start_date,
      end_date,
      goal_period,
    });
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

/** Metas de ahorro (dinero apartado del saldo hacia un objetivo). Distinto de /goals (metas por tareas). */
export const savingsGoalsAPI = {
  create: async (data: {
    title: string;
    note?: string;
    target_amount: number;
    child_id: string;
  }) => {
    const response = await api.post('/savings-goals', data);
    return response.data;
  },
  getAll: async (childId?: string) => {
    const params = childId ? { child_id: childId } : {};
    const response = await api.get('/savings-goals', { params });
    return response.data as SavingsGoalDTO[];
  },
  getOne: async (goalId: string) => {
    const response = await api.get(`/savings-goals/${goalId}`);
    return response.data as SavingsGoalDTO;
  },
  update: async (
    goalId: string,
    data: { title?: string; note?: string | null; target_amount?: number }
  ) => {
    const response = await api.put(`/savings-goals/${goalId}`, data);
    return response.data as SavingsGoalDTO;
  },
  delete: async (goalId: string) => {
    const response = await api.delete(`/savings-goals/${goalId}`);
    return response.data as { ok: boolean; returned_to_balance: number };
  },
  allocate: async (goalId: string, amount: number) => {
    const response = await api.post(`/savings-goals/${goalId}/allocate`, { amount });
    return response.data as SavingsGoalDTO;
  },
  release: async (goalId: string, amount: number) => {
    const response = await api.post(`/savings-goals/${goalId}/release`, { amount });
    return response.data as SavingsGoalDTO;
  },
};

export type SavingsGoalDTO = {
  id: string;
  title: string;
  note?: string | null;
  target_amount: number;
  saved_amount: number;
  child_id: string;
  family_id?: string;
  is_completed: boolean;
  milestones_reached?: number[];
  last_milestone_reached?: number | null;
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
  deleteAll: async () => {
    const response = await api.delete('/notifications');
    return response.data as { deleted_count: number };
  },
  deleteMany: async (ids: string[]) => {
    const response = await api.delete('/notifications/bulk', { data: { ids } });
    return response.data as { deleted_count: number };
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
