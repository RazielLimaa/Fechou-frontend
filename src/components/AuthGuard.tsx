import { useLocation } from "wouter";
import { useEffect, type ReactNode } from "react";
import { useSession } from "../context/session-context";

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [, navigate] = useLocation();
  const { status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      navigate("/login");
    }
  }, [navigate, status]);

  if (status === "loading") {
    return null;
  }

  if (status !== "authenticated") return null;

  return <>{children}</>;
}
