import { useMemo, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { mercadoPagoService, isPixConfigured } from "../../services/mercadoPago";
import { runWithStepUp } from "../../service/step-up";
import { toUiErrorMessage } from "../../lib/api-error";
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
  Copy,
  Trash2,
  Smartphone,
  Mail,
  CreditCard,
  Hash,
  AlertTriangle
} from "lucide-react";

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

export default function PaymentSettingsPage() {
  const queryClient = useQueryClient();

  const [pixKeyInput, setPixKeyInput] = useState("");
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>("cpf");
  const [isEditingPix, setIsEditingPix] = useState(false);

  const {
    data: pixData,
    isLoading: pixLoading,
  } = useQuery<PixKeyResponse>({
    queryKey: ["pix-key"],
    queryFn: mercadoPagoService.getPixKey,
  });

  const hasPixKey = isPixConfigured(pixData);

  const savePixMutation = useMutation({
    mutationFn: ({ key, type }: { key: string; type: string }) =>
      runWithStepUp("user.pix.update", { keyType: type }, (stepUpToken) => mercadoPagoService.savePixKey(key, type, stepUpToken)),
    onSuccess: (savedPix) => {
      queryClient.setQueryData(["pix-key"], savedPix);
      queryClient.invalidateQueries({ queryKey: ["pix-key"] });
      setPixKeyInput("");
      setIsEditingPix(false);
      toast.success("Chave PIX cadastrada com sucesso!");
    },
    onError: (err: unknown) => {
      toast.error(toUiErrorMessage(err));
    },
  });

  const deletePixMutation = useMutation({
    mutationFn: () => runWithStepUp("user.pix.delete", undefined, (stepUpToken) => mercadoPagoService.deletePixKey(stepUpToken)),
    onSuccess: () => {
      queryClient.setQueryData(["pix-key"], { pixKey: null, pixKeyType: null });
      queryClient.invalidateQueries({ queryKey: ["pix-key"] });
      setIsEditingPix(false);
      toast.success("Chave PIX removida.");
    },
    onError: (err: unknown) => {
      toast.error(toUiErrorMessage(err));
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

            <div className="mb-12">
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">
                Configurações
              </p>
              <h1 className="font-display text-5xl md:text-7xl font-bold tracking-[-0.04em] leading-[0.9]">
                Pagamentos<span className="text-accent">.</span>
              </h1>
              <p className="mt-4 text-muted-foreground max-w-lg leading-relaxed">
                Configure sua <b>chave PIX</b> para receber de seus clientes de forma direta e manual.
              </p>
            </div>

            <div className="grid gap-8">
              {/* PIX Settings Card */}
              <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="font-display text-2xl font-bold">Chave PIX</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        A chave que seus clientes usarão para pagar.
                      </p>
                    </div>
                    {hasPixKey ? (
                      <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 gap-1.5 rounded-full py-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Configurada
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 gap-1.5 rounded-full py-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Pendente
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {pixLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Carregando...</span>
                    </div>
                  ) : hasPixKey && !isEditingPix ? (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                            <TypeIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{getTypeLabel(pixData?.pixKeyType)}</p>
                            <p className="text-sm text-muted-foreground font-mono">
                              {maskPixKey(pixData?.pixKey || "", pixData?.pixKeyType)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={handlePixCopy} className="text-muted-foreground hover:text-foreground">
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setIsEditingPix(true)} className="text-accent hover:text-accent hover:bg-accent/10">
                            Editar
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deletePixMutation.mutate()} className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
                            {deletePixMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Tipo de Chave</label>
                          <Select
                            value={pixKeyType}
                            onValueChange={(val: PixKeyType) => {
                              setPixKeyType(val);
                              setPixKeyInput("");
                            }}
                          >
                            <SelectTrigger className="bg-white/5 border-white/10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PIX_KEY_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>
                                  <div className="flex items-center gap-2">
                                    <t.icon className="w-4 h-4 text-muted-foreground" />
                                    {t.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Chave PIX</label>
                          <Input
                            placeholder={typeConfig.placeholder}
                            value={pixKeyInput}
                            onChange={(e) => handlePixInputChange(e.target.value)}
                            className="bg-white/5 border-white/10 font-mono"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        {isEditingPix && hasPixKey && (
                          <Button variant="ghost" onClick={() => setIsEditingPix(false)} className="text-muted-foreground hover:text-foreground">
                            Cancelar
                          </Button>
                        )}
                        <Button onClick={handlePixSave} disabled={savePixMutation.isPending} className="bg-accent text-white hover:bg-accent/90 gap-2">
                          {savePixMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Salvar Chave
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* System Status Card */}
              <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="font-display text-2xl font-bold flex items-center gap-2">
                    <Shield className="w-5 h-5 text-accent" />
                    Status do Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5">
                    <div>
                      <p className="font-medium">Pagamentos Ativos</p>
                      <p className="text-sm text-muted-foreground">Sistema configurado para receber transferências PIX diretas.</p>
                    </div>
                    <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 gap-1.5 rounded-full py-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Operacional
                    </Badge>
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
