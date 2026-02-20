import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowDownRight } from "lucide-react";
import { useLocation } from "wouter";

export default function Hero() {
  const [, setLocation] = useLocation();
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.8]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);

  return (
    <section ref={containerRef} className="relative min-h-[120vh] flex flex-col items-center justify-center overflow-hidden">
      <div className="blur-blob bg-accent brightness-650 saturate-500 top-[-10%] right-[-10%]" />
      <div className="blur-blob bg-white brightness-725 opacity-100 bottom-[-10%] left-[-10%]" />

      <motion.div
        style={{ scale, opacity, y }}
        className="relative z-10 w-full max-w-[1400px] px-6 text-center"
      >
        <div className="mb-6 flex justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="px-4 py-1 rounded-full border border-white/10 text-[10px] uppercase tracking-[0.2em] bg-white/5 backdrop-blur-sm"
          >
            Feche contratos 3x mais rapido
          </motion.div>
        </div>

        <h1 className="font-display text-[18vw] md:text-[14rem] leading-[0.8] tracking-[-0.04em] mb-8">
          <span className="text-reveal">FECHOU</span>
          <span
            style={{
              color: "#ff7a00",
              fontStyle: "italic",
            }}
          >
            !
          </span>
        </h1>




        <div className="flex flex-col md:flex-row items-center justify-center gap-12 mt-12">
          <p className="text-lg md:text-xl font-light text-muted-foreground max-w-sm text-center md:text-left leading-tight">
            Propostas profissionais, templates prontos <br />
            <span className="text-foreground">e contratos fechados em minutos.</span>
          </p>

          <motion.button
            onClick={() => setLocation("/vision")}
            whileHover={{
              scale: 1.15,
              backgroundColor: "rgb(255, 102, 0)",
              boxShadow: "0 0 60px rgba(255, 102, 0, 0.6), 0 0 100px rgba(255, 102, 0, 0.3)"
            }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="z-1000 w-24 h-24 rounded-full bg-transparent border-2 border-accent flex items-center justify-center text-accent hover:text-white group cursor-pointer relative overflow-hidden"
          >
            <motion.div
              className="absolute inset-0 bg-accent rounded-full"
              initial={{ scale: 0 }}
              whileHover={{ scale: 1 }}
              transition={{ duration: 0.3 }}
            />
            <ArrowDownRight className="w-10 h-10 group-hover:rotate-45 group-hover:text-white transition-all duration-500 relative z-10" />
          </motion.button>
        </div>
      </motion.div>

    </section>
  );
}
