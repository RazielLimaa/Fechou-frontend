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

type SessionStatus = "loading" | "authenticated" | "unauthenticated";

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

  const clearSession = useCallback(() => {
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const data = await me();
      setUser(data);
      setStatus("authenticated");
    } catch {
      clearSession();
    }
  }, [clearSession]);

  const loginAction = useCallback(async (email: string, password: string) => {
    await login(email, password);
    await refreshSession();
  }, [refreshSession]);

  const registerAction = useCallback(async (name: string, email: string, password: string) => {
    await register(name, email, password);
    await refreshSession();
  }, [refreshSession]);

  const googleAction = useCallback(async (code: string, redirectUri?: string) => {
    await loginWithGoogle(code, redirectUri);
    await refreshSession();
  }, [refreshSession]);

  const refreshAction = useCallback(async () => {
    await refresh();
    await refreshSession();
  }, [refreshSession]);

  const logoutAction = useCallback(async () => {
    await logout();
    clearSession();
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
