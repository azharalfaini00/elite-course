import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export interface AdminUserSession {
  email: string;
  name?: string;
  role?: string;
}

interface AuthContextValue {
  user: AdminUserSession | null;
  authReady: boolean;
  isAuthorizedAdmin: boolean;
  adminCheckError: string | null;
  checkingAdmin: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshAdminSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = 'elite_admin_token';
const USER_KEY = 'elite_admin_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUserSession | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAuthorizedAdmin, setIsAuthorizedAdmin] = useState(false);
  const [adminCheckError, setAdminCheckError] = useState<string | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(false);

  const verifyServerAdminSession = useCallback(async (token: string | null): Promise<boolean> => {
    if (!token) {
      setUser(null);
      setIsAuthorizedAdmin(false);
      setAdminCheckError(null);
      return false;
    }
    setCheckingAdmin(true);
    setAdminCheckError(null);
    try {
      const res = await fetch('/api/admin/session', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { authorized?: boolean; user?: AdminUserSession; error?: string };
      if (res.ok && data.authorized && data.user) {
        setUser(data.user);
        setIsAuthorizedAdmin(true);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        return true;
      }
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setUser(null);
      setIsAuthorizedAdmin(false);
      setAdminCheckError(data.error || 'Sesi admin telah kadaluarsa.');
      return false;
    } catch {
      // If offline or network error, fallback to cached user if available
      const cached = localStorage.getItem(USER_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setUser(parsed);
          setIsAuthorizedAdmin(true);
          return true;
        } catch {}
      }
      setIsAuthorizedAdmin(false);
      setAdminCheckError('Gagal memverifikasi sesi admin ke server.');
      return false;
    } finally {
      setCheckingAdmin(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    void verifyServerAdminSession(token).finally(() => {
      setAuthReady(true);
    });
  }, [verifyServerAdminSession]);

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setCheckingAdmin(true);
      setAdminCheckError(null);
      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
        });
        const data = (await res.json()) as {
          token?: string;
          admin?: AdminUserSession;
          error?: string;
        };

        if (!res.ok || !data.token || !data.admin) {
          throw new Error(data.error || 'Email atau password administrator salah.');
        }

        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.admin));
        setUser(data.admin);
        setIsAuthorizedAdmin(true);
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal memproses login.';
        setAdminCheckError(msg);
        setIsAuthorizedAdmin(false);
        throw err;
      } finally {
        setCheckingAdmin(false);
      }
    },
    []
  );

  const loginWithGoogle = useCallback(async () => {
    throw new Error('Sistem telah beralih ke mode standalone. Silakan login menggunakan email & password administrator.');
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {}
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setIsAuthorizedAdmin(false);
    setAdminCheckError(null);
  }, []);

  const refreshAdminSession = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    return verifyServerAdminSession(token);
  }, [verifyServerAdminSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
        isAuthorizedAdmin,
        adminCheckError,
        checkingAdmin,
        login,
        loginWithGoogle,
        logout,
        refreshAdminSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus digunakan di dalam AuthProvider.');
  return ctx;
}
