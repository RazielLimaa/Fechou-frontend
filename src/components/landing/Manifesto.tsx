import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export default function Manifesto() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-30%"]);

  return (
    <section ref={ref} className="py-60 bg-white text-background overflow-hidden selection:bg-black selection:text-white">
      <motion.div style={{ x }} className="whitespace-nowrap flex items-center gap-20">
        <h2 className="text-[20vw] font-display uppercase leading-none tracking-tighter">
          VENDA MAIS <span className="text-accent italic">HOJE</span>
        </h2>
        <h2 className="text-[20vw] font-display uppercase leading-none tracking-tighter opacity-20 outline-text">
          VENDA MAIS HOJE
        </h2>
      </motion.div>
      
      <div className="max-w-4xl mx-auto px-6 mt-32">
        <motion.p 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-5xl font-light leading-[1.1] tracking-tight group cursor-default"
        >
          Freelancers que usam a Fechou! fecham <span className="italic font-display hover:text-accent transition-colors duration-300">3x mais contratos</span>. Nosso dashboard mostra exatamente onde voce pode melhorar e nossas <span className="hover:text-accent transition-colors duration-300 cursor-pointer">dicas semanais</span> te ajudam a vender mais.
        </motion.p>
      </div>
    </section>
  );
}
