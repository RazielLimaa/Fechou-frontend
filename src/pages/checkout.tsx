import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { motion } from "framer-motion";
import { CreditCard, ShieldCheck, Lock, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "../components/ui/button";
import Navbar from "../components/landing/Navbar";
import Footer from "../components/landing/Footer";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useToast } from "../hooks/use-toast";

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { type, id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Simulação de dados baseados na rota
  const isContract = type === "contrato";
  const itemTitle = isContract ? "Pagamento de Contrato" : "Assinatura de Plano";
  const itemDescription = isContract 
    ? `Pagamento referente ao contrato #${id?.toUpperCase()}`
    : `Plano ${id === "pro" ? "Profissional" : "Enterprise"} - Renovação Mensal`;
  const amount = isContract ? "R$ 3.500,00" : (id === "pro" ? "R$ 49,90" : "R$ 149,90");

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulação de processamento do Stripe
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      toast({
        title: "Pagamento realizado com sucesso!",
        description: "Você receberá um e-mail de confirmação em instantes.",
      });
      
      // Redirecionar após sucesso
      setTimeout(() => {
        setLocation(isContract ? `/contrato/${id}` : "/system");
      }, 3000);
    }, 2000);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-6 max-w-md"
        >
          <div className="flex justify-center">
            <CheckCircle2 className="w-24 h-24 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold">Pagamento Confirmado!</h1>
          <p className="text-muted-foreground">
            Obrigado por utilizar o Fechou!. Seu pagamento foi processado com segurança via Stripe.
          </p>
          <p className="text-sm text-muted-foreground italic">Redirecionando em instantes...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent selection:text-white overflow-hidden">
      <div className="noise-overlay" />
      <Navbar />

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => window.history.back()}
            className="mb-8 gap-2 hover:text-accent"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>

          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight mb-12">
            Finalizar <span className="text-accent">Pagamento.</span>
          </h1>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Resumo do Pedido */}
            <div className="space-y-6">
              <Card className="rounded-[2.5rem] border-white/5 bg-white/[0.02] backdrop-blur-xl border">
                <CardHeader className="p-8">
                  <CardTitle className="font-display text-2xl">Resumo do Pedido</CardTitle>
                  <CardDescription className="text-muted-foreground">Confira os detalhes antes de pagar</CardDescription>
                </CardHeader>
                <CardContent className="px-8 pb-8 space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="font-medium text-foreground/80">{itemTitle}</span>
                    <span className="text-muted-foreground text-xs uppercase tracking-widest">{id?.toUpperCase()}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{itemDescription}</p>
                  <div className="flex justify-between items-center pt-6">
                    <span className="text-lg font-bold">Total a pagar:</span>
                    <span className="text-3xl font-display font-black text-accent">{amount}</span>
                  </div>
                </CardContent>
                <CardFooter className="bg-white/5 flex flex-col gap-3 items-start p-8 rounded-b-[2.5rem]">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                    <ShieldCheck className="w-3 h-3 text-green-500" />
                    Segurança via Stripe
                  </div>
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                    <Lock className="w-3 h-3" />
                    Criptografia SSL
                  </div>
                </CardFooter>
              </Card>
            </div>

            {/* Formulário de Pagamento */}
            <div className="space-y-6">
              <Card className="rounded-[2.5rem] border-accent/20 bg-accent/5 backdrop-blur-xl shadow-[0_0_50px_rgba(255,102,0,0.1)] border">
                <CardHeader className="p-8">
                  <CardTitle className="flex items-center gap-2 font-display text-2xl">
                    <CreditCard className="w-6 h-6 text-accent" /> Cartão de Crédito
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-8">
                  <form id="payment-form" onSubmit={handlePayment} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="card-name" className="text-xs uppercase tracking-widest text-muted-foreground">Nome no Cartão</Label>
                      <Input id="card-name" placeholder="JOÃO SILVA" className="bg-white/5 border-white/10 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="card-number" className="text-xs uppercase tracking-widest text-muted-foreground">Número do Cartão</Label>
                      <div className="relative">
                        <Input id="card-number" placeholder="0000 0000 0000 0000" required className="bg-white/5 border-white/10 rounded-xl" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="card-expiry" className="text-xs uppercase tracking-widest text-muted-foreground">Validade</Label>
                        <Input id="card-expiry" placeholder="MM/AA" required className="bg-white/5 border-white/10 rounded-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="card-cvv" className="text-xs uppercase tracking-widest text-muted-foreground">CVV</Label>
                        <Input id="card-cvv" placeholder="123" required maxLength={4} className="bg-white/5 border-white/10 rounded-xl" />
                      </div>
                    </div>
                  </form>
                </CardContent>
                <CardFooter className="p-8">
                  <Button 
                    type="submit" 
                    form="payment-form"
                    className="w-full bg-accent hover:bg-accent/90 text-white font-display text-xl py-8 rounded-2xl transition-all hover:shadow-[0_0_30px_rgba(255,102,0,0.4)]"
                    disabled={loading}
                  >
                    {loading ? "Processando..." : `Pagar ${amount}`}
                  </Button>
                </CardFooter>
              </Card>
              
              <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest">
                Transação 100% segura e protegida
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
