import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { me, type AuthUser } from "../service/api/auth";
import { authStorage } from "../lib/auth-storage";

type SessionStatus = "loading" | "authenticated" | "unauthenticated";

type SessionContextType = {
  status: SessionStatus;
  user: AuthUser | null;
  refreshSession: () => Promise<void>;
  clearSession: () => void;
};

const SessionContext = createContext<SessionContextType | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  const clearSession = useCallback(() => {
    authStorage.clearAll();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const data = await me();
      authStorage.setUserRaw(JSON.stringify(data));
      setUser(data);
      setStatus("authenticated");
    } catch {
      clearSession();
    }
  }, [clearSession]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const value = useMemo(
    () => ({ status, user, refreshSession, clearSession }),
    [status, user, refreshSession, clearSession]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
