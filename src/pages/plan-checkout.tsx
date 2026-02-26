import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { motion } from "framer-motion";
import { CreditCard, ShieldCheck, Lock, ArrowLeft, Crown, Briefcase } from "lucide-react";
import { Button } from "../components/ui/button";
import Navbar from "../components/landing/Navbar";
import Footer from "../components/landing/Footer";
import { useToast } from "../hooks/use-toast";
import { createSubscriptionCheckout } from "../service/payment";

const PLAN_MAP = {
  pro: {
    name: "Pro",
    price: "29",
    icon: Briefcase,
  },
  premium: {
    name: "Premium",
    price: "59",
    icon: Crown,
  },
} as const;

type PlanId = keyof typeof PLAN_MAP;

function isLoggedIn() {
  const token = localStorage.getItem("access_token");
  return Boolean(token && token.trim().length > 0);
}

export default function PlanCheckout() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [match, params] = useRoute("/checkout/plano/:planId");
  const planIdRaw = (params?.planId || "").toLowerCase();
  const planId = planIdRaw as PlanId;

  // Guard login
  useEffect(() => {
    if (!isLoggedIn()) {
      localStorage.setItem("after_login_redirect", window.location.pathname);
      navigate("/login");
    }
  }, [navigate]);

  const planInfo = useMemo(() => {
    if (!match) return null;
    if (planIdRaw !== "pro" && planIdRaw !== "premium") return null;
    return PLAN_MAP[planId];
  }, [match, planId, planIdRaw]);

  if (!match || !planInfo) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="pt-32 px-6">
          <div className="max-w-2xl mx-auto">
            <p className="text-red-400">Plano inválido: {params?.planId ?? "(vazio)"}</p>
            <Button className="mt-6" onClick={() => navigate("/system")}>
              Voltar para planos
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const PlanIcon = planInfo.icon;

  const handleSubscription = async () => {
    setLoading(true);

    try {
      // IMPORTANT: incluir session_id no retorno do Stripe
      const successUrl = `${window.location.origin}/propostas?subscription=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${window.location.origin}/system`;

      const { checkoutUrl } = await createSubscriptionCheckout(planId, {
        successUrl,
        cancelUrl,
      });

      window.location.href = checkoutUrl;
    } catch (e: any) {
      toast({
        title: "Erro no checkout",
        description: e?.message || "Não foi possível iniciar o pagamento.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent selection:text-white overflow-hidden">
      <div className="noise-overlay" />
      <Navbar />

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
            <Button variant="ghost" onClick={() => window.history.back()} className="mb-8 gap-2 hover:text-accent">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
            <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight mb-4">
              Finalizar <span className="text-accent">Assinatura.</span>
            </h1>
          </motion.div>

          <div className="grid md:grid-cols-1 md:grid-cols-2 gap-12">
            {/* Resumo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="p-8 rounded-[2.5rem] border border-white/5 bg-white/[0.02] backdrop-blur-xl space-y-6">
                <h3 className="font-display text-2xl mb-6">Resumo</h3>

                <div className="flex items-center gap-4 mb-8 p-4 rounded-2xl bg-white/5">
                  <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                    <PlanIcon className="w-6 h-6 text-accent" />
                  </div>

                  <div>
                    <p className="font-medium">Plano {planInfo.name}</p>
                    <p className="text-sm text-muted-foreground">Renovação Mensal</p>
                  </div>

                  <div className="ml-auto text-right">
                    <p className="font-display text-xl font-bold">R$ {planInfo.price}</p>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">/mês</p>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>R$ {planInfo.price},00</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total Hoje</span>
                    <span className="text-accent">R$ {planInfo.price},00</span>
                  </div>
                </div>

                <div className="mt-8 space-y-3">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                    <ShieldCheck className="w-3 h-3 text-green-500" />
                    Pagamento Seguro via Stripe
                  </div>
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                    <Lock className="w-3 h-3" />
                    Criptografia de ponta a ponta
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Pagamento */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              <div className="p-8 rounded-[2.5rem] border border-accent/20 bg-accent/5 backdrop-blur-xl relative overflow-hidden">
                <div className="blur-blob bg-accent/10 -top-1/2 -right-1/2 w-full h-full" />

                <h3 className="font-display text-2xl mb-6 relative z-10">Pagamento</h3>
                <p className="text-sm text-muted-foreground mb-8 relative z-10">
                  Você será redirecionado para o ambiente seguro do Stripe para concluir sua assinatura com cartão de
                  crédito ou Pix.
                </p>

                <Button
                  onClick={handleSubscription}
                  disabled={loading}
                  className="w-full py-8 rounded-2xl bg-accent hover:bg-accent/90 text-white font-display text-xl relative z-10 group"
                >
                  {loading ? "Redirecionando..." : `Pagar R$ ${planInfo.price},00`}
                  <CreditCard className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>

                <p className="mt-6 text-[10px] text-center text-muted-foreground relative z-10">
                  Ao continuar, você concorda com nossos termos de renovação automática. Cancele quando quiser
                  diretamente no painel.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
