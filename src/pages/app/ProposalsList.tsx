import { Link } from "wouter";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { proposalsService } from "../../services/proposals";
import { mercadoPagoService, isPixConfigured } from "../../services/mercadoPago";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import { toAppAbsoluteUrl } from "../../lib/public-url";
import {
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  AlertTriangle,
  Settings,
} from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

function toContractSigningPath(shareLink: string) {
  const trimmed = shareLink.trim();
  if (!trimmed) return trimmed;

  const token = trimmed.match(/([a-f0-9]{64})/i)?.[1];
  if (!token) return trimmed;

  return toAppAbsoluteUrl(`/c/${token.toLowerCase()}`);
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Pendente",
    className: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
  },
  signed: {
    label: "Assinada",
    className: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  },
  paid: {
    label: "Paga",
    className: "bg-green-500/10 border-green-500/30 text-green-400",
  },
  cancelled: {
    label: "Cancelada",
    className: "bg-red-500/10 border-red-500/30 text-red-400",
  },
};

export default function ProposalsList() {
  const {
    data: proposals,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["proposals"],
    queryFn: proposalsService.list,
  });

  const { data: pixData } = useQuery({
    queryKey: ["pix-key"],
    queryFn: mercadoPagoService.getPixKey,
  });

  const isPaymentConfigured = isPixConfigured(pixData);

  const shareMutation = useMutation({
    mutationFn: (id: string) => proposalsService.generateShareLink(id),
    onSuccess: (data) => {
      navigator.clipboard.writeText(toContractSigningPath(data.shareLink));
      toast.success("Link do contrato copiado!");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao gerar link.");
    },
  });

  const handleShareClick = (proposalId: string) => {
    if (!isPaymentConfigured) {
      toast.error("Cadastre sua chave PIX antes de compartilhar links de contrato.", {
        description: "Os pagamentos dos seus clientes serao enviados diretamente para sua chave PIX cadastrada.",
        action: {
          label: "Cadastrar PIX",
          onClick: () => { window.location.href = "/app/settings/payments"; },
        },
        duration: 6000,
      });
      return;
    }
    shareMutation.mutate(proposalId);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="noise-overlay" />

      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 bg-background/20 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <Link href="/" className="font-display text-2xl font-bold tracking-tight group">
            FECHOU<span className="text-accent group-hover:italic transition-all">!</span>
          </Link>
          <div className="flex items-center gap-8">
            <span className="text-[10px] uppercase tracking-[0.3em] text-foreground">
              Propostas
            </span>
            <Link
              href="/app/settings/payments"
              className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-accent transition-colors relative group"
            >
              Pagamentos
              <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-accent group-hover:w-full transition-all duration-300" />
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-[1000px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mb-12">
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">
                Dashboard
              </p>
              <h1 className="font-display text-5xl md:text-7xl font-bold tracking-[-0.04em] text-reveal leading-[0.9]">
                Propostas<span className="text-accent">.</span>
              </h1>
            </div>

            {/* Warning banner when API key not configured */}
            {!isPaymentConfigured && pixData !== undefined && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
              >
                <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 flex items-start gap-4">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-200">
                      Chave PIX nao cadastrada
                    </p>
                    <p className="text-xs text-yellow-300/70 mt-1">
                      Voce precisa cadastrar sua chave PIX para poder copiar
                      os links de contrato. Os pagamentos dos seus clientes serao enviados diretamente para sua chave PIX.
                    </p>
                  </div>
                  <Link href="/app/settings/payments">
                    <Button
                      size="sm"
                      className="bg-yellow-500/20 text-yellow-200 hover:bg-yellow-500/30 border border-yellow-500/30 rounded-xl gap-2 flex-shrink-0"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Configurar
                    </Button>
                  </Link>
                </div>
              </motion.div>
            )}

            {error && (
              <div className="mb-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                Erro ao carregar propostas. Verifique sua conexao e tente novamente.
              </div>
            )}

            {isLoading ? (
              <div className="py-20 flex flex-col items-center gap-4 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <span className="text-sm">Carregando propostas...</span>
              </div>
            ) : proposals?.length === 0 ? (
              <div className="py-20 text-center">
                <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-lg text-muted-foreground">Nenhuma proposta encontrada.</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  Crie sua primeira proposta para comecar.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {proposals?.map((proposal, index) => {
                  const cfg = statusConfig[proposal.status] || statusConfig.pending;
                  return (
                    <motion.div
                      key={proposal.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl hover:bg-white/[0.04] transition-colors">
                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-display text-lg font-bold truncate">
                                  {proposal.title}
                                </h3>
                                <Badge variant="outline" className={cfg.className}>
                                  {cfg.label}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="font-display text-lg font-bold text-accent">
                                  {formatCurrency(proposal.amount)}
                                </span>
                                <span className="text-xs">
                                  {new Date(proposal.createdAt).toLocaleDateString("pt-BR")}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Link href={`/app/proposals/${proposal.id}`}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-white/10 hover:bg-white/5 rounded-xl gap-2"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  Ver
                                </Button>
                              </Link>
                              <Button
                                size="sm"
                                className={
                                  isPaymentConfigured
                                    ? "bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 rounded-xl gap-2"
                                    : "bg-white/5 text-muted-foreground border border-white/10 rounded-xl gap-2 cursor-not-allowed opacity-60"
                                }
                                onClick={() => handleShareClick(proposal.id)}
                                disabled={shareMutation.isPending}
                              >
                                {shareMutation.isPending ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Link2 className="w-3.5 h-3.5" />
                                )}
                                Link contrato
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
