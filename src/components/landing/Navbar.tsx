import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "../../lib/utils";
import { me, type AuthUser } from "../../service/api/auth";

type AuthState =
  | { status: "guest"; user: null }
  | { status: "loading"; user: AuthUser | null }
  | { status: "authed"; user: AuthUser };

function readStoredAuth(): { token: string | null; user: AuthUser | null } {
  const token = localStorage.getItem("access_token");
  const rawUser = localStorage.getItem("user");
  if (!token || !rawUser) return { token: null, user: null };

  try {
    const user = JSON.parse(rawUser) as AuthUser;
    return { token, user };
  } catch {
    return { token, user: null };
  }
}

export default function Navbar() {
  const [, navigate] = useLocation();
  const [scrolled, setScrolled] = useState(false);

  const [{ status, user }, setAuth] = useState<AuthState>(() => {
    const { token, user } = readStoredAuth();
    return token && user ? { status: "authed", user } : { status: "guest", user: null };
  });

  // scroll effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Keep navbar in sync with localStorage (other tabs + same tab manual edits)
  useEffect(() => {
    const sync = () => {
      const { token, user } = readStoredAuth();
      if (token && user) setAuth({ status: "authed", user });
      else setAuth({ status: "guest", user: null });
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === "access_token" || e.key === "user") sync();
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // OPTIONAL: validate token on mount (avoid "fake logged" if token expired)
  useEffect(() => {
    const { token, user } = readStoredAuth();
    if (!token) return;

    // show user immediately (fast UI), then validate quietly
    setAuth({ status: "loading", user: user ?? null });

    me(token)
      .then((freshUser) => {
        localStorage.setItem("user", JSON.stringify(freshUser));
        setAuth({ status: "authed", user: freshUser });
      })
      .catch(() => {
        // token inválido => desloga
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        setAuth({ status: "guest", user: null });
      });
  }, []);

  const initials = useMemo(() => {
    if (!user?.name) return "";
    const parts = user.name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    setAuth({ status: "guest", user: null });
    navigate("/login");
  };

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 px-6 py-4 md:py-8 transition-all duration-700",
        scrolled ? "bg-background/20 backdrop-blur-2xl py-4" : "bg-transparent",
      )}
    >
      <div className="max-w-[1400px] mx-auto flex items-center justify-between">
        <Link href="/" className="font-display text-2xl font-bold tracking-tight group">
          FECHOU<span className="text-accent group-hover:italic transition-all">!</span>
        </Link>

        <div className="flex items-center gap-6 md:gap-12">
          <div className="hidden md:flex items-center gap-10">
            <Link
              href="/vision"
              className="text-[10px] uppercase tracking-[0.3em] font-medium text-muted-foreground hover:text-accent transition-colors duration-300 relative group"
            >
              Vision
              <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-accent group-hover:w-full transition-all duration-300" />
            </Link>

            <Link
              href="/system"
              className="text-[10px] uppercase tracking-[0.3em] font-medium text-muted-foreground hover:text-accent transition-colors duration-300 relative group"
            >
              fechado?!
              <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-accent group-hover:w-full transition-all duration-300" />
            </Link>

            {status === "guest" ? (
              <Link
                href="/login"
                className="text-[10px] uppercase tracking-[0.3em] font-medium text-muted-foreground hover:text-accent transition-colors duration-300 relative group"
              >
                Entrar
                <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-accent group-hover:w-full transition-all duration-300" />
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[10px] font-bold">
                    {initials || "U"}
                  </div>
                  <div className="leading-tight">
                    <div className="text-[11px] font-medium">
                      {user?.name ?? "Conta"}
                      <span className="ml-2 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                        {status === "loading" ? "..." : "Logado"}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">{user?.email}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-[10px] uppercase tracking-[0.3em] font-medium text-muted-foreground hover:text-accent transition-colors duration-300"
                  title="Sair"
                >
                  Sair
                </button>
              </div>
            )}
          </div>

          {status === "guest" ? (
            <Link href="/register">
              <button className="px-6 py-2 rounded-full border border-white/10 text-[10px] uppercase tracking-[0.2em] hover:bg-accent hover:border-accent hover:text-white hover:shadow-[0_0_30px_rgba(255,102,0,0.4)] transition-all duration-500">
                Comecar
              </button>
            </Link>
          ) : (
            <Link href="/propostas">
              <button className="px-6 py-2 rounded-full border border-white/10 text-[10px] uppercase tracking-[0.2em] hover:bg-accent hover:border-accent hover:text-white hover:shadow-[0_0_30px_rgba(255,102,0,0.4)] transition-all duration-500">
                Dashboard
              </button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
