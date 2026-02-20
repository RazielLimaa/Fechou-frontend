import { Link } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { CheckCircle, XCircle, Clock, ArrowLeft } from "lucide-react";

function getStatusFromUrl(): "success" | "failure" | "pending" {
  const params = new URLSearchParams(window.location.search);
  const status = params.get("status");
  if (status === "success" || status === "failure" || status === "pending") return status;
  return "pending";
}

const feedbackConfig = {
  success: {
    icon: CheckCircle,
    iconColor: "text-green-400",
    title: "Pagamento Confirmado!",
    message:
      "Sua transacao foi processada com sucesso. O freelancer foi notificado e em breve dara continuidade ao projeto.",
    bgClass: "bg-green-500/10 border-green-500/30",
    textClass: "text-green-300",
  },
  failure: {
    icon: XCircle,
    iconColor: "text-red-400",
    title: "Pagamento nao realizado",
    message:
      "Nao foi possivel processar seu pagamento. Verifique os dados e tente novamente, ou entre em contato com o freelancer.",
    bgClass: "bg-red-500/10 border-red-500/30",
    textClass: "text-red-300",
  },
  pending: {
    icon: Clock,
    iconColor: "text-yellow-400",
    title: "Pagamento em processamento",
    message:
      "Seu pagamento esta sendo analisado. Voce e o freelancer serao notificados assim que for confirmado.",
    bgClass: "bg-yellow-500/10 border-yellow-500/30",
    textClass: "text-yellow-300",
  },
} as const;

export default function PaymentFeedback() {
  const status = getStatusFromUrl();
  const config = feedbackConfig[status];
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <div className="noise-overlay" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-8">
          <span className="font-display text-xl font-bold tracking-tight">
            FECHOU<span className="text-accent">!</span>
          </span>
        </div>

        <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl">
          <CardContent className="p-10 text-center space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
            >
              <Icon className={`w-16 h-16 ${config.iconColor} mx-auto`} />
            </motion.div>

            <div>
              <h1 className="font-display text-2xl font-bold">{config.title}</h1>
              <p
                className={`text-sm mt-3 leading-relaxed ${config.textClass} opacity-80`}
              >
                {config.message}
              </p>
            </div>

            <div
              className={`p-4 rounded-xl border ${config.bgClass} text-sm ${config.textClass}`}
            >
              {status === "success"
                ? "Transacao aprovada"
                : status === "failure"
                  ? "Tente novamente ou use outro metodo de pagamento"
                  : "Aguardando confirmacao da operadora"}
            </div>

            <Link href="/">
              <Button
                variant="outline"
                className="border-white/10 hover:bg-white/5 rounded-xl gap-2 mt-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para o site
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
