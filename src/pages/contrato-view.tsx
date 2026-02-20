import { motion } from "framer-motion";
import { Link, useParams } from "wouter";
import { generateShareLink } from "../service/proposals";
import { toast } from "sonner";

interface ContractData {
  id: string;
  clientName: string;
  clientEmail: string;
  projectTitle: string;
  description: string;
  value: number;
  deadline: string;
  clauses: string[];
}

// Mock data para visualização (em um app real viria do banco)
const mockContract: ContractData = {
  id: "1",
  clientName: "Tech Solutions",
  clientEmail: "contato@techsolutions.com",
  projectTitle: "Landing Page Corporativa",
  description: "Desenvolvimento de landing page de alta conversão com foco em SEO e performance.",
  value: 3500,
  deadline: "15 dias úteis",
  clauses: [
    "DO OBJETO: O presente contrato tem por objeto a prestação de serviços de desenvolvimento e design, conforme as especificações detalhadas no escopo do projeto.",
    "DA PROPRIEDADE INTELECTUAL: Todos os direitos de propriedade intelectual sobre os produtos do serviço serão transferidos ao CONTRATANTE após o pagamento integral do valor acordado.",
    "DA CONFIDENCIALIDADE: As partes comprometem-se a manter sigilo absoluto sobre quaisquer informações técnicas ou comerciais trocadas durante a vigência deste contrato.",
    "DA RESCISÃO: O contrato poderá ser rescindido por qualquer uma das partes mediante aviso prévio por escrito de 15 dias, cabendo o pagamento proporcional pelos serviços realizados."
  ]
};

