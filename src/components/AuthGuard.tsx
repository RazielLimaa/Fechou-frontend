import { useLocation } from "wouter";
import { useEffect, useState, type ReactNode } from "react";
import { authStorage } from "../lib/auth-storage";

interface AuthGuardProps {
  children: ReactNode;
}

function isValidTokenFormat(token: string): boolean {
  const trimmed = token.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.length > 4096) return false;
  if (/<|>|javascript:|on\w+=/i.test(trimmed)) return false;
  return true;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [, navigate] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const token = authStorage.getAccessToken();

    if (!token || !isValidTokenFormat(token)) {
      authStorage.clearAll();
      navigate("/login");
      return;
    }

    const userStr = authStorage.getUserRaw();
    if (userStr) {
      try {
        JSON.parse(userStr);
      } catch {
        authStorage.clearAll();
        navigate("/login");
        return;
      }
    }

    setIsAuthenticated(true);
  }, [navigate]);

  if (isAuthenticated === null) {
    return null;
  }

  return <>{children}</>;
}
