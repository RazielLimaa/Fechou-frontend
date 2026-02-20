import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import Navbar from "../components/landing/Navbar";
import Footer from "../components/landing/Footer";
import { Check, X, ArrowRight, Crown, Briefcase, User } from "lucide-react";
import { useLocation } from "wouter";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "0",
    period: "para sempre",
    description: "Para quem quer conhecer o Fechou! sem compromisso.",
    icon: User,
    highlight: false,
    features: [
      { text: "Perfil basico com pagina publica", included: true },
      { text: "1 proposta ativa por mes", included: true },
      { text: "Template padrao de proposta", included: true },
      { text: "Link publico para envio", included: true },
      { text: "Aceite digital com registro", included: true },
      { text: "Painel basico com historico limitado", included: true },
      { text: "Marca Fechou! nas propostas", included: true },
      { text: "Personalizacao visual", included: false },
      { text: "Cobranca integrada", included: false },
      { text: "Suporte prioritario", included: false },
    ],
    cta: "Comecar Gratis",
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "29",
    period: "/mes",
    description: "Para freelancers que querem fechar mais contratos.",
    icon: Briefcase,
    highlight: true,
    features: [
      { text: "Tudo do plano Free", included: true },
      { text: "Propostas ilimitadas", included: true },
      { text: "Templates avancados", included: true },
      { text: "Personalizacao com sua marca", included: true },
      { text: "Historico completo de clientes", included: true },
      { text: "Organizacao por status", included: true },
      { text: "Remocao parcial da marca", included: true },
      { text: "Painel completo", included: true },
      { text: "Suporte padrao", included: true },
      { text: "Cobranca integrada", included: false },
    ],
    cta: "Assinar Pro",
    popular: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: "59",
    period: "/mes",
    description: "Para quem quer fechar e receber no mesmo fluxo.",
    icon: Crown,
    highlight: false,
    features: [
      { text: "Tudo do plano Pro", included: true },
      { text: "Pagamentos via Pix e cartao", included: true },
      { text: "Links de pagamento nas propostas", included: true },
      { text: "Status de pagamento automatico", included: true },
      { text: "Notificacoes para clientes", included: true },
      { text: "Remocao total da marca", included: true },
      { text: "Suporte prioritario", included: true },
      { text: "Maior destaque no perfil", included: true },
      { text: "Acesso antecipado a novidades", included: true },
      { text: "Taxas operacionais reduzidas", included: true },
    ],
    cta: "Assinar Premium",
    popular: false,
  },
];

const testimonials = [
  {
    quote: "Antes eu perdia horas organizando propostas no WhatsApp. Agora fecho em minutos.",
    author: "Marina S.",
    role: "Designer Freelancer",
  },
  {
    quote: "Meus clientes passaram a me levar mais a serio quando viram minhas propostas profissionais.",
    author: "Carlos R.",
    role: "Desenvolvedor Web",
  },
  {
    quote: "O plano Premium se paga sozinho. Recebi 3x mais rapido depois da integracao de pagamentos.",
    author: "Julia M.",
    role: "Social Media Manager",
  },
];

function isLoggedIn() {
  const token = localStorage.getItem("access_token");
  return Boolean(token && token.trim().length > 0);
}

