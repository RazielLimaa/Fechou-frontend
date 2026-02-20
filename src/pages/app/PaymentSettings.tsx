import { useMemo, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { mercadoPagoService, isPixConfigured } from "../../services/mercadoPago";
import type {
  MercadoPagoStatusResponse,
  VerifyApiKeyResponse,
  PixKeyResponse,
} from "../../services/mercadoPago";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Shield,
  Loader2,
  Save,
  RefreshCw,
  Key,
  Link2,
  Copy,
  Trash2,
  Smartphone,
  Mail,
  CreditCard,
  Hash,
} from "lucide-react";

/**
 * =========================
 * PIX (manual) - API
 * =========================
 * Backend esperado:
 *  GET    /api/user/pix-key
 *  POST   /api/user/pix-key { pixKey, pixKeyType }
 *  DELETE /api/user/pix-key
 */
type PixKeyType = "cpf" | "cnpj" | "email" | "phone" | "random";

const PIX_KEY_TYPES: {
  value: PixKeyType;
  label: string;
  icon: any;
  placeholder: string;
  mask?: (v: string) => string;
}[] = [
  {
    value: "cpf",
    label: "CPF",
    icon: CreditCard,
    placeholder: "000.000.000-00",
    mask: (v: string) => {
      const digits = v.replace(/\D/g, "").slice(0, 11);
      return digits
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    },
  },
  {
    value: "cnpj",
    label: "CNPJ",
    icon: CreditCard,
    placeholder: "00.000.000/0001-00",
    mask: (v: string) => {
      const digits = v.replace(/\D/g, "").slice(0, 14);
      return digits
        .replace(/(\d{2})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1/$2")
        .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
    },
  },
  { value: "email", label: "E-mail", icon: Mail, placeholder: "seu@email.com" },
  {
    value: "phone",
    label: "Telefone",
    icon: Smartphone,
    placeholder: "+55 (00) 00000-0000",
    mask: (v: string) => {
      const digits = v.replace(/\D/g, "").slice(0, 13);
      if (digits.length <= 2) return `+${digits}`;
      if (digits.length <= 4) return `+${digits.slice(0, 2)} (${digits.slice(2)}`;
      if (digits.length <= 9)
        return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4)}`;
      return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(
        4,
        9
      )}-${digits.slice(9)}`;
    },
  },
  {
    value: "random",
    label: "Chave Aleatória",
    icon: Hash,
    placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  },
];

function getTypeConfig(type: PixKeyType) {
  return PIX_KEY_TYPES.find((t) => t.value === type) || PIX_KEY_TYPES[0];
}

function getTypeLabel(type: string | null | undefined): string {
  if (!type) return "Desconhecido";
  const found = PIX_KEY_TYPES.find((t) => t.value === type);
  return found ? found.label : type;
}

function maskPixKey(key: string, type: string | null | undefined): string {
  if (!key) return "---";
  if (type === "email") {
    const [user, domain] = key.split("@");
    if (!domain) return key;
    return `${user.slice(0, 3)}***@${domain}`;
  }
  if (type === "cpf") {
    const digits = key.replace(/\D/g, "");
    if (digits.length === 11) return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
  }
  if (type === "cnpj") {
    const digits = key.replace(/\D/g, "");
    if (digits.length === 14) return `**.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(
      8,
      12
    )}-**`;
  }
  if (type === "phone") {
    const digits = key.replace(/\D/g, "");
    if (digits.length >= 10) return `+** (**) *****-${digits.slice(-4)}`;
  }
  if (key.length > 12) return `${key.slice(0, 8)}...${key.slice(-4)}`;
  return key;
}

function validatePixKey(key: string, type: PixKeyType): string | null {
  const trimmed = key.trim();
  if (!trimmed) return "Informe sua chave PIX.";

  switch (type) {
    case "cpf": {
      const digits = trimmed.replace(/\D/g, "");
      if (digits.length !== 11) return "CPF deve ter 11 dígitos.";
      break;
    }
    case "cnpj": {
      const digits = trimmed.replace(/\D/g, "");
      if (digits.length !== 14) return "CNPJ deve ter 14 dígitos.";
      break;
    }
    case "email": {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "E-mail inválido.";
      break;
    }
    case "phone": {
      const digits = trimmed.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 13)
        return "Telefone inválido. Use o formato +55 (XX) XXXXX-XXXX.";
      break;
    }
    case "random": {
      if (trimmed.length < 10) return "Chave aleatória muito curta.";
      break;
    }
  }
  return null;
}

/**
 * =========================
 * Mercado Pago - UI helpers
 * =========================
 */
function maskToken(token: string) {
  const t = token.trim();
  if (t.length <= 10) return t;
  return `${t.slice(0, 6)}...${t.slice(-4)}`;
}

