import { useState } from "react";
import { useRoute } from "wouter";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { proposalsService } from "../../services/proposals";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  CheckCircle,
  FileSignature,
  CreditCard,
  Loader2,
  Shield,
  User,
  Hash,
} from "lucide-react";

const signSchema = z.object({
  signerName: z
    .string()
    .min(3, "Nome deve ter pelo menos 3 caracteres"),
  signerDocument: z
    .string()
    .min(11, "Documento invalido (minimo 11 caracteres)")
    .max(18, "Documento invalido"),
});

type SignForm = z.infer<typeof signSchema>;

export default function PublicContract() {
  const [, params] = useRoute("/p/contract/:token");
  const token = params?.token;
  const queryClient = useQueryClient();

  const {
    data: proposal,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["public-proposal", token],
    queryFn: () => proposalsService.getPublic(token!),
    enabled: !!token,
  });

  const signMutation = useMutation({
    mutationFn: (data: SignForm) => proposalsService.signContract(token!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-proposal", token] });
      toast.success("Contrato assinado com sucesso!");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao assinar contrato.");
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: () =>
      proposalsService.checkout(token!, {
        successUrl: `${window.location.origin}/p/feedback?status=success`,
        failureUrl: `${window.location.origin}/p/feedback?status=failure`,
        pendingUrl: `${window.location.origin}/p/feedback?status=pending`,
      }),
    onSuccess: (data) => {
      window.location.href = data.checkoutUrl;
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao iniciar pagamento.");
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignForm>({
    resolver: zodResolver(signSchema),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <span className="text-sm">Carregando contrato...</span>
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <Shield className="w-12 h-12 text-red-400/50 mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">
            Contrato nao encontrado
          </h1>
          <p className="text-sm text-muted-foreground">
            Este link pode ter expirado ou ser invalido. Entre em contato com o freelancer que
            enviou a proposta.
          </p>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="noise-overlay" />

      {/* Minimal branding header */}
      <header className="px-6 py-6 border-b border-white/5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <span className="font-display text-xl font-bold tracking-tight">
            FECHOU<span className="text-accent">!</span>
          </span>
          <Badge
            variant="outline"
            className="text-[9px] uppercase tracking-wider border-white/10 text-muted-foreground"
          >
            Contrato publico
          </Badge>
        </div>
      </header>

      <main className="py-12 px-6">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Contract Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl">
              <CardHeader className="border-b border-white/5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="font-display text-3xl font-bold">
                      {proposal.title}
                    </CardTitle>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Proposta de {proposal.freelancerName}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      proposal.isSigned
                        ? "bg-green-500/10 border-green-500/30 text-green-400"
                        : "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                    }
                  >
                    {proposal.isSigned
                      ? proposal.isPaid
                        ? "Pago"
                        : "Assinado"
                      : "Aguardando assinatura"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div>
                  <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                    Descricao do projeto
                  </h4>
                  <p className="text-sm leading-relaxed">{proposal.description}</p>
                </div>
                <div className="flex items-end justify-between pt-4 border-t border-white/5">
                  <div>
                    <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                      Valor do investimento
                    </h4>
                    <p className="font-display text-3xl font-bold text-accent">
                      {formatCurrency(proposal.amount)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Sign or Payment Section */}
          {!proposal.isSigned ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.6 }}
            >
              <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl">
                <CardHeader className="border-b border-white/5">
                  <CardTitle className="font-display text-xl flex items-center gap-3">
                    <FileSignature className="w-5 h-5 text-accent" />
                    Assinar Contrato
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <form
                    onSubmit={handleSubmit((data) => signMutation.mutate(data))}
                    className="space-y-5"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                          <User className="w-3 h-3" />
                          Nome completo
                        </label>
                        <Input
                          {...register("signerName")}
                          placeholder="Seu nome completo"
                          className="bg-white/5 border-white/10"
                        />
                        {errors.signerName && (
                          <p className="text-red-400 text-xs">{errors.signerName.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                          <Hash className="w-3 h-3" />
                          CPF ou CNPJ
                        </label>
                        <Input
                          {...register("signerDocument")}
                          placeholder="000.000.000-00"
                          className="bg-white/5 border-white/10"
                        />
                        {errors.signerDocument && (
                          <p className="text-red-400 text-xs">{errors.signerDocument.message}</p>
                        )}
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-accent hover:bg-accent/90 text-white rounded-xl py-5 text-sm"
                      disabled={signMutation.isPending}
                    >
                      {signMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Assinando...
                        </>
                      ) : (
                        <>
                          <FileSignature className="w-4 h-4 mr-2" />
                          Assinar Digitalmente
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
              className="space-y-6"
            >
              <div className="p-8 rounded-2xl border border-green-500/30 bg-green-500/10 text-center">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <h3 className="font-display text-2xl font-bold text-green-400">
                  Contrato Assinado
                </h3>
                <p className="text-sm text-green-300/70 mt-1">
                  O contrato foi assinado com sucesso.
                </p>
              </div>

              {!proposal.isPaid ? (
                <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl">
                  <CardContent className="p-8 text-center space-y-6">
                    <div>
                      <CreditCard className="w-10 h-10 text-accent mx-auto mb-3" />
                      <h3 className="font-display text-xl font-bold">Realizar Pagamento</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Clique abaixo para prosseguir com o pagamento via Mercado Pago.
                      </p>
                    </div>
                    <Button
                      onClick={() => checkoutMutation.mutate()}
                      className="px-12 py-6 text-lg font-bold bg-accent hover:bg-accent/90 text-white rounded-full"
                      disabled={checkoutMutation.isPending}
                    >
                      {checkoutMutation.isPending ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-5 h-5 mr-2" />
                          Ir para Pagamento
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="p-6 rounded-2xl border border-accent/30 bg-accent/10 text-center">
                  <p className="text-accent font-medium">
                    Este contrato ja foi pago. Obrigado!
                  </p>
                </div>
              )}
            </motion.div>
          )}

          <p className="text-center text-[10px] text-muted-foreground/50 pt-8">
            Contrato gerado eletronicamente via Fechou! - Plataforma de Gestao para Freelancers
          </p>
        </div>
      </main>
    </div>
  );
}
