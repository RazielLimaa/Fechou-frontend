import { useSpring } from "framer-motion";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import SignatureAnimation from "./SignatureAnimation";

interface ContractScreenProps {
  contractProgress: number; // 0-1: how far the document has scrolled
  signingProgress: number;  // 0-1: how far the signature is drawn
  isComplete: boolean;
}

const clauses = [
  {
    isHeader: true,
    title: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS",
    subtitle: "ACORDO DE NÍVEL DE SERVIÇO",
  },
  {
    title: "1. DAS PARTES",
    content: "Pelo presente instrumento, as partes identificadas celebram o Contrato de Prestação de Serviços, regido pelas cláusulas e condições seguintes.",
  },
  {
    title: "2. DO OBJETO",
    content: "Prestação de serviços de tecnologia, desenvolvimento e consultoria especializada conforme especificações acordadas no Anexo I.",
  },
  {
    title: "3. DO PRAZO",
    content: "Vigência de 12 meses, iniciando-se em 01 de março de 2026. Renovável mediante acordo mútuo com antecedência de 30 dias.",
  },
  {
    title: "4. DO VALOR",
    content: "Valor total de R$ 120.000,00, em parcelas mensais de R$ 10.000,00, com vencimento no 5º dia útil de cada mês.",
  },
  {
    title: "5. DAS OBRIGAÇÕES",
    content: "Entregar marcos do projeto conforme cronograma acordado, mantendo sigilo sobre informações confidenciais e assegurando a qualidade dos entregáveis.",
  },
  {
    title: "6. DA CONFIDENCIALIDADE",
    content: "As partes se comprometem a manter em absoluto sigilo todas as informações técnicas e comerciais trocadas durante a vigência e por 5 anos após o encerramento.",
  },
  {
    title: "7. DA ASSINATURA DIGITAL",
    content: "Assinado eletronicamente com validade jurídica conforme Lei nº 14.063/2020. Plena eficácia equivalente à assinatura manuscrita.",
  },
];

// Total scrollable height inside the phone screen (px)
// The content is taller than the visible area, so we scroll through it
const SCROLL_PX = 480;

export default function ContractScreen({ contractProgress, signingProgress, isComplete }: ContractScreenProps) {
  // Spring-smooth the internal scroll so it feels like real inertia
  const springY = useSpring(0, { stiffness: 45, damping: 20 });
  const [displayY, setDisplayY] = useState(0);

  useEffect(() => {
    springY.set(-(contractProgress * SCROLL_PX));
  }, [contractProgress]);

  useEffect(() => springY.on("change", setDisplayY), [springY]);

  return (
    <div className="flex-1 overflow-hidden relative bg-white" style={{ fontSize: "8px" }}>

      {/* Top fade */}
      <div className="absolute top-0 left-0 right-0 h-6 pointer-events-none z-10"
        style={{ background: "linear-gradient(to bottom, #fff 30%, transparent)" }}/>

      {/* Scrolling document */}
      <div
        style={{
          transform: `translateY(${displayY}px)`,
          paddingLeft: "20px", paddingRight: "20px", paddingTop: "8px", paddingBottom: "140px",
        }}
      >
        {clauses.map((c, i) => {
          if (c.isHeader) return (
            <div key={i} className="mb-5 text-center pt-1">
              <div className="font-black tracking-widest uppercase"
                style={{ fontSize: "9.5px", color: "#0A0A0A" }}>
                {c.title}
              </div>
              <div className="font-bold tracking-widest mt-0.5"
                style={{ fontSize: "6.5px", color: "#FF5C00" }}>
                {c.subtitle}
              </div>
              <div className="mt-3 mx-auto" style={{ height:"2px", width:"36px", background:"#0A0A0A" }}/>
              <div className="mt-3 flex justify-between font-bold"
                style={{ fontSize:"6px", color:"#888" }}>
                <span>Nº 2026/0321</span><span>21 MAR 2026</span>
              </div>
            </div>
          );

          return (
            <div key={i} className="mb-4">
              <div className="font-black mb-1 tracking-wide"
                style={{ fontSize: "7.5px", color: "#0A0A0A" }}>
                {c.title}
              </div>
              <div style={{ fontSize: "7px", color: "#555", lineHeight: "1.65", fontWeight: 500 }}>
                {c.content}
              </div>
              <div className="mt-3" style={{ height: "0.5px", background: "#e5e7eb" }}/>
            </div>
          );
        })}

        {/* Signature section */}
        <div className="mt-6 pt-4" style={{ borderTop: "2px solid #0A0A0A" }}>
          <div className="text-center font-black tracking-widest mb-3"
            style={{ fontSize: "8px", color: "#0A0A0A" }}>
            ASSINATURA DIGITAL
          </div>

          <div className="rounded p-3"
            style={{ background: "#f9fafb", border: "1.5px dashed #d1d5db" }}>
            <div className="font-bold tracking-wider mb-1.5"
              style={{ fontSize: "6px", color: "#9ca3af" }}>
              CONTRATANTE
            </div>

            <div style={{ height: "42px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {signingProgress > 0 ? (
                <SignatureAnimation progress={signingProgress} name="João Silva" />
              ) : (
                <div style={{ fontSize: "7px", color: "#c4c4c4", fontWeight: 600 }}>
                  Aguardando assinatura...
                </div>
              )}
            </div>

            <div style={{ height: "1.5px", background: "#0A0A0A", margin: "4px 0" }}/>
            <div style={{ fontSize: "6px", color: "#4b5563", fontWeight: 700 }}>
              JOÃO SILVA SANTOS • CPF: 123.456.789-00
            </div>
          </div>

          {/* Completion seal */}
          {isComplete && (
            <motion.div
              initial={{ scale: 0, opacity: 0, rotate: -15 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 22, delay: 0.3 }}
              className="flex flex-col items-center gap-1.5 mt-5"
            >
              <div className="rounded-full flex items-center justify-center"
                style={{
                  width: "38px", height: "38px",
                  background: "#FF5C00",
                  boxShadow: "0 0 0 4px rgba(255,92,0,0.15)",
                }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="3"
                    strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{ fontSize: "8px", color: "#FF5C00", fontWeight: 900, letterSpacing: "0.08em" }}>
                CONTRATO ASSINADO
              </div>
              <div style={{ fontSize: "6px", color: "#9ca3af", fontWeight: 700 }}>
                21/03/2026 • 14:32:07 UTC
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none z-10"
        style={{ background: "linear-gradient(to top, #fff 30%, transparent)" }}/>

      {/* Down-arrow while still scrolling */}
      {contractProgress < 0.98 && signingProgress === 0 && (
        <motion.div
          animate={{ y: [0, 4, 0] }}
          transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
          className="absolute bottom-2.5 left-1/2 pointer-events-none z-20"
          style={{ transform: "translateX(-50%)" }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="#FF5C00" strokeWidth="3"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.div>
      )}
    </div>
  );
}
