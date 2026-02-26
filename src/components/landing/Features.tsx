import { motion } from "framer-motion";
import { FileText, BarChart3, Lightbulb, Clock, Send, TrendingUp } from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Templates Profissionais",
    description: "Mais de 50 templates prontos para diferentes nichos. Personalize com sua marca e envie em segundos."
  },
  {
    icon: BarChart3,
    title: "Dashboard de Vendas",
    description: "Acompanhe suas propostas, contratos fechados e faturamento mensal. Visualize sua evolucao em graficos claros."
  },
  {
    icon: Lightbulb,
    title: "Dicas de Vendas",
    description: "Receba insights personalizados baseados nos seus resultados. Aprenda a converter mais propostas em contratos."
  },
  {
    icon: Clock,
    title: "Feche em Minutos",
    description: "Do primeiro contato ao contrato assinado em tempo recorde. Menos burocracia, mais resultados."
  },
  {
    icon: Send,
    title: "Envio Simples",
    description: "Compartilhe por link, email ou WhatsApp. Seu cliente recebe uma proposta profissional que impressiona."
  },
  {
    icon: TrendingUp,
    title: "Aumente seu Faturamento",
    description: "Freelancers que usam a Fechou! reportam aumento medio de 40% no faturamento nos primeiros 3 meses."
  }
];

export default function Features() {
  return (
    <section className="py-32 px-6 relative bg-secondary/5">
      <div className="max-w-6xl mx-auto">
        <div className="mb-20 text-center">
          <h3 className="text-sm font-mono text-accent tracking-widest uppercase mb-4">Por Que a Fechou?</h3>
          <h2 className="text-3xl md:text-5xl font-display max-w-3xl mx-auto">
            Tudo que voce precisa para <span className="text-accent">fechar mais contratos.</span>
          </h2>
          <p className="text-muted-foreground mt-6 text-lg max-w-2xl mx-auto">
            Templates, dashboard, dicas e muito mais. Uma plataforma completa 
            para transformar seu trabalho freelancer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              whileHover={{ 
                y: -8,
                borderColor: "rgba(255, 102, 0, 0.3)"
              }}
              className="p-8 rounded-2xl bg-secondary/10 hover:bg-secondary/20 transition-all duration-500 border border-white/5 backdrop-blur-sm group cursor-pointer hover:shadow-[0_20px_60px_rgba(255,102,0,0.1)]"
            >
              <feature.icon className="w-8 h-8 text-accent mb-6 group-hover:scale-125 group-hover:rotate-6 transition-all duration-500" />
              <h4 className="text-xl font-medium mb-3 group-hover:text-accent transition-colors duration-300">{feature.title}</h4>
              <p className="text-muted-foreground leading-relaxed text-sm group-hover:text-foreground/80 transition-colors duration-300">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
