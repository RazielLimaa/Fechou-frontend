import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { copilotService, type CopilotAction, type Tone } from "../services/copilot";
import {
  Loader2, CheckCircle2, XCircle, MessageSquare,
  RefreshCw, Sparkles, Info, Lightbulb, Copy, TrendingUp, Clock, AlertTriangle,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { normalizeFechouLocale } from "../i18n/locale";

function cn(...inputs: (string | boolean | undefined | null)[]) {
  return inputs.filter(Boolean).join(" ");
}

function getErrorInfo(err: unknown): { status?: number; message: string } {
  const e: any = err;
  return {
    status: e?.status ?? e?.response?.status,
    message: e?.message ?? e?.response?.data?.message ?? "Erro desconhecido",
  };
}

const eventLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  PROPOSAL_STALE: { label: "Proposta parada", icon: <Clock className="h-3 w-3" />, color: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10" },
  VIEWED_NO_REPLY: { label: "Sem resposta", icon: <MessageSquare className="h-3 w-3" />, color: "text-blue-400 border-blue-500/30 bg-blue-500/10" },
  ASKED_DISCOUNT: { label: "Objeção de preço", icon: <AlertTriangle className="h-3 w-3" />, color: "text-orange-400 border-orange-500/30 bg-orange-500/10" },
  GHOSTED: { label: "Cliente sumiu", icon: <XCircle className="h-3 w-3" />, color: "text-rose-400 border-rose-500/30 bg-rose-500/10" },
  HIGH_TICKET: { label: "Alto valor", icon: <TrendingUp className="h-3 w-3" />, color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
};

const intentLabels: Record<string, string> = {
  FOLLOW_UP: "Follow-up",
  OBJECTION_PRICE: "Contornar objeção",
  ANCHOR_PLAN: "Ancorar plano",
  CLOSE: "Fechar",
  BREAKUP: "Ultimato gentil",
};

const angleLabels: Record<string, string> = {
  SEGURANCA: "Segurança",
  ROI: "Retorno",
  VELOCIDADE: "Velocidade",
  PROVA: "Prova social",
  SIMPLICIDADE: "Simplicidade",
  URGENCIA: "Urgência",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export function CopilotWidget() {
  const { i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const locale = normalizeFechouLocale(i18n.resolvedLanguage);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["copilot-today", locale],
    queryFn: () => copilotService.getTodayActions(locale),
    retry: 1,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const markDoneMutation = useMutation({
    mutationFn: async (proposalId: number) => {
      setPendingId(proposalId);
      return copilotService.markAsDone(proposalId);
    },
    onSuccess: () => {
      toast.success("Ação concluída!");
      queryClient.invalidateQueries({ queryKey: ["copilot-today"] });
    },
    onError: (err) => toast.error(getErrorInfo(err).message),
    onSettled: () => setPendingId(null),
  });

  const dismissMutation = useMutation({
    mutationFn: async (proposalId: number) => {
      setPendingId(proposalId);
      return copilotService.dismissAction(proposalId);
    },
    onSuccess: () => {
      toast.success("Sugestão arquivada.");
      queryClient.invalidateQueries({ queryKey: ["copilot-today"] });
    },
    onError: (err) => toast.error(getErrorInfo(err).message),
    onSettled: () => setPendingId(null),
  });

  if (isLoading) {
    return (
      <Card className="w-full border-none bg-white/[0.02] backdrop-blur-sm">
        <CardContent className="flex flex-col items-center justify-center p-16">
          <div className="relative">
            <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full animate-pulse" />
            <Loader2 className="h-10 w-10 animate-spin text-accent relative z-10" />
          </div>
          <span className="mt-6 font-display text-lg text-white/70 animate-pulse">
            Analisando suas propostas...
          </span>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    const info = getErrorInfo(error);
    return (
      <Card className="w-full border-rose-500/30 bg-rose-500/5">
        <CardContent className="p-10 text-center space-y-6">
          <div className="h-16 w-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto border border-rose-500/20">
            <XCircle className="h-8 w-8 text-rose-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-display text-white">Ops! Algo deu errado</h3>
            <p className="text-rose-200/60 max-w-md mx-auto leading-relaxed text-sm">
              {info.message.includes("<!DOCTYPE")
                ? "Erro de conexão com o servidor."
                : info.message}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-12 px-8 rounded-xl border-rose-500/30 text-rose-200 hover:bg-rose-500/10 gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? "Reconectando..." : "Tentar novamente"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const primaryAction = data?.primaryAction ?? null;
  const secondaryActions = data?.secondaryActions ?? [];
  const hasActions = Boolean(primaryAction) || secondaryActions.length > 0;

  if (!hasActions) {
    return (
      <Card className="w-full border-white/5 bg-white/[0.02] border-dashed">
        <CardContent className="p-16 text-center">
          <div className="h-20 w-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          </div>
          <h3 className="text-2xl font-display text-white mb-2">Tudo em dia!</h3>
          <p className="text-muted-foreground font-display max-w-sm mx-auto">
            {data?.totalAnalyzed === 0
              ? "Crie sua primeira proposta para o Copiloto começar a sugerir ações estratégicas."
              : "Você completou todas as sugestões do Copiloto por hoje. Excelente trabalho!"}
          </p>
          {data && data.totalAnalyzed > 0 && (
            <p className="mt-4 text-xs text-white/20">
              {data.totalAnalyzed} proposta{data.totalAnalyzed !== 1 ? "s" : ""} analisada{data.totalAnalyzed !== 1 ? "s" : ""}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-accent to-orange-600 flex items-center justify-center shadow-lg shadow-accent/20">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-3xl font-display tracking-tight text-white">Copiloto de Fechamento</h2>
          </div>
          <p className="text-muted-foreground flex items-center gap-2 mt-2">
            Ações estratégicas para acelerar suas conversões
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="cursor-help">
                  <Info className="h-4 w-4 text-white/30 hover:text-accent transition-colors" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px] bg-[#0A0A0A] border-white/10 p-4">
                  <p className="text-sm leading-relaxed">
                    Nossa inteligência analisa tempo de resposta, ticket e histórico para sugerir
                    o momento exato do próximo contato, com o script certo.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </p>
        </div>
        {data && (
          <p className="text-xs text-white/20 shrink-0">
            {data.totalAnalyzed} proposta{data.totalAnalyzed !== 1 ? "s" : ""} analisada{data.totalAnalyzed !== 1 ? "s" : ""} · {data.totalRecommended} recomendada{data.totalRecommended !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <AnimatePresence mode="popLayout">
          {primaryAction && (
            <motion.div
              key={`primary-${primaryAction.proposalId}`}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <ActionCard
                action={primaryAction}
                isPriority
                onDone={() => markDoneMutation.mutate(primaryAction.proposalId)}
                onDismiss={() => dismissMutation.mutate(primaryAction.proposalId)}
                isLoading={pendingId === primaryAction.proposalId}
              />
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {secondaryActions.map((action, idx) => (
              <motion.div
                key={`secondary-${action.proposalId}`}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <ActionCard
                  action={action}
                  onDone={() => markDoneMutation.mutate(action.proposalId)}
                  onDismiss={() => dismissMutation.mutate(action.proposalId)}
                  isLoading={pendingId === action.proposalId}
                />
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function ActionCard({
  action,
  isPriority = false,
  onDone,
  onDismiss,
  isLoading,
}: {
  action: CopilotAction;
  isPriority?: boolean;
  onDone: () => void;
  onDismiss: () => void;
  isLoading: boolean;
}) {
  const [tone, setTone] = useState<Tone>("consultivo");
  const [dialogOpen, setDialogOpen] = useState(false);

  const eventInfo = eventLabels[action.event];
  const suggestion = action.suggestion[tone];

  return (
    <Card
      className={cn(
        "border-white/5 transition-all duration-500 hover:shadow-2xl hover:shadow-accent/5 overflow-hidden group relative",
        isPriority
          ? "bg-gradient-to-br from-accent/[0.08] to-transparent border-accent/20"
          : "bg-white/[0.02]"
      )}
    >
      {isPriority && <div className="absolute top-0 left-0 w-1 h-full bg-accent" />}

      <CardContent className="p-8">
        <div className="flex flex-col gap-6">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.1em] w-fit",
                  isPriority ? "bg-accent text-white" : "bg-white/10 text-white/60"
                )}
              >
                {isPriority ? "Prioridade Máxima" : "Recomendado"}
              </div>
              {eventInfo && (
                <div
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border w-fit",
                    eventInfo.color
                  )}
                >
                  {eventInfo.icon}
                  {eventInfo.label}
                </div>
              )}
            </div>

            <div className="text-right shrink-0">
              <p className="text-xs text-white/30">Valor em jogo</p>
              <p className="text-lg font-display font-bold text-white">{formatCurrency(action.value)}</p>
            </div>
          </div>

          {/* Client + proposal */}
          <div className="space-y-1">
            <h4 className="text-xl font-display font-bold text-white tracking-tight group-hover:text-accent transition-colors">
              {action.clientName}
            </h4>
            <p className="text-white/40 text-sm">{action.proposalTitle}</p>
          </div>

          {/* Why now */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-white/30 font-black">Por que agir agora</p>
            <p className="text-white/70 text-sm leading-relaxed">{action.whyNow}</p>
            <p className="text-rose-400/60 text-xs leading-relaxed italic mt-1">{action.riskIfIgnore}</p>
          </div>

          {/* Tactic tags */}
          <div className="flex flex-wrap gap-2">
            {action.intent && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/50">
                <Lightbulb className="h-3 w-3 text-accent" />
                {intentLabels[action.intent] ?? action.intent}
              </span>
            )}
            {action.angle && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/50">
                🎯 {angleLabels[action.angle] ?? action.angle}
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/50">
              Score: {action.priorityScore}
            </span>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mt-auto">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto bg-white/5 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20 gap-3 h-12 px-8 rounded-2xl transition-all"
                >
                  <MessageSquare className="h-4 w-4 text-accent" />
                  <span className="font-bold text-sm">COMO ABORDAR</span>
                </Button>
              </DialogTrigger>

              <DialogContent className="bg-[#0A0A0A] border-white/10 sm:max-w-[560px] p-0 overflow-hidden rounded-[2rem]">
                <div className="p-8 space-y-8">
                  <DialogHeader>
                    <DialogTitle className="text-3xl font-display font-bold text-white">
                      Script de Abordagem
                    </DialogTitle>
                    <p className="text-white/40 text-sm pt-1">
                      Para <span className="text-white/70">{action.clientName}</span> — {action.proposalTitle}
                    </p>
                  </DialogHeader>

                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-widest text-white/40">
                      Tom da mensagem
                    </label>
                    <Select value={tone} onValueChange={(v: any) => setTone(v)}>
                      <SelectTrigger className="bg-white/5 border-white/10 h-14 rounded-2xl focus:ring-accent text-white font-display">
                        <SelectValue placeholder="Selecione o tom" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#121212] border-white/10 rounded-2xl">
                        <SelectItem value="curto" className="focus:bg-accent focus:text-white rounded-xl">
                          ⚡ Rápido e Objetivo
                        </SelectItem>
                        <SelectItem value="consultivo" className="focus:bg-accent focus:text-white rounded-xl">
                          🤝 Consultivo e Estratégico
                        </SelectItem>
                        <SelectItem value="direto" className="focus:bg-accent focus:text-white rounded-xl">
                          🎯 Focado em Fechamento
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Suggestion — always available, changes with tone */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={tone}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="relative p-8 bg-accent/[0.03] rounded-[2rem] border border-accent/20 space-y-6"
                    >
                      <div className="absolute top-6 right-8 text-[10px] uppercase text-accent font-black tracking-widest">
                        Script Pronto
                      </div>

                      <p className="text-white/80 leading-relaxed font-display italic pr-4">
                        "{suggestion}"
                      </p>

                      <Button
                        variant="ghost"
                        className="w-full h-12 bg-accent/10 text-accent hover:bg-accent hover:text-white rounded-xl transition-all font-bold gap-2"
                        onClick={() => {
                          navigator.clipboard.writeText(suggestion);
                          toast.success("Copiado para a área de transferência!");
                        }}
                      >
                        <Copy className="h-4 w-4" />
                        COPIAR E USAR AGORA
                      </Button>
                    </motion.div>
                  </AnimatePresence>

                  {/* Context pills */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                    <span className="text-xs text-white/30 self-center mr-1">Estratégia:</span>
                    {action.intent && (
                      <span className="px-2.5 py-1 rounded-lg bg-white/5 text-xs text-white/50">
                        {intentLabels[action.intent] ?? action.intent}
                      </span>
                    )}
                    {action.angle && (
                      <span className="px-2.5 py-1 rounded-lg bg-white/5 text-xs text-white/50">
                        {angleLabels[action.angle] ?? action.angle}
                      </span>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                onClick={onDone}
                disabled={isLoading}
                className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-400 text-white h-12 px-8 rounded-2xl transition-all font-black uppercase tracking-widest"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    CONCLUIR
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={onDismiss}
                disabled={isLoading}
                className="h-12 px-5 rounded-2xl text-white/30 hover:bg-rose-500/10 hover:text-rose-400 transition-all"
                title="Arquivar sugestão"
              >
                <XCircle className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
