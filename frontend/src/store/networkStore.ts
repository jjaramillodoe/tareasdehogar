import { create } from 'zustand';

type NetworkState = {
  isOffline: boolean;
  lastError: string | null;
  setOffline: (offline: boolean) => void;
  setLastError: (msg: string | null) => void;
};

export const useNetworkStore = create<NetworkState>((set) => ({
  isOffline: false,
  lastError: null,
  setOffline: (offline) => set({ isOffline: offline }),
  setLastError: (msg) => set({ lastError: msg }),
}));
