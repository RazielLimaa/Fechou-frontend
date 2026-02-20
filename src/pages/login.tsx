import { motion } from "framer-motion";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, ArrowRight, Mail, Lock } from "lucide-react";
import { login } from "../service/api/auth";
import { rateLimiter, isValidEmail, sanitizeInput, preventClickjacking } from "../lib/security";

export default function Login() {
  const [, navigate] = useLocation();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prevent clickjacking on mount
  useState(() => { preventClickjacking(); });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Input validation
    const trimmedEmail = email.trim().toLowerCase();
    if (!isValidEmail(trimmedEmail)) {
      setError("Formato de email invalido.");
      return;
    }

    if (password.length < 1) {
      setError("Insira sua senha.");
      return;
    }

    // Rate limiting: max 5 login attempts per 2 minutes
    if (!rateLimiter.check("login", 5, 2 * 60 * 1000)) {
      const retryMs = rateLimiter.getRetryAfter("login", 2 * 60 * 1000);
      setError(`Muitas tentativas de login. Tente novamente em ${Math.ceil(retryMs / 1000)} segundos.`);
      return;
    }

    setIsLoading(true);

    try {
      const sanitizedEmail = sanitizeInput(trimmedEmail);
      const result = await login(sanitizedEmail, password);

      localStorage.setItem("access_token", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));

      navigate("/propostas");
    } catch (err: any) {
      setError(err?.message ?? "Falha ao entrar.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background min-h-screen text-foreground selection:bg-accent selection:text-white overflow-hidden flex">
      <div className="noise-overlay" />

      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12">
        <div className="blur-blob bg-accent/20 top-1/4 left-1/4 w-[600px] h-[600px]" />
        <div className="blur-blob bg-white/5 bottom-1/4 right-1/4 w-[400px] h-[400px]" />

        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-lg"
        >
          <Link href="/">
            <span className="font-display text-4xl font-bold tracking-tight cursor-pointer">
              FECHOU<span className="text-accent">!</span>
            </span>
          </Link>

          <h1 className="font-display text-5xl md:text-6xl mt-12 mb-6 leading-tight">
            Bom te ver
            <br />
            <span className="text-accent">de volta.</span>
          </h1>

          <p className="text-xl text-muted-foreground leading-relaxed">
            Continue de onde parou. Seus projetos, propostas e clientes estao te esperando.
          </p>

          <div className="mt-16 p-8 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-xl">
            <p className="text-muted-foreground italic mb-4">
              "O Fechou! mudou completamente minha forma de trabalhar. Agora fecho projetos com muito mais confianca."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                <span className="text-accent font-display">R</span>
              </div>
              <div>
                <p className="font-medium text-sm">Rafael Costa</p>
                <p className="text-xs text-muted-foreground">UX Designer</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden mb-12">
            <Link href="/">
              <span className="font-display text-3xl font-bold tracking-tight cursor-pointer">
                FECHOU<span className="text-accent">!</span>
              </span>
            </Link>
          </div>

          <div className="mb-10">
            <h2 className="font-display text-3xl md:text-4xl mb-3">Entrar</h2>
            <p className="text-muted-foreground">
              Nao tem uma conta?{" "}
              <Link href="/register">
                <span className="text-accent hover:underline cursor-pointer">Criar agora</span>
              </Link>
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">Senha</label>
                <Link href="/forgot-password">
                  <span className="text-sm text-accent hover:underline cursor-pointer">Esqueceu?</span>
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  className="w-full pl-12 pr-12 py-4 rounded-2xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 rounded-2xl bg-accent text-white font-medium flex items-center justify-center gap-2 hover:shadow-[0_0_40px_rgba(255,102,0,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Entrar
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </form>

          {/* resto do seu layout permanece igual */}
          <div className="mt-10">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <span className="relative bg-background px-4 text-sm text-muted-foreground">
                ou continue com
              </span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <motion.button
                whileHover={{ scale: 1.02, borderColor: "rgba(255, 102, 0, 0.3)" }}
                whileTap={{ scale: 0.98 }}
                className="py-4 px-6 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center gap-3 hover:bg-white/10 transition-all"
                type="button"
              >
                <span className="text-sm font-medium">Google</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02, borderColor: "rgba(255, 102, 0, 0.3)" }}
                whileTap={{ scale: 0.98 }}
                className="py-4 px-6 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center gap-3 hover:bg-white/10 transition-all"
                type="button"
              >
                <span className="text-sm font-medium">GitHub</span>
              </motion.button>
            </div>
          </div>

          <p className="mt-10 text-center text-sm text-muted-foreground">
            Ao entrar, voce concorda com nossos{" "}
            <span className="text-accent hover:underline cursor-pointer">Termos</span> e{" "}
            <span className="text-accent hover:underline cursor-pointer">Privacidade</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
