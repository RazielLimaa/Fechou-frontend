import { useState } from "react";
import { Link, useParams } from "wouter";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { proposalsService } from "../../services/proposals";
import { mercadoPagoService } from "../../services/mercadoPago";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import { getSafeRedirectUrl } from "../../lib/security";
import {
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  Link2,
  CreditCard,
  Loader2,
  FileText,
  Calendar,
  DollarSign,
  AlertTriangle,
  Settings,
  Lock,
} from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

function CopyLinkField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex gap-2 mt-3">
      <div className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-mono text-muted-foreground truncate">
        {value}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="border-white/10 hover:bg-white/5 rounded-xl px-3"
      >
        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
      </Button>
    </div>
  );
}

export default function ProposalDetails() {
  const { id } = useParams<{ id: string }>();

  const {
    data: proposal,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["proposal", id],
    queryFn: () => proposalsService.getById(id!),
    enabled: !!id,
  });

  const { data: mpStatus } = useQuery({
    queryKey: ["mp-status"],
    queryFn: mercadoPagoService.getStatus,
  });

  const { data: pixData } = useQuery({
    queryKey: ["pix-key"],
    queryFn: mercadoPagoService.getPixKey,
  });

  const queryClient = useQueryClient();

  // Simplified logic: Allow if Pix is present.
  const isPaymentConfigured = !!(pixData?.pixKey);

  const shareMutation = useMutation({
    mutationFn: () => proposalsService.generateShareLink(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposal", id] });
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao gerar link do contrato."),
  });

  const paymentMutation = useMutation({
    mutationFn: () => proposalsService.generatePaymentLink(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposal", id] });
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao gerar link de pagamento."),
  });

  const safePaymentUrl = paymentMutation.data?.paymentUrl
    ? getSafeRedirectUrl(paymentMutation.data.paymentUrl)
    : null;

  const handleShareClick = () => {
    if (!isPaymentConfigured) {
      toast.error("Configure sua chave PIX nas configurações de pagamento antes de gerar links.", {
        action: {
          label: "Configurar",
          onClick: () => { window.location.href = "/app/settings/payments"; },
        },
      });
      return;
    }
    shareMutation.mutate();
  };

  const handlePaymentClick = () => {
    if (!isPaymentConfigured) {
      toast.error("Configure sua chave PIX nas configurações de pagamento antes de gerar links.", {
        action: {
          label: "Configurar",
          onClick: () => { window.location.href = "/app/settings/payments"; },
        },
      });
      return;
    }
    paymentMutation.mutate();
  };

  const statusConfig: Record<string, { label: string; className: string }> = {
    pending: { label: "Pendente", className: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400" },
    signed: { label: "Assinada", className: "bg-blue-500/10 border-blue-500/30 text-blue-400" },
    paid: { label: "Paga", className: "bg-green-500/10 border-green-500/30 text-green-400" },
    cancelled: { label: "Cancelada", className: "bg-red-500/10 border-red-500/30 text-red-400" },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <span className="text-sm">Carregando proposta...</span>
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center">
          <FileText className="w-12 h-12 text-red-400/50 mx-auto mb-4" />
          <p className="text-lg text-foreground mb-2">Proposta nao encontrada</p>
          <p className="text-sm text-muted-foreground mb-6">
            A proposta pode ter sido removida ou voce nao tem permissao.
          </p>
          <Link href="/app/proposals">
            <Button variant="outline" className="border-white/10 hover:bg-white/5 rounded-xl">
              Voltar para propostas
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const cfg = statusConfig[proposal.status] || statusConfig.pending;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="noise-overlay" />

      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 bg-background/20 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <Link href="/" className="font-display text-2xl font-bold tracking-tight group">
            FECHOU<span className="text-accent group-hover:italic transition-all">!</span>
          </Link>
          <div className="flex items-center gap-8">
            <Link
              href="/app/proposals"
              className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-accent transition-colors"
            >
              Propostas
            </Link>
            <Link
              href="/app/settings/payments"
              className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-accent transition-colors"
            >
              Pagamentos
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-[900px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mb-4">
              <Link
                href="/app/proposals"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para propostas
              </Link>
            </div>

            <div className="mb-12 flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">
                  Proposta
                </p>
                <h1 className="font-display text-4xl md:text-6xl font-bold tracking-[-0.04em] text-reveal leading-[0.9]">
                  {proposal.title}
                  <span className="text-accent">.</span>
                </h1>
              </div>
              <Badge variant="outline" className={`${cfg.className} mt-6`}>
                {cfg.label}
              </Badge>
            </div>

            {/* Warning banner when not configured */}
            {!isPaymentConfigured && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
              >
                <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 flex items-start gap-4">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-200">
                      Chave PIX nao configurada
                    </p>
                    <p className="text-xs text-yellow-300/70 mt-1">
                      Cadastre sua chave PIX para habilitar
                      a geracao de links de contrato e recebimento direto.
                    </p>
                  </div>
                  <Link href="/app/settings/payments">
                    <Button
                      size="sm"
                      className="bg-yellow-500/20 text-yellow-200 hover:bg-yellow-500/30 border border-yellow-500/30 rounded-xl gap-2 flex-shrink-0"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Configurar PIX
                    </Button>
                  </Link>
                </div>
              </motion.div>
            )}

            <div className="grid md:grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Details Card */}
              <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl">
                <CardHeader className="border-b border-white/5">
                  <CardTitle className="font-display text-lg">Detalhes</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <DollarSign className="w-4 h-4" />
                      Valor
                    </div>
                    <span className="font-display text-xl font-bold text-accent">
                      {formatCurrency(proposal.amount)}
                    </span>
                  </div>
                  <div className="w-full h-px bg-white/5" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <FileText className="w-4 h-4" />
                      Status
                    </div>
                    <span className="capitalize text-sm font-medium">{cfg.label}</span>
                  </div>
                  <div className="w-full h-px bg-white/5" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Calendar className="w-4 h-4" />
                      Criada em
                    </div>
                    <span className="text-sm">
                      {new Date(proposal.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Links Card */}
              <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl">
                <CardHeader className="border-b border-white/5">
                  <CardTitle className="font-display text-lg">Links de Acesso</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {/* Contract Link */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Link2 className="w-4 h-4 text-accent" />
                      <span className="text-sm font-medium">Link do Contrato Publico</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Compartilhe com seu cliente para assinatura e pagamento via PIX.
                    </p>
                    <Button
                      onClick={handleShareClick}
                      className={
                        isPaymentConfigured
                          ? "w-full bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 rounded-xl gap-2"
                          : "w-full bg-white/5 text-muted-foreground border border-white/10 rounded-xl gap-2"
                      }
                      disabled={shareMutation.isPending}
                    >
                      {shareMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : !isPaymentConfigured ? (
                        <Lock className="w-4 h-4" />
                      ) : (
                        <Link2 className="w-4 h-4" />
                      )}
                      {isPaymentConfigured ? "Gerar Link do Contrato" : "Configure o PIX primeiro"}
                    </Button>
                    {shareMutation.data && <CopyLinkField value={shareMutation.data.shareLink} />}
                  </div>

                  <div className="w-full h-px bg-white/5" />

                  {/* Payment Link */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard className="w-4 h-4 text-green-400" />
                      <span className="text-sm font-medium">Link de Pagamento Direto</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Link direto para pagamento via PIX (Mercado Pago).
                    </p>
                    <Button
                      onClick={handlePaymentClick}
                      variant="outline"
                      className={
                        isPaymentConfigured
                          ? "w-full border-white/10 hover:bg-white/5 rounded-xl gap-2"
                          : "w-full bg-white/5 text-muted-foreground border border-white/10 rounded-xl gap-2"
                      }
                      disabled={paymentMutation.isPending}
                    >
                      {paymentMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : !isPaymentConfigured ? (
                        <Lock className="w-4 h-4" />
                      ) : (
                        <CreditCard className="w-4 h-4" />
                      )}
                      {isPaymentConfigured ? "Gerar Link de Pagamento" : "Configure o PIX primeiro"}
                    </Button>
                    {paymentMutation.data && (
                      <div className="mt-3 space-y-2">
                        <CopyLinkField value={paymentMutation.data.paymentUrl} />
                        {safePaymentUrl ? (
                          <a
                            href={safePaymentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Abrir em nova aba
                          </a>
                        ) : (
                          <p className="text-xs text-destructive">Link de pagamento inválido.</p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
