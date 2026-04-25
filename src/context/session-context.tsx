import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  getCsrf,
  login,
  loginWithGoogle,
  logout,
  me,
  refresh,
  register,
  type AuthUser,
} from "../service/api/auth";

type SessionStatus = "loading" | "authenticated" | "guest";

type SessionContextType = {
  status: SessionStatus;
  user: AuthUser | null;
  refreshSession: () => Promise<void>;
  clearSession: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: (code: string, redirectUri?: string) => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  getCsrf: () => Promise<void>;
};

const SessionContext = createContext<SessionContextType | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  const applyAuthenticated = useCallback((nextUser: AuthUser) => {
    setUser(nextUser);
    setStatus("authenticated");
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setStatus("guest");
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const currentUser = await me();
      if (currentUser) {
        applyAuthenticated(currentUser);
        return;
      }

      const refreshed = await refresh();
      if (refreshed?.user) {
        applyAuthenticated(refreshed.user);
        return;
      }

      clearSession();
    } catch {
      clearSession();
    }
  }, [applyAuthenticated, clearSession]);

  const loginAction = useCallback(async (email: string, password: string) => {
    const response = await login(email, password);
    applyAuthenticated(response.user);
  }, [applyAuthenticated]);

  const registerAction = useCallback(async (name: string, email: string, password: string) => {
    const response = await register(name, email, password);
    applyAuthenticated(response.user);
  }, [applyAuthenticated]);

  const googleAction = useCallback(async (code: string, redirectUri?: string) => {
    const response = await loginWithGoogle(code, redirectUri);
    applyAuthenticated(response.user);
  }, [applyAuthenticated]);

  const refreshAction = useCallback(async () => {
    const response = await refresh();
    if (response?.user) {
      applyAuthenticated(response.user);
      return;
    }

    clearSession();
  }, [applyAuthenticated, clearSession]);

  const logoutAction = useCallback(async () => {
    try {
      await logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const csrfAction = useCallback(async () => {
    await getCsrf();
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const value = useMemo(
    () => ({
      status,
      user,
      refreshSession,
      clearSession,
      login: loginAction,
      register: registerAction,
      loginWithGoogle: googleAction,
      refresh: refreshAction,
      logout: logoutAction,
      getCsrf: csrfAction,
    }),
    [status, user, refreshSession, clearSession, loginAction, registerAction, googleAction, refreshAction, logoutAction, csrfAction],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
