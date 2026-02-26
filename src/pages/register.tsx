import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, ArrowRight, Mail, Lock, User, Check } from "lucide-react";
import { register } from "../service/api/auth";
import { rateLimiter, isValidEmail, sanitizeInput, isStrongPassword } from "../lib/security";

export default function Register() {
  const [, navigate] = useLocation();

  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordStrength = useMemo(() => {
    if (password.length === 0) return 0;
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength; // 0..4
  }, [password]);

  const strengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500"];
  const strengthLabels = ["Fraca", "Regular", "Boa", "Forte"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Input validation
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedName.length < 2) {
      setError("Nome deve ter pelo menos 2 caracteres.");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setError("Formato de email invalido.");
      return;
    }

    const passwordCheck = isStrongPassword(password);
    if (!passwordCheck.valid) {
      setError(passwordCheck.message);
      return;
    }

    // Rate limiting: max 3 register attempts per 5 minutes
    if (!rateLimiter.check("register", 3, 5 * 60 * 1000)) {
      const retryMs = rateLimiter.getRetryAfter("register", 5 * 60 * 1000);
      setError(`Muitas tentativas. Tente novamente em ${Math.ceil(retryMs / 1000)} segundos.`);
      return;
    }

    setIsLoading(true);

    try {
      const sanitizedName = sanitizeInput(trimmedName);
      const sanitizedEmail = sanitizeInput(trimmedEmail);
      const result = await register(sanitizedName, sanitizedEmail, password);

      localStorage.setItem("access_token", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));

      navigate("/propostas");
    } catch (err: any) {
      setError(err?.message ?? "Falha ao criar conta.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background min-h-screen text-foreground selection:bg-accent selection:text-white overflow-hidden flex">
      <div className="noise-overlay" />

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
            <h2 className="font-display text-3xl md:text-4xl mb-3">Criar conta</h2>
            <p className="text-muted-foreground">
              Ja tem uma conta?{" "}
              <Link href="/login">
                <span className="text-accent hover:underline cursor-pointer">Entrar</span>
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
              <label className="text-sm text-muted-foreground">Nome completo</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition-all"
                  required
                />
              </div>
            </div>

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
              <label className="text-sm text-muted-foreground">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Crie uma senha forte"
                  className="w-full pl-12 pr-12 py-4 rounded-2xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition-all"
                  required
                  minLength={6} // bate com backend
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

              {password.length > 0 && (
                <div className="space-y-2 mt-3">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all ${
                          i < passwordStrength ? strengthColors[Math.max(0, passwordStrength - 1)] : "bg-white/10"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Forca:{" "}
                    <span className={passwordStrength > 0 ? "text-foreground" : ""}>
                      {passwordStrength > 0 ? strengthLabels[passwordStrength - 1] : "Digite uma senha"}
                    </span>
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <p className="text-sm text-muted-foreground">Sua senha deve conter:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className={`flex items-center gap-2 ${password.length >= 8 ? "text-green-500" : "text-muted-foreground"}`}>
                  <Check className="w-4 h-4" />
                  8+ caracteres
                </div>
                <div className={`flex items-center gap-2 ${/[A-Z]/.test(password) ? "text-green-500" : "text-muted-foreground"}`}>
                  <Check className="w-4 h-4" />
                  Letra maiuscula
                </div>
                <div className={`flex items-center gap-2 ${/[0-9]/.test(password) ? "text-green-500" : "text-muted-foreground"}`}>
                  <Check className="w-4 h-4" />
                  Um numero
                </div>
                <div className={`flex items-center gap-2 ${/[^A-Za-z0-9]/.test(password) ? "text-green-500" : "text-muted-foreground"}`}>
                  <Check className="w-4 h-4" />
                  Caractere especial
                </div>
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
                  Criar minha conta
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </form>

          <div className="mt-10">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <span className="relative bg-background px-4 text-sm text-muted-foreground">
                ou cadastre-se com
              </span>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
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
            Ao criar sua conta, voce concorda com nossos{" "}
            <span className="text-accent hover:underline cursor-pointer">Termos</span> e{" "}
            <span className="text-accent hover:underline cursor-pointer">Privacidade</span>
          </p>
        </motion.div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12">
        <div className="blur-blob bg-accent/20 top-1/4 right-1/4 w-[600px] h-[600px]" />
        <div className="blur-blob bg-white/5 bottom-1/4 left-1/4 w-[400px] h-[400px]" />

        <motion.div
          initial={{ opacity: 0, x: 50 }}
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
            Comece sua
            <br />
            <span className="text-accent">jornada.</span>
          </h1>

          <p className="text-xl text-muted-foreground leading-relaxed mb-12">
            Junte-se a milhares de freelancers que ja transformaram sua forma de fechar negocios.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-medium">Propostas profissionais</p>
                <p className="text-sm text-muted-foreground">Impressione seus clientes desde o primeiro contato</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-medium">Aceite digital</p>
                <p className="text-sm text-muted-foreground">Confirme acordos com seguranca e registro</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-medium">Pagamentos integrados</p>
                <p className="text-sm text-muted-foreground">Receba via Pix ou cartao direto na plataforma</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>

  );
}
