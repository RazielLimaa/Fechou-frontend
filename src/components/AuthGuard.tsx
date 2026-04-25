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
    if (status === "guest") {
      navigate("/login");
    }
  }, [navigate, status]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#080808] text-white flex items-center justify-center px-6">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#FF6600]" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/35">
            Carregando
          </p>
        </div>
      </div>
    );
  }

  if (status !== "authenticated") return null;

  return <>{children}</>;
}
