import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  getCsrf,
  login,
  logout,
  me,
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
      clearSession();
    } catch {
      clearSession();
    }
  }, [applyAuthenticated, clearSession]);

  const loginAction = useCallback(async (email: string, password: string) => {
    await login(email, password);
    await refreshSession();
  }, [refreshSession]);

  const registerAction = useCallback(async (name: string, email: string, password: string) => {
    const response = await register(name, email, password);
    applyAuthenticated(response.user);
  }, [applyAuthenticated]);

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
      refresh: refreshSession,
      logout: logoutAction,
      getCsrf: csrfAction,
    }),
    [status, user, refreshSession, clearSession, loginAction, registerAction, logoutAction, csrfAction],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
