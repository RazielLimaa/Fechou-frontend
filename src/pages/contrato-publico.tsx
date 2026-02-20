import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { motion } from "framer-motion";
import { getPublicProposal, signProposal, createCheckout, type ApiProposal } from "../service/proposals";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { rateLimiter, sanitizeInput } from "../lib/security";

export default function ContratoPublico() {
  const [, params] = useRoute("/c/:token");
  const token = params?.token;
  const [proposal, setProposal] = useState<ApiProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerDocument, setSignerDocument] = useState("");

  useEffect(() => {
    if (token) {
      getPublicProposal(token)
        .then(setProposal)
        .catch((err) => toast.error(err.message))
        .finally(() => setLoading(false));
    }
  }, [token]);

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const trimmedName = signerName.trim();
    const trimmedDoc = signerDocument.trim();

    if (trimmedName.length < 2) return toast.error("Nome muito curto");
    if (trimmedName.length > 200) return toast.error("Nome muito longo");
    if (trimmedDoc.length < 5) return toast.error("Documento invalido");
    if (trimmedDoc.length > 20) return toast.error("Documento invalido");

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
      const updated = await getPublicProposal(token);
      setProposal(updated);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSigning(false);
    }
  };

  const handlePayment = async () => {
    if (!token) return;

    // Rate limit: max 3 checkout attempts per 5 minutes
    if (!rateLimiter.check("checkout", 3, 5 * 60 * 1000)) {
      toast.error("Muitas tentativas de pagamento. Aguarde alguns minutos.");
      return;
    }

    setCheckingOut(true);
    try {
      const { checkoutUrl } = await createCheckout(token, {
        successUrl: `${window.location.origin}/pagamento/sucesso`,
        failureUrl: `${window.location.origin}/pagamento/falha`,
        pendingUrl: `${window.location.origin}/pagamento/pendente`,
      });
      window.location.href = checkoutUrl;
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  if (!proposal) return <div className="flex items-center justify-center min-h-screen font-display text-2xl">Link inválido ou expirado.</div>;

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
              <Badge variant={proposal.contract?.signed ? "default" : "outline"} className={proposal.contract?.signed ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"}>
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
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="p-8 rounded-2xl border border-green-500/30 bg-green-500/10 text-center space-y-6">
              <div>
                <h3 className="text-2xl font-display font-bold text-green-400">Contrato Assinado</h3>
                <p className="text-sm text-green-300/70 mt-1">
                  Assinado por {proposal.contract.signerName} em {new Date(proposal.contract.signedAt!).toLocaleDateString("pt-BR")}
                </p>
              </div>
              {proposal.contract.canPay && (
                <Button 
                  onClick={handlePayment} 
                  disabled={checkingOut}
                  className="px-12 py-6 text-lg font-bold bg-white text-black hover:bg-gray-100 rounded-full"
                >
                  {checkingOut ? "Processando..." : "Ir para Pagamento"}
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