export default function System() {
  const [, navigate] = useLocation();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const yearlyDiscount = 0.2;

  const getPrice = useMemo(() => {
    return (price: string) => {
      const numPrice = parseInt(price, 10);
      if (billingCycle === "yearly" && numPrice > 0) {
        return Math.round(numPrice * (1 - yearlyDiscount));
      }
      return numPrice;
    };
  }, [billingCycle]);

  const goToPlan = (planId: string) => {
    const logged = isLoggedIn();

    // ✅ FREE: fluxo diferente (não tem stripe)
    if (planId === "free") {
      if (logged) {
        navigate("/propostas"); // ou "/dashboard"
        return;
      }
      localStorage.setItem("selected_plan_id", "free");
      localStorage.setItem("after_auth_redirect", "/propostas");
      navigate("/register");
      return;
    }

    // ✅ PRO / PREMIUM
    if (logged) {
      navigate(`/checkout/plano/${encodeURIComponent(planId)}`);
      return;
    }

    // não logado: salva intenção e manda pro register
    localStorage.setItem("selected_plan_id", planId);
    localStorage.setItem("after_auth_redirect", `/checkout/plano/${encodeURIComponent(planId)}`);
    navigate("/register");
  };

  return (
    <div className="bg-background min-h-screen text-foreground selection:bg-accent selection:text-white overflow-hidden">
      <div className="noise-overlay" />
      <Navbar />

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-[1400px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-block px-6 py-2 rounded-full border border-accent/30 text-accent text-xs uppercase tracking-[0.3em] bg-accent/5 backdrop-blur-sm mb-8"
            >
              Planos e Precos
            </motion.span>

            <h1 className="font-display text-[12vw] md:text-[8rem] leading-[0.9] tracking-[-0.04em] mb-6">
              <span className="text-reveal">fechado</span>
              <span className="text-accent italic">?!</span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-light mb-12">
              Escolha o plano que combina com o seu momento.<br />
              <span className="text-foreground">Sem surpresas. Sem letras miudas.</span>
            </p>

            <div className="flex items-center justify-center gap-4 mb-16">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 ${
                  billingCycle === "monthly"
                    ? "bg-accent text-white"
                    : "bg-white/5 text-muted-foreground hover:bg-white/10"
                }`}
              >
                Mensal
              </button>

              <button
                onClick={() => setBillingCycle("yearly")}
                className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  billingCycle === "yearly"
                    ? "bg-accent text-white"
                    : "bg-white/5 text-muted-foreground hover:bg-white/10"
                }`}
              >
                Anual
                <span className="text-xs px-2 py-0.5 bg-white/20 rounded-full">-20%</span>
              </button>
            </div>
          </motion.div>

          {/* PLANS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-40">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
                whileHover={{ y: -10 }}
                className={`relative group ${plan.popular ? "lg:-mt-8 lg:mb-8" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <span className="px-4 py-1.5 bg-accent text-white text-xs uppercase tracking-widest rounded-full font-medium">
                      Mais Popular
                    </span>
                  </div>
                )}

                <div
                  className={`h-full p-10 rounded-[2.5rem] border transition-all duration-500 backdrop-blur-xl ${
                    plan.popular
                      ? "border-accent/50 bg-gradient-to-b from-accent/10 to-transparent shadow-[0_0_80px_rgba(255,102,0,0.15)]"
                      : "border-white/5 bg-white/[0.02] group-hover:border-accent/30"
                  }`}
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                        plan.popular ? "bg-accent/20" : "bg-white/5 group-hover:bg-accent/10"
                      }`}
                    >
                      <plan.icon
                        className={`w-7 h-7 ${
                          plan.popular ? "text-accent" : "text-muted-foreground group-hover:text-accent"
                        } transition-colors`}
                      />
                    </div>

                    <div>
                      <h3 className="font-display text-2xl">{plan.name}</h3>
                      <p className="text-muted-foreground text-sm">{plan.description}</p>
                    </div>
                  </div>

                  <div className="mb-8">
                    <div className="flex items-baseline gap-1">
                      <span className="text-muted-foreground text-lg">R$</span>
                      <span className="font-display text-6xl tracking-tight">{getPrice(plan.price)}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>

                    {billingCycle === "yearly" && parseInt(plan.price, 10) > 0 && (
                      <p className="text-accent text-sm mt-2">
                        Economia de R${Math.round(parseInt(plan.price, 10) * 12 * yearlyDiscount)}/ano
                      </p>
                    )}
                  </div>

                  <div className="space-y-4 mb-10">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        {feature.included ? (
                          <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="w-3 h-3 text-accent" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <X className="w-3 h-3 text-muted-foreground/50" />
                          </div>
                        )}

                        <span className={feature.included ? "text-foreground/90" : "text-muted-foreground/50"}>
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* ✅ CTA */}
                  <motion.button
                    type="button"
                    onClick={() => goToPlan(plan.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full py-4 rounded-2xl font-medium transition-all duration-300 flex items-center justify-center gap-2 group/btn ${
                      plan.popular
                        ? "bg-accent text-white hover:shadow-[0_0_40px_rgba(255,102,0,0.4)]"
                        : "bg-white/5 text-foreground hover:bg-accent hover:text-white"
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* TESTIMONIALS */}
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-40">
            <h2 className="font-display text-4xl md:text-5xl text-center mb-16">
              Quem usa, <span className="text-accent">recomenda.</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -5, borderColor: "rgba(255, 102, 0, 0.3)" }}
                  className="p-8 rounded-[2rem] border border-white/5 bg-white/[0.02] backdrop-blur-xl transition-all duration-500 cursor-default"
                >
                  <p className="text-lg text-foreground/90 leading-relaxed mb-6 italic">"{t.quote}"</p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                      <span className="text-accent font-display text-lg">{t.author[0]}</span>
                    </div>
                    <div>
                      <p className="font-medium">{t.author}</p>
                      <p className="text-sm text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* CTA FINAL */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative py-32 px-12 rounded-[4rem] border border-white/10 bg-gradient-to-b from-accent/5 to-transparent backdrop-blur-xl text-center overflow-hidden"
          >
            <div className="blur-blob bg-accent/15 top-0 left-1/2 -translate-x-1/2 w-full h-full" />

            <div className="relative z-10">
              <h2 className="font-display text-4xl md:text-6xl mb-6">
                Pronto para fechar<span className="text-accent">?</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                Comece gratis. Sem cartao. Sem pegadinhas. Quando estiver pronto, faca o upgrade.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.button
                  type="button"
                  onClick={() => goToPlan("free")}
                  whileHover={{ scale: 1.05, boxShadow: "0 0 60px rgba(255, 102, 0, 0.5)" }}
                  whileTap={{ scale: 0.95 }}
                  className="px-12 py-5 rounded-full bg-accent text-white font-display text-xl tracking-wide"
                >
                  Criar Conta Gratis
                </motion.button>

                <motion.button
                  type="button"
                  onClick={() => navigate("/login")}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-12 py-5 rounded-full border border-white/20 text-foreground font-display text-xl tracking-wide hover:bg-white/5 transition-colors"
                >
                  Ja tenho conta
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
