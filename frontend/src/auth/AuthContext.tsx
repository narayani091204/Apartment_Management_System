import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { api, setAuthFailureHandler } from '@/lib/api';
import { tokenStore } from '@/lib/tokenStore';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import type { AuthResponse, MeResponse, Role, User } from '@/types/api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  apartmentNumber?: string;
  block?: string;
}

export interface AuthContextValue {
  user: User | null;
  role: Role | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    tokenStore.clear();
    disconnectSocket();
    setUser(null);
  }, []);

  // When a token refresh fails inside the axios interceptor, force a logout.
  useEffect(() => {
    setAuthFailureHandler(() => setUser(null));
  }, []);

  // On first load, if we have a token, hydrate the session from /auth/me.
  useEffect(() => {
    let active = true;
    async function hydrate() {
      if (!tokenStore.getAccess()) {
        setIsLoading(false);
        return;
      }
      try {
        const { data } = await api.get<MeResponse>('/auth/me');
        if (active) {
          setUser(data.user);
          connectSocket();
        }
      } catch {
        if (active) logout();
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void hydrate();
    return () => {
      active = false;
    };
  }, [logout]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const { data } = await api.post<AuthResponse>('/auth/login', credentials);
    tokenStore.set(data.accessToken, data.refreshToken);
    setUser(data.user);
    connectSocket();
    return data.user;
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const { data } = await api.post<AuthResponse>('/auth/register', payload);
    tokenStore.set(data.accessToken, data.refreshToken);
    setUser(data.user);
    connectSocket();
    return data.user;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role ?? null,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
    }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