export default function ContratoView() {
  const { id } = useParams();
  
  // Aqui buscaríamos os dados reais pelo ID
  const contract = mockContract; 

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return (
    <div className="min-h-screen bg-white text-black p-8 md:p-20 font-serif">
      <div className="max-w-[800px] mx-auto bg-white shadow-2xl border border-gray-100 p-12 md:p-24 relative overflow-hidden">
        {/* Marca d'água discreta */}
        <div className="absolute top-10 right-10 opacity-10 font-sans font-bold text-4xl rotate-12 pointer-events-none">
          FECHOU!
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <header className="border-b-2 border-black pb-8 mb-12">
            <h1 className="text-3xl font-bold uppercase tracking-widest mb-2">Contrato de Prestação de Serviços</h1>
            <p className="text-sm text-gray-500 font-sans">REF: #CONTR-{id?.toUpperCase()}</p>
          </header>

          <section className="mb-12">
            <h2 className="text-xl font-bold mb-6 underline decoration-1 underline-offset-4">1. AS PARTES</h2>
            <div className="space-y-4 text-justify leading-relaxed">
              <p>
                De um lado, <strong>CONTRATANTE:</strong> {contract.clientName}, com endereço eletrônico {contract.clientEmail}.
              </p>
              <p>
                De outro lado, <strong>CONTRATADO:</strong> Prestador de Serviços Freelancer devidamente cadastrado na plataforma FECHOU!.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-xl font-bold mb-6 underline decoration-1 underline-offset-4">2. DO PROJETO E DESCRIÇÃO</h2>
            <div className="space-y-4 text-justify leading-relaxed">
              <p><strong>TÍTULO:</strong> {contract.projectTitle}</p>
              <p><strong>DESCRIÇÃO:</strong> {contract.description}</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-xl font-bold mb-6 underline decoration-1 underline-offset-4">3. CLÁUSULAS CONTRATUAIS</h2>
            <div className="space-y-8 text-justify leading-relaxed">
              {contract.clauses.map((clause, idx) => (
                <div key={idx} className="relative pl-6">
                  <span className="absolute left-0 top-0 font-bold">3.{idx + 1}</span>
                  <p>{clause}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-xl font-bold mb-6 underline decoration-1 underline-offset-4">4. VALORES E PRAZOS</h2>
            <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg space-y-4 font-sans">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-600">INVESTIMENTO TOTAL:</span>
                <span className="text-2xl font-bold text-black">{formatCurrency(contract.value)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-600">PRAZO ESTIMADO:</span>
                <span className="text-lg">{contract.deadline}</span>
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-200">
                <p className="text-sm font-bold text-gray-600 mb-4 uppercase tracking-wider">Forma de Pagamento:</p>
                <div className="flex flex-col items-center p-4 bg-white border border-gray-100 rounded-xl">
                  <div className="w-32 h-32 bg-gray-100 flex items-center justify-center rounded-lg mb-4">
                    <span className="text-[10px] text-gray-400">QR CODE PIX</span>
                  </div>
                  <p className="text-xs font-mono bg-gray-50 p-2 rounded w-full text-center break-all">
                    00020126330014BR.GOV.BCB.PIX0111suachavepix...
                  </p>
                  <button 
                    onClick={async () => {
                      await navigator.clipboard.writeText("00020126330014BR.GOV.BCB.PIX0111suachavepix...");
                      toast.success("Chave Pix copiada!");
                      const notification = document.createElement("div");
                      notification.className = "fixed top-20 left-1/2 -translate-x-1/2 bg-accent text-white px-6 py-3 rounded-full shadow-2xl z-50 animate-bounce";
                      notification.innerText = "Chave Pix Copiada!";
                      document.body.appendChild(notification);
                      setTimeout(() => notification.remove(), 3000);
                    }}
                    className="mt-2 text-[10px] font-bold text-accent uppercase"
                  >
                    Copiar Chave Pix
                  </button>
                </div>
              </div>
            </div>
          </section>

          <footer className="mt-24 pt-12 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-20">
              <div className="text-center">
                <div className="border-b border-black mb-4"></div>
                <p className="text-sm font-bold uppercase">Assinatura Contratante</p>
              </div>
              <div className="text-center">
                <div className="border-b border-black mb-4"></div>
                <p className="text-sm font-bold uppercase">Assinatura Contratado</p>
              </div>
            </div>
            <p className="text-center text-[10px] text-gray-400 mt-20 font-sans">
              Gerado eletronicamente via Fechou! - Plataforma de Gestão para Freelancers
            </p>
          </footer>
        </motion.div>
      </div>

      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex gap-4 no-print">
        <button 
          onClick={async () => {
            try {
              if (!id) return;
              const res = await generateShareLink(Number(id));
              const url = `${window.location.origin}/c/${res.shareToken}`;
              await navigator.clipboard.writeText(url);
              toast.success("Link do contrato copiado com sucesso!");
              
              // Feedback visual de cópia
              const notification = document.createElement("div");
              notification.className = "fixed top-20 left-1/2 -translate-x-1/2 bg-accent text-white px-6 py-3 rounded-full shadow-2xl z-50 animate-bounce";
              notification.innerText = "Link Copiado! Compartilhe com seu cliente.";
              document.body.appendChild(notification);
              setTimeout(() => notification.remove(), 3000);
            } catch (err: any) {
              toast.error(err.message || "Erro ao gerar link de compartilhamento");
            }
          }}
          className="px-8 py-3 bg-accent text-white rounded-full font-sans text-xs uppercase tracking-widest hover:bg-accent/90 transition-colors shadow-xl flex items-center gap-2"
        >
          <span>Copiar Link do Contrato</span>
        </button>
        <button 
          onClick={async () => {
            const url = window.location.href;
            await navigator.clipboard.writeText(url);
            toast.success("Link da visualização copiado!");
            
            const notification = document.createElement("div");
            notification.className = "fixed top-20 left-1/2 -translate-x-1/2 bg-black text-white px-6 py-3 rounded-full shadow-2xl z-50 animate-bounce";
            notification.innerText = "Link de Visualização Copiado!";
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
          }}
          className="px-8 py-3 bg-black text-white rounded-full font-sans text-xs uppercase tracking-widest hover:bg-gray-800 transition-colors shadow-xl"
        >
          Copiar Link Direto
        </button>
        <button 
          onClick={() => window.print()}
          className="px-8 py-3 border-2 border-black text-black bg-white rounded-full font-sans text-xs uppercase tracking-widest hover:bg-gray-50 transition-colors shadow-xl"
        >
          PDF
        </button>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; padding: 0 !important; }
          .shadow-2xl { shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
