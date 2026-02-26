import { useState, useEffect, useMemo } from "react";
import { useRoute } from "wouter";
import { motion } from "framer-motion";
import { getPublicProposal, signProposal, type ApiProposal } from "../service/proposals";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { rateLimiter, sanitizeInput } from "../lib/security";

/**
 * ✅ Esperado do backend em getPublicProposal(token):
 * além dos campos atuais da proposal, incluir:
 * - pixKey: string | null
 * - pixKeyType: string | null
 *
 * Se você não quiser alterar ApiProposal global agora, a gente usa "any" seguro aqui.
 */
type PublicProposalWithPix = ApiProposal & {
  pixKey?: string | null;
  pixKeyType?: string | null;
};

function maskPixKey(key: string, type?: string | null): string {
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
    if (digits.length === 14) return `**.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-**`;
  }
  if (type === "phone") {
    const digits = key.replace(/\D/g, "");
    if (digits.length >= 10) return `+** (**) *****-${digits.slice(-4)}`;
  }
  if (key.length > 12) return `${key.slice(0, 8)}...${key.slice(-4)}`;
  return key;
}

function pixTypeLabel(type?: string | null) {
  if (!type) return "PIX";
  if (type === "cpf") return "CPF";
  if (type === "cnpj") return "CNPJ";
  if (type === "email") return "E-mail";
  if (type === "phone") return "Telefone";
  if (type === "random") return "Chave Aleatória";
  return "PIX";
}

export default function ContratoPublico() {
  const [, params] = useRoute("/c/:token");
  const token = params?.token;

  const [proposal, setProposal] = useState<PublicProposalWithPix | null>(null);
  const [loading, setLoading] = useState(true);

  const [signing, setSigning] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerDocument, setSignerDocument] = useState("");

  const pixKey = useMemo(() => (proposal?.pixKey ? String(proposal.pixKey).trim() : ""), [proposal?.pixKey]);
  const pixKeyType = proposal?.pixKeyType ?? null;
  const hasPixKey = pixKey.length > 0;

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    getPublicProposal(token)
      .then((p: any) => setProposal(p))
      .catch((err) => toast.error(err?.message ?? "Falha ao carregar contrato."))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const trimmedName = signerName.trim();
    const trimmedDoc = signerDocument.trim();

    if (trimmedName.length < 2) return toast.error("Nome muito curto");
    if (trimmedName.length > 200) return toast.error("Nome muito longo");
    if (trimmedDoc.length < 5) return toast.error("Documento inválido");
    if (trimmedDoc.length > 20) return toast.error("Documento inválido");

    // Rate limit: max 3 sign attempts per 5 minutes
    if (!rateLimiter.check("sign-contract", 3, 5 * 60 * 1000)) {
      toast.error("Muitas tentativas. Aguarde alguns minutos.");
      return;
    }

    setSigning(true);
    try {
      await signProposal(token, {
        signerName: sanitizeInput(trimmedName),
        signerDocument: sanitizeInput(trimmedDoc),
      });

      toast.success("Contrato assinado com sucesso!");
      const updated: any = await getPublicProposal(token);
      setProposal(updated);
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao assinar contrato.");
    } finally {
      setSigning(false);
    }
  };

  const handleCopyPix = async () => {
    if (!hasPixKey) return;

    try {
      await navigator.clipboard.writeText(pixKey);
      toast.success("Chave PIX copiada!");
    } catch (e) {
      console.error("clipboard error", e);
      toast.error("Não foi possível copiar. Copie manualmente.");
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  if (!proposal)
    return (
      <div className="flex items-center justify-center min-h-screen font-display text-2xl">
        Link inválido ou expirado.
      </div>
    );

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl">
            <CardHeader className="border-b border-white/5 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-3xl font-display font-bold">{proposal.title}</CardTitle>
                <p className="text-muted-foreground mt-1">Contratante: {proposal.clientName}</p>
              </div>

              <Badge
                variant={proposal.contract?.signed ? "default" : "outline"}
                className={
                  proposal.contract?.signed
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                }
              >
                {proposal.contract?.signed ? "Assinado" : "Aguardando Assinatura"}
              </Badge>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              <div>
                <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Descrição do Projeto</h4>
                <p className="text-sm leading-relaxed">{proposal.description}</p>
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Valor do Investimento</h4>
                  <p className="text-2xl font-display font-bold text-accent">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(proposal.value))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Assinatura */}
        {!proposal.contract?.signed ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-white/5 bg-white/[0.02]">
              <CardHeader>
                <CardTitle className="text-xl font-display">Assinar Contrato</CardTitle>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSign} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Nome Completo</label>
                      <Input
                        value={signerName}
                        onChange={(e) => setSignerName(e.target.value)}
                        placeholder="Ex: João Silva"
                        className="bg-white/5 border-white/10"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-muted-foreground">CPF ou CNPJ</label>
                      <Input
                        value={signerDocument}
                        onChange={(e) => setSignerDocument(e.target.value)}
                        placeholder="000.000.000-00"
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={signing} className="w-full bg-accent hover:bg-accent/90">
                    {signing ? "Assinando..." : "Assinar Digitalmente"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          // Pós-assinatura: pagamento manual via PIX do freelancer
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="p-8 rounded-2xl border border-green-500/30 bg-green-500/10 text-center space-y-6">
              <div>
                <h3 className="text-2xl font-display font-bold text-green-400">Contrato Assinado</h3>
                <p className="text-sm text-green-300/70 mt-1">
                  Assinado por {proposal.contract.signerName} em{" "}
                  {new Date(proposal.contract.signedAt!).toLocaleDateString("pt-BR")}
                </p>
              </div>

              {proposal.contract.canPay && (
                <Card className="border-white/5 bg-white/[0.02]">
                  <CardHeader>
                    <CardTitle className="text-xl font-display">Pagamento via PIX</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!hasPixKey ? (
                      <div className="text-sm text-red-300">
                        O freelancer ainda não configurou uma chave PIX. Entre em contato e solicite a chave.
                      </div>
                    ) : (
                      <>
                        <div className="text-sm text-muted-foreground">
                          Faça o PIX no valor de{" "}
                          <b>
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(proposal.value))}
                          </b>{" "}
                          para a chave abaixo:
                        </div>

                        <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-left">
                              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                                {pixTypeLabel(pixKeyType)}
                              </div>
                              <div className="font-mono text-sm break-all">{pixKey}</div>
                              <div className="text-[11px] text-muted-foreground mt-1">
                                {maskPixKey(pixKey, pixKeyType)}
                              </div>
                            </div>

                            <Button onClick={handleCopyPix} className="bg-white text-black hover:bg-gray-100 rounded-full px-6">
                              Copiar
                            </Button>
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground leading-relaxed">
                          Após pagar, envie o comprovante ao freelancer para agilizar a confirmação do pagamento.
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}