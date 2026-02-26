import { motion } from "framer-motion";
import { useRef } from "react";

const steps = [
  {
    num: "01",
    title: "Escolha o Template",
    desc: "Selecione entre dezenas de templates profissionais criados para converter. Personalize com sua marca em segundos."
  },
  {
    num: "02",
    title: "Envie a Proposta",
    desc: "Compartilhe com um link. Seu cliente recebe uma proposta elegante que transmite confianca e profissionalismo."
  },
  {
    num: "03",
    title: "Feche o Contrato",
    desc: "Aceite digital com registro. Acompanhe tudo no seu dashboard e veja suas vendas crescerem mes a mes."
  }
];

export default function Process() {
  const ref = useRef(null);

  return (
    <section ref={ref} className="py-40 relative px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h3 className="text-sm font-mono text-accent tracking-widest uppercase mb-4">Como Funciona</h3>
          <h2 className="text-3xl md:text-5xl font-display">
            Do primeiro contato ao <span className="text-accent">Fechou!</span>
          </h2>
          <p className="text-muted-foreground mt-4 text-lg max-w-2xl mx-auto">
            Simplifique seu processo de vendas. Menos burocracia, mais contratos fechados.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-1 md:grid-cols-3 gap-24 relative">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2, duration: 1, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ 
                scale: 1.03,
                y: -10
              }}
              className="relative group p-8 rounded-[2.5rem] hover:bg-white/[0.03] hover:border hover:border-accent/20 transition-all duration-500 cursor-pointer hover:shadow-[0_25px_70px_rgba(255,102,0,0.1)]"
            >
              <span className="font-display text-8xl md:text-[10rem] text-white/5 absolute -top-12 -left-6 pointer-events-none group-hover:text-accent/30 group-hover:scale-110 transition-all duration-700 origin-left">
                {step.num}
              </span>
              <div className="relative z-10 pt-12">
                <h3 className="text-2xl font-display mb-4 group-hover:text-accent group-hover:translate-x-2 transition-all duration-500">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed font-light group-hover:text-foreground/90 transition-colors duration-500">
                  {step.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
