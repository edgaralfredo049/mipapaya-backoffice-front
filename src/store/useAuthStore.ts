import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Permission {
  id:        string;
  name:      string;
  can_write: boolean;
}

export interface AuthUser {
  id:    number;
  email: string;
  name:  string;
  role:  string;
}

interface AuthState {
  token:       string | null;
  user:        AuthUser | null;
  permissions: Permission[];

  isAuthenticated: boolean;

  login:  (token: string, user: AuthUser, permissions: Permission[]) => void;
  logout: () => void;
  hasPermission: (id: string, write?: boolean) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token:       null,
      user:        null,
      permissions: [],
      isAuthenticated: false,

      login: (token, user, permissions) =>
        set({ token, user, permissions, isAuthenticated: true }),

      logout: () =>
        set({ token: null, user: null, permissions: [], isAuthenticated: false }),

      hasPermission: (id: string, write = false): boolean => {
        const perm = get().permissions.find((p) => p.id === id);
        if (!perm) return false;
        if (write) return perm.can_write;
        return true;
      },
    }),
    {
      name:    "mipapaya_auth",
      partialize: (s) => ({
        token:       s.token,
        user:        s.user,
        permissions: s.permissions,
        isAuthenticated: s.isAuthenticated,
      }),
    }
  )
);
