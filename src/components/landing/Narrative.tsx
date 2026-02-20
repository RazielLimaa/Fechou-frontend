import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export default function Narrative() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0.1, 0.3, 0.8, 1], [0, 1, 1, 0]);
  const y = useTransform(scrollYProgress, [0.1, 0.8], [50, -50]);

  const benefits = [
    "Templates prontos para usar.",
    "Dashboard de vendas mensal.",
    "Dicas para vender mais.",
    "Contratos em minutos."
  ];

  return (
    <section ref={containerRef} className="min-h-screen flex items-center justify-center py-24 relative">
      <div className="max-w-4xl px-6 mx-auto text-center">
        <motion.div style={{ opacity, y }} className="space-y-12">
          <h2 className="text-4xl md:text-6xl font-display leading-tight">
            Pare de perder tempo <br/>
            <span className="text-muted-foreground">negociando no WhatsApp.</span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Com a Fechou!, voce envia propostas profissionais em segundos, 
            acompanha suas vendas em tempo real e recebe dicas personalizadas 
            para aumentar seu faturamento.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left mt-24">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                whileHover={{ x: 10, borderColor: "rgba(255, 102, 0, 0.5)" }}
                className="border-t border-border pt-6 cursor-pointer transition-all duration-300"
              >
                <p className="text-xl md:text-2xl font-light text-foreground/80">{benefit}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
