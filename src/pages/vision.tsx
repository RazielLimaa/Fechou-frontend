import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Navbar from "../components/landing/Navbar";
import Footer from "../components/landing/Footer";
import { ArrowRight, Focus, Target, Rocket, Eye, Shield, Layers } from "lucide-react";
import { Link } from "wouter";

export default function Vision() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.8]);

  const pillars = [
    {
      number: "01",
      title: "Clareza",
      subtitle: "Nao existe confusao.",
      description: "Cada proposta, cada acordo, cada detalhe fica cristalino. Sem espaco para mal-entendidos.",
      icon: Eye,
      gradient: "from-orange-500/20 to-transparent"
    },
    {
      number: "02", 
      title: "Confianca",
      subtitle: "Profissionalismo que impoe respeito.",
      description: "Mostre ao cliente que existe metodo, organizacao e compromisso por tras de cada entrega.",
      icon: Target,
      gradient: "from-amber-500/20 to-transparent"
    },
    {
      number: "03",
      title: "Autonomia",
      subtitle: "Voce no controle.",
      description: "Ferramentas que respeitam seu tempo, seu esforco e sua forma unica de trabalhar.",
      icon: Rocket,
      gradient: "from-red-500/20 to-transparent"
    }
  ];

  const values = [
    { icon: Shield, text: "Sem promessas vazias" },
    { icon: Focus, text: "Sem burocracia" },
    { icon: Layers, text: "Sem complexidade" }
  ];

  return (
    <div ref={containerRef} className="bg-background min-h-screen text-foreground selection:bg-accent selection:text-white overflow-hidden">
      <div className="noise-overlay" />
      <Navbar />
      
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="blur-blob bg-accent/30 top-[-20%] right-[-10%] w-[800px] h-[800px]" />
        <div className="blur-blob bg-white/5 bottom-[-20%] left-[-10%] w-[600px] h-[600px]" />
        
        <motion.div 
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="relative z-10 text-center px-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <span className="inline-block px-6 py-2 rounded-full border border-accent/30 text-accent text-xs uppercase tracking-[0.3em] bg-accent/5 backdrop-blur-sm">
              Nossa Visao
            </span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="font-display text-[15vw] md:text-[12rem] leading-[0.85] tracking-[-0.04em] mb-8"
          >
            <span className="text-reveal">VISION</span>
            <span className="text-accent italic">!</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-xl md:text-3xl font-light text-muted-foreground max-w-3xl mx-auto leading-relaxed"
          >
            Nao construimos apenas uma ferramenta.<br/>
            <span className="text-foreground font-normal">Construimos a estrutura da sua autonomia.</span>
          </motion.p>
        </motion.div>
      </section>

      <section className="relative py-40 px-6">
        <div className="max-w-[1400px] mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-32"
          >
            <h2 className="font-display text-5xl md:text-7xl mb-6">
              A Origem<span className="text-accent">.</span>
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed font-light">
              O Fechou! nasceu da vivencia real de quem trabalha como freelancer e entende que 
              <span className="text-foreground"> o maior desafio nao e executar bem um projeto, 
              mas conseguir transformar conversas em acordos claros e respeitados.</span>
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-1 md:grid-cols-3 gap-8 mb-40">
            {pillars.map((pillar, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2, duration: 0.6 }}
                whileHover={{ 
                  y: -15,
                  transition: { duration: 0.3 }
                }}
                className="relative group cursor-pointer"
              >
                <div className={`absolute inset-0 bg-gradient-to-b ${pillar.gradient} rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                
                <div className="relative p-12 rounded-[2.5rem] border border-white/5 bg-white/[0.02] backdrop-blur-xl transition-all duration-500 group-hover:border-accent/30 group-hover:shadow-[0_30px_80px_rgba(255,102,0,0.15)]">
                  <div className="flex items-center gap-4 mb-8">
                    <span className="text-accent font-display text-6xl opacity-30 group-hover:opacity-100 transition-opacity duration-500">
                      {pillar.number}
                    </span>
                    <pillar.icon className="w-8 h-8 text-accent opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:scale-110" />
                  </div>
                  
                  <h3 className="font-display text-4xl mb-3 group-hover:text-accent transition-colors duration-300">
                    {pillar.title}
                  </h3>
                  <p className="text-accent/80 text-sm uppercase tracking-widest mb-6 opacity-0 group-hover:opacity-100 transition-all duration-500">
                    {pillar.subtitle}
                  </p>
                  <p className="text-muted-foreground text-lg leading-relaxed font-light group-hover:text-foreground/80 transition-colors duration-500">
                    {pillar.description}
                  </p>

                  <motion.div 
                    className="mt-8 flex items-center gap-2 text-accent opacity-0 group-hover:opacity-100 transition-all duration-500"
                  >
                    <span className="text-sm uppercase tracking-widest">Saiba mais</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform duration-300" />
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-32 px-6 overflow-hidden">
        <div className="blur-blob bg-accent/20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px]" />
        
        <div className="max-w-[1200px] mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-center py-32 px-12 rounded-[4rem] border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="w-24 h-24 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center mx-auto mb-12"
            >
              <Focus className="w-10 h-10 text-accent" />
            </motion.div>

            <h2 className="font-display text-4xl md:text-6xl mb-8 leading-tight">
              Freelancers nao precisam<br/>
              <span className="text-accent">de mais promessas.</span>
            </h2>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed font-light">
              Precisam de ferramentas bem construidas que respeitem seu tempo, 
              seu esforco e sua autonomia.
            </p>

            <div className="flex flex-wrap justify-center gap-6 mb-16">
              {values.map((value, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ scale: 1.05, borderColor: "rgba(255, 102, 0, 0.5)" }}
                  className="flex items-center gap-3 px-6 py-3 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-300 cursor-pointer hover:bg-accent/10"
                >
                  <value.icon className="w-5 h-5 text-accent" />
                  <span className="text-sm font-medium">{value.text}</span>
                </motion.div>
              ))}
            </div>

            <Link href="/system">
              <motion.button
                whileHover={{ 
                  scale: 1.05,
                  boxShadow: "0 0 60px rgba(255, 102, 0, 0.5)"
                }}
                whileTap={{ scale: 0.95 }}
                className="px-16 py-6 rounded-full bg-accent text-white font-display text-xl tracking-wide transition-all duration-300 hover:bg-accent/90"
              >
                Ver Planos
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="relative py-40 px-6">
        <div className="max-w-[1400px] mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center"
          >
            <div>
              <h3 className="text-sm font-mono text-accent tracking-widest uppercase mb-6">O Manifesto</h3>
              <h2 className="font-display text-4xl md:text-6xl mb-8 leading-tight">
                Fechar com o Fechou! e assumir 
                <span className="text-accent"> uma postura madura</span> 
                diante do proprio trabalho.
              </h2>
            </div>
            
            <div className="space-y-8">
              <motion.p 
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="text-xl text-muted-foreground leading-relaxed font-light"
              >
                E mostrar ao cliente que existe organizacao, metodo e compromisso 
                por tras de cada entrega.
              </motion.p>
              <motion.p 
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-xl text-muted-foreground leading-relaxed font-light"
              >
                E deixar para tras o improviso constante e construir uma relacao 
                baseada em <span className="text-foreground">clareza e respeito mutuo.</span>
              </motion.p>
              <motion.p 
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="text-xl text-foreground leading-relaxed font-medium"
              >
                O Fechou! existe para que voce foque no que faz de melhor, 
                enquanto a plataforma cuida da estrutura que sustenta cada acordo fechado.
              </motion.p>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
