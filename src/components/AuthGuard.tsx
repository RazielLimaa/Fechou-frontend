import { useLocation } from "wouter";
import { useEffect, useState, type ReactNode } from "react";

interface AuthGuardProps {
  children: ReactNode;
}

/**
 * Basic token format validation.
 * Ensures the token is a non-empty string without injection characters.
 */
function isValidTokenFormat(token: string): boolean {
  const trimmed = token.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.length > 4096) return false; // JWT tokens should not exceed this
  // Reject tokens with HTML/script characters (potential XSS)
  if (/<|>|javascript:|on\w+=/i.test(trimmed)) return false;
  return true;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [, navigate] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token || !isValidTokenFormat(token)) {
      // Clear any potentially corrupt data
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      sessionStorage.removeItem("_csrf_token");
      navigate("/login");
      return;
    }

    // Check if user data is valid JSON
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        JSON.parse(userStr);
      } catch {
        // Corrupt user data — clear and redirect
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        sessionStorage.removeItem("_csrf_token");
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