export const PaymentSettingsPage = () => {
  const queryClient = useQueryClient();

  /**
   * =========================
   * PIX state + queries
   * =========================
   */
  const [pixKeyInput, setPixKeyInput] = useState("");
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>("cpf");
  const [isEditingPix, setIsEditingPix] = useState(false);

  const {
    data: pixData,
    isLoading: pixLoading,
    error: pixError,
    refetch: refetchPix,
  } = useQuery<PixKeyResponse>({
    queryKey: ["pix-key"],
    queryFn: mercadoPagoService.getPixKey, // ✅ evita "No queryFn"
  });

  const hasPixKey = isPixConfigured(pixData);

  const savePixMutation = useMutation({
    mutationFn: ({ key, type }: { key: string; type: string }) => mercadoPagoService.savePixKey(key, type),
    onSuccess: (savedPix) => {
      queryClient.setQueryData(["pix-key"], savedPix);
      queryClient.invalidateQueries({ queryKey: ["pix-key"] });
      setPixKeyInput("");
      setIsEditingPix(false);
      toast.success("Chave PIX cadastrada com sucesso!");
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Erro ao salvar chave PIX.");
    },
  });

  const deletePixMutation = useMutation({
    mutationFn: () => mercadoPagoService.deletePixKey(),
    onSuccess: () => {
      queryClient.setQueryData(["pix-key"], { pixKey: null, pixKeyType: null });
      queryClient.invalidateQueries({ queryKey: ["pix-key"] });
      setIsEditingPix(false);
      toast.success("Chave PIX removida.");
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Erro ao remover chave PIX.");
    },
  });

  const handlePixSave = () => {
    const trimmed = pixKeyInput.trim();
    const validationError = validatePixKey(trimmed, pixKeyType);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    savePixMutation.mutate({ key: trimmed, type: pixKeyType });
  };

  const handlePixCopy = () => {
    if (pixData?.pixKey) {
      navigator.clipboard.writeText(pixData.pixKey);
      toast.success("Chave PIX copiada!");
    }
  };

  const handlePixInputChange = (value: string) => {
    const config = getTypeConfig(pixKeyType);
    setPixKeyInput(config.mask ? config.mask(value) : value);
  };

  const typeConfig = getTypeConfig(pixKeyType);
  const TypeIcon = typeConfig.icon;

  /**
   * =========================
   * Mercado Pago state + queries
   * =========================
   */
  const [accessTokenInput, setAccessTokenInput] = useState("");
  const [isEditingApiKey, setIsEditingApiKey] = useState(false);

  const {
    data: status,
    isLoading: isStatusLoading,
    error: statusError,
    refetch: refetchStatus,
  } = useQuery<MercadoPagoStatusResponse>({
    queryKey: ["mp-status"],
    queryFn: mercadoPagoService.getStatus,
  });

  const connected = !!status?.connected;

  const authMethodLabel = useMemo(() => {
    if (!status?.authMethod) return "—";
    return status.authMethod === "oauth" ? "OAuth" : "API Key";
  }, [status?.authMethod]);

  const verifyMutation = useMutation({
    mutationFn: (token: string) => mercadoPagoService.verifyApiKey(token),
    onSuccess: (data: VerifyApiKeyResponse) => {
      toast.success(
        `Chave válida! MP User: ${data.mpUserId}${data.nickname ? ` (${data.nickname})` : ""}`
      );
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Chave inválida.");
    },
  });

  const registerMutation = useMutation({
    mutationFn: (token: string) => mercadoPagoService.registerApiKey(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mp-status"] });
      setIsEditingApiKey(false);
      setAccessTokenInput("");
      toast.success("Mercado Pago conectado via API Key!");
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Não foi possível cadastrar a chave.");
    },
  });

  const handleVerify = () => {
    const t = accessTokenInput.trim();
    if (t.length < 20) {
      toast.error("Informe uma access token válida (TEST-... ou APP_USR-...).");
      return;
    }
    verifyMutation.mutate(t);
  };

  const handleRegister = () => {
    const t = accessTokenInput.trim();
    if (t.length < 20) {
      toast.error("Informe uma access token válida (TEST-... ou APP_USR-...).");
      return;
    }
    registerMutation.mutate(t);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="noise-overlay" />

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 bg-background/20 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <Link href="/" className="font-display text-2xl font-bold tracking-tight group">
            FECHOU
            <span className="text-accent group-hover:italic transition-all">!</span>
          </Link>

          <div className="flex items-center gap-8">
            <span className="text-[10px] uppercase tracking-[0.3em] text-foreground">Pagamentos</span>
            <Link
              href="/propostas"
              className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-accent transition-colors relative group"
            >
              Propostas
              <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-accent group-hover:w-full transition-all duration-300" />
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
            {/* Back link */}
            <div className="mb-4">
              <Link
                href="/propostas"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para propostas
              </Link>
            </div>

            {/* Header */}
            <div className="mb-12">
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">
                Configurações
              </p>
              <h1 className="font-display text-5xl md:text-7xl font-bold tracking-[-0.04em] leading-[0.9]">
                Pagamentos<span className="text-accent">.</span>
              </h1>
              <p className="mt-4 text-muted-foreground max-w-lg leading-relaxed">
                Configure como você vai receber: <b>PIX manual</b> (copiar chave) ou <b>Mercado Pago</b> (checkout automático).
              </p>
            </div>

            {/* =========================
                PIX CARD
               ========================= */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mb-8"
            >
              <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl">
                <CardHeader className="border-b border-white/5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-display text-xl flex items-center gap-3">
                      <Key className="w-5 h-5 text-accent" />
                      Chave PIX (manual)
                    </CardTitle>

                    {pixLoading ? (
                      <Badge variant="outline" className="bg-white/5 border-white/10 text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        Carregando...
                      </Badge>
                    ) : !hasPixKey ? (
                      <Badge variant="outline" className="bg-red-500/10 border-red-500/30 text-red-400">
                        <XCircle className="w-3 h-3 mr-1" />
                        Não cadastrada
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-400">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Cadastrada
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-6">
                  {pixError ? (
                    <div className="space-y-3">
                      <p className="text-sm text-red-400">
                        Erro ao carregar sua chave PIX. Verifique se o backend tem a rota <span className="font-mono">/api/user/pix-key</span>.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetchPix()}
                        className="border-white/10 hover:bg-white/5 rounded-xl gap-2 text-muted-foreground"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Tentar novamente
                      </Button>
                    </div>
                  ) : pixLoading ? (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Carregando...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Exibir chave cadastrada */}
                      {hasPixKey && !isEditingPix && (
                        <div className="rounded-xl border border-green-500/10 bg-green-500/5 p-5">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-foreground">Chave PIX ativa</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Usada quando você compartilhar o contrato (modo manual).
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePixCopy}
                                className="border-white/10 hover:bg-white/5 rounded-xl gap-2 text-muted-foreground"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                Copiar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deletePixMutation.mutate()}
                                disabled={deletePixMutation.isPending}
                                className="border-red-500/20 hover:bg-red-500/10 rounded-xl gap-2 text-red-400"
                              >
                                {deletePixMutation.isPending ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                                Remover
                              </Button>
                            </div>
                          </div>

                          <div className="mt-4 space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Tipo</span>
                              <span className="font-mono text-xs bg-accent/10 text-accent px-3 py-1 rounded-full">
                                {getTypeLabel(pixData?.pixKeyType)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Chave</span>
                              <span className="font-mono text-xs bg-white/5 text-foreground px-3 py-1 rounded-full">
                                {maskPixKey(pixData?.pixKey ?? "", pixData?.pixKeyType)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* CTA se não tem chave */}
                      {!hasPixKey && !isEditingPix && (
                        <div className="space-y-3">
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Cadastre sua chave PIX para o cliente pagar manualmente (sem checkout automático).
                          </p>
                          <Button
                            onClick={() => setIsEditingPix(true)}
                            className="bg-accent text-white hover:bg-accent/90 rounded-xl gap-2"
                          >
                            <Key className="w-4 h-4" />
                            Cadastrar chave PIX
                          </Button>
                        </div>
                      )}

                      {/* Form PIX */}
                      {isEditingPix && (
                        <div className="space-y-5">
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                              Tipo da chave
                            </label>
                            <Select
                              value={pixKeyType}
                              onValueChange={(v) => {
                                setPixKeyType(v as PixKeyType);
                                setPixKeyInput("");
                              }}
                            >
                              <SelectTrigger className="bg-white/5 border-white/10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PIX_KEY_TYPES.map((t) => (
                                  <SelectItem key={t.value} value={t.value}>
                                    <span className="flex items-center gap-2">
                                      <t.icon className="w-4 h-4" />
                                      {t.label}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                              Sua chave PIX
                            </label>
                            <div className="relative">
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                <TypeIcon className="w-4 h-4" />
                              </div>
                              <Input
                                value={pixKeyInput}
                                onChange={(e) => handlePixInputChange(e.target.value)}
                                type={pixKeyType === "email" ? "email" : "text"}
                                placeholder={typeConfig.placeholder}
                                className="bg-white/5 border-white/10 pl-10 font-mono text-sm"
                                autoComplete="off"
                              />
                            </div>
                          </div>

                          <div className="flex gap-3 flex-wrap pt-1">
                            <Button
                              onClick={handlePixSave}
                              disabled={savePixMutation.isPending || !pixKeyInput.trim()}
                              className="bg-accent text-white hover:bg-accent/90 rounded-xl gap-2"
                            >
                              {savePixMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                              {savePixMutation.isPending ? "Salvando..." : "Salvar chave PIX"}
                            </Button>

                            <Button
                              variant="outline"
                              onClick={() => {
                                setIsEditingPix(false);
                                setPixKeyInput("");
                              }}
                              className="border-white/10 hover:bg-white/5 rounded-xl"
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      )}

                      {!isEditingPix && (
                        <p className="text-xs text-muted-foreground/70">
                          * PIX manual: o cliente paga no app do banco e você confirma pelo comprovante (ou depois você integra um provedor).
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* =========================
                MERCADO PAGO CARD
               ========================= */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="mb-8"
            >
              <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl">
                <CardHeader className="border-b border-white/5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-display text-xl flex items-center gap-3">
                      <Shield className="w-5 h-5 text-accent" />
                      Mercado Pago (checkout automático)
                    </CardTitle>

                    {isStatusLoading ? (
                      <Badge variant="outline" className="bg-white/5 border-white/10 text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        Verificando...
                      </Badge>
                    ) : !connected ? (
                      <Badge variant="outline" className="bg-red-500/10 border-red-500/30 text-red-400">
                        <XCircle className="w-3 h-3 mr-1" />
                        Desconectado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-400">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Conectado
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-6">
                  {statusError ? (
                    <p className="text-sm text-red-400">Erro ao carregar status do Mercado Pago.</p>
                  ) : isStatusLoading ? (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Carregando...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Método</span>
                          <span className="font-mono text-xs bg-accent/10 text-accent px-3 py-1 rounded-full">
                            {authMethodLabel}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">MP User ID</span>
                          <span className="font-mono text-xs bg-white/5 text-foreground px-3 py-1 rounded-full">
                            {status?.mpUserId ?? "—"}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Expira em</span>
                          <span className="font-mono text-xs bg-white/5 text-foreground px-3 py-1 rounded-full">
                            {status?.expiresAt ? new Date(status.expiresAt).toLocaleString() : "—"}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-3 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => refetchStatus()}
                          className="border-white/10 hover:bg-white/5 rounded-xl gap-2 text-muted-foreground"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Atualizar status
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => mercadoPagoService.connectOAuth()}
                          className="bg-accent text-white hover:bg-accent/90 rounded-xl gap-2"
                        >
                          <Link2 className="w-4 h-4" />
                          Conectar via OAuth
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingApiKey((v) => !v)}
                          className="border-white/10 hover:bg-white/5 rounded-xl gap-2 text-muted-foreground"
                        >
                          <Key className="w-4 h-4" />
                          {isEditingApiKey ? "Fechar API Key" : "Usar API Key"}
                        </Button>
                      </div>

                      {isEditingApiKey && (
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
                          <p className="text-sm text-muted-foreground">
                            Cole sua <b>Access Token</b> do MP (TEST-... ou APP_USR-...). Isso habilita checkout automático nos links.
                          </p>

                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                              Access Token
                            </label>
                            <Input
                              value={accessTokenInput}
                              onChange={(e) => setAccessTokenInput(e.target.value)}
                              placeholder="TEST-... ou APP_USR-..."
                              className="bg-white/5 border-white/10 font-mono text-sm"
                              autoComplete="off"
                            />
                            <p className="text-[10px] text-muted-foreground/60">
                              Atual: <span className="font-mono">{maskToken(accessTokenInput || "")}</span>
                            </p>
                          </div>

                          <div className="flex gap-3 flex-wrap">
                            <Button
                              variant="outline"
                              onClick={handleVerify}
                              disabled={verifyMutation.isPending || accessTokenInput.trim().length < 20}
                              className="border-white/10 hover:bg-white/5 rounded-xl gap-2 text-muted-foreground"
                            >
                              {verifyMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Shield className="w-4 h-4" />
                              )}
                              Verificar
                            </Button>

                            <Button
                              onClick={handleRegister}
                              disabled={registerMutation.isPending || accessTokenInput.trim().length < 20}
                              className="bg-accent text-white hover:bg-accent/90 rounded-xl gap-2"
                            >
                              {registerMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                              Salvar
                            </Button>

                            <Button
                              variant="outline"
                              onClick={() => {
                                setIsEditingApiKey(false);
                                setAccessTokenInput("");
                              }}
                              className="border-white/10 hover:bg-white/5 rounded-xl"
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground/70">
                        * Checkout automático: o cliente paga pelo link e o sistema pode confirmar via webhook.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default PaymentSettingsPage;