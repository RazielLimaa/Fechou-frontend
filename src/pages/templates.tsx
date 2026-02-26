import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";

interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  uses: number;
  isPro: boolean;
  content: string;
  clauses: string[];
  incentives: string[];
}

const mockTemplates: Template[] = [
  { 
    id: "1", 
    name: "Contrato de Prestação de Serviços (Freelance)", 
    category: "Web", 
    description: "Ideal para desenvolvedores e designers. Inclui cláusulas de propriedade intelectual e prazos.", 
    uses: 1240, 
    isPro: false,
    content: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS...",
    clauses: [
      "Objeto do Serviço: Descrição detalhada do que será entregue.",
      "Propriedade Intelectual: Os direitos passam ao cliente após o pagamento total.",
      "Rescisão: Regras para cancelamento com aviso prévio de 15 dias."
    ],
    incentives: [
      "Bônus de Antecipação: 5% de desconto para pagamento à vista.",
      "Garantia de Suporte: 30 dias de suporte grátis após a entrega.",
      "Cláusula de Confidencialidade: Proteção total para os dados do cliente."
    ]
  },
  { 
    id: "2", 
    name: "Contrato de Gestão de Redes Sociais", 
    category: "Marketing", 
    description: "Contrato focado em recorrência mensal e entrega de conteúdo.", 
    uses: 890, 
    isPro: false,
    content: "CONTRATO DE GESTÃO DE MÍDIAS...",
    clauses: [
      "Cronograma de Postagens: Definição de quantidade e canais.",
      "Aprovação de Conteúdo: Prazo de 48h para feedback do cliente.",
      "Relatórios Mensais: Entrega de métricas de desempenho."
    ],
    incentives: [
      "Relatório de Diagnóstico Grátis no primeiro mês.",
      "Desconto Progressivo: 10% de desconto a partir do 6º mês.",
      "Consultoria de Anúncios inclusa no pacote."
    ]
  },
  { 
    id: "3", 
    name: "Contrato de Branding e Identidade Visual", 
    category: "Branding", 
    description: "Proteção jurídica para processos criativos e entregáveis de design.", 
    uses: 567, 
    isPro: true,
    content: "CONTRATO DE IDENTIDADE VISUAL...",
    clauses: [
      "Processo Criativo: Número limitado de revisões (3 rounds).",
      "Arquivos Finais: Especificação de formatos (AI, PDF, PNG).",
      "Uso de Portfólio: Permissão para o designer exibir o trabalho."
    ],
    incentives: [
      "Manual da Marca Simplificado como bônus.",
      "Guia de Aplicação em Redes Sociais incluso.",
      "Suporte para registro de marca no INPI."
    ]
  },
  { 
    id: "4", 
    name: "Contrato de Desenvolvimento de Software", 
    category: "Software", 
    description: "Contrato robusto para sistemas complexos e integrações de API.", 
    uses: 432, 
    isPro: true,
    content: "CONTRATO DE DESENVOLVIMENTO...",
    clauses: [
      "Escopo Técnico: Definição de tecnologias e arquitetura.",
      "SLA de Disponibilidade: Garantia de funcionamento do sistema.",
      "Manutenção Preventiva: Atualizações de segurança mensais."
    ],
    incentives: [
      "Hospedagem gratuita nos primeiros 3 meses.",
      "Documentação técnica completa inclusa.",
      "Treinamento de equipe para uso do sistema."
    ]
  },
  { 
    id: "5", 
    name: "Contrato de Consultoria Jurídica", 
    category: "Jurídico", 
    description: "Modelo para advogados e consultores legais de compliance.", 
    uses: 245, 
    isPro: true,
    content: "CONTRATO DE CONSULTORIA JURÍDICA...",
    clauses: [
      "Sigilo Profissional: Confidencialidade absoluta dos dados.",
      "Honorários: Valor por hora ou por projeto definido.",
      "Responsabilidade: Limites da atuação consultiva."
    ],
    incentives: [
      "Primeira análise de contrato grátis.",
      "Checklist de compliance de bônus.",
      "Acesso a portal de documentos exclusivos."
    ]
  },
  { 
    id: "6", 
    name: "Contrato de Atendimento em Saúde", 
    category: "Saúde", 
    description: "Termos de serviço para psicólogos, nutricionistas e terapeutas.", 
    uses: 678, 
    isPro: false,
    content: "TERMOS DE ATENDIMENTO...",
    clauses: [
      "Política de Cancelamento: Aviso de 24h para remarcação.",
      "Privacidade de Dados: Conformidade com a LGPD.",
      "Forma de Pagamento: Sessões individuais ou pacotes."
    ],
    incentives: [
      "Guia de hábitos saudáveis em PDF.",
      "Desconto de 15% em pacotes semestrais.",
      "Suporte via WhatsApp para dúvidas rápidas."
    ]
  },
  { 
    id: "7", 
    name: "Contrato de Aulas Particulares", 
    category: "Educação", 
    description: "Ideal para professores de idiomas, música ou reforço escolar.", 
    uses: 543, 
    isPro: false,
    content: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS...",
    clauses: [
      "Material Didático: Responsabilidade pela aquisição.",
      "Reposição de Aulas: Regras para faltas justificadas.",
      "Duração do Plano: Renovação automática ou mensal."
    ],
    incentives: [
      "Material de apoio digital gratuito.",
      "Teste de nivelamento inicial sem custo.",
      "Certificado de conclusão de módulo."
    ]
  },
  { 
    id: "9", 
    name: "Contrato de Nail Design - Aplicação", 
    category: "Estética", 
    description: "Ideal para manicures e nail designers. Foco em cuidados pós-procedimento.", 
    uses: 432, 
    isPro: false,
    content: "CONTRATO DE SERVIÇOS DE ESTÉTICA...",
    clauses: [
      "Procedimento: Descrição da técnica (gel, fibra de vidro, etc).",
      "Garantia: 7 dias para reparos por defeito de aplicação.",
      "Cuidados: Termo de responsabilidade sobre manutenção."
    ],
    incentives: [
      "Kit de cuidados pós-procedimento grátis.",
      "Desconto de 10% na primeira manutenção.",
      "Cartão fidelidade: 10ª aplicação grátis."
    ]
  },
  { 
    id: "10", 
    name: "Contrato de Nail Design - Cursos", 
    category: "Estética", 
    description: "Modelo para instrutoras de técnicas de unhas.", 
    uses: 156, 
    isPro: true,
    content: "CONTRATO DE CURSO PROFISSIONALIZANTE...",
    clauses: [
      "Conteúdo: Lista de módulos e carga horária.",
      "Material: Especificação do que está incluso no kit.",
      "Certificação: Regras para emissão do certificado."
    ],
    incentives: [
      "Mentoria online de 30 dias após o curso.",
      "Lista de fornecedores exclusivos inclusa.",
      "Desconto em workshops avançados."
    ]
  },
  { 
    id: "11", 
    name: "Contrato de Fotografia - Eventos", 
    category: "Fotografia", 
    description: "Segurança para cobertura de casamentos, festas e eventos corporativos.", 
    uses: 876, 
    isPro: true,
    content: "CONTRATO DE COBERTURA FOTOGRÁFICA...",
    clauses: [
      "Entregáveis: Quantidade mínima de fotos editadas.",
      "Prazo de Entrega: Cronograma de envio (prévia e final).",
      "Direito de Imagem: Autorização para uso em portfólio."
    ],
    incentives: [
      "Mini álbum digital de brinde.",
      "Ensaio pré-evento com 50% de desconto.",
      "Entrega expressa das prévias (24h)."
    ]
  },
  { 
    id: "12", 
    name: "Contrato de Fotografia - Ensaio Pessoal", 
    category: "Fotografia", 
    description: "Modelo para ensaios externos ou em estúdio.", 
    uses: 543, 
    isPro: false,
    content: "CONTRATO DE ENSAIO FOTOGRÁFICO...",
    clauses: [
      "Locação: Responsabilidade por taxas e autorizações.",
      "Maquiagem/Look: Definição de trocas de roupa.",
      "Seleção: Método de escolha das fotos para edição."
    ],
    incentives: [
      "Guia de poses e looks em PDF.",
      "Revelação de 3 fotos em fine art.",
      "Link para galeria online por 1 ano."
    ]
  },
  { 
    id: "13", 
    name: "Contrato de Fotografia - E-commerce", 
    category: "Fotografia", 
    description: "Foco em fotografia de produtos e catálogos.", 
    uses: 231, 
    isPro: true,
    content: "CONTRATO DE FOTOGRAFIA DE PRODUTOS...",
    clauses: [
      "Uso Comercial: Licença de uso para redes e site.",
      "Tratamento: Nível de manipulação de imagem (fusão, limpeza).",
      "Devolução: Prazo para retirada dos produtos após as fotos."
    ],
    incentives: [
      "Primeira foto conceito de bônus.",
      "Formatação otimizada para marketplaces.",
      "Desconto para lotes acima de 50 produtos."
    ]
  },
  { 
    id: "14", 
    name: "Contrato de Landing Page de Alta Conversão", 
    category: "Web", 
    description: "Modelo focado em performance e copy persuasiva.", 
    uses: 945, 
    isPro: true,
    content: "CONTRATO DE CRIAÇÃO DE LANDING PAGE...",
    clauses: [
      "Copywriting: Inclusão de textos persuasivos.",
      "Configuração de Pixels: Instalação de ferramentas de tracking.",
      "Otimização: Garantia de velocidade de carregamento."
    ],
    incentives: [
      "A/B Testing incluso no primeiro mês.",
      "Integração com CRM sem custo extra.",
      "Suporte técnico prioritário."
    ]
  },
  { 
    id: "15", 
    name: "Contrato de Consultoria em Cybersecurity", 
    category: "Software", 
    description: "Modelo para auditorias e pentests.", 
    uses: 123, 
    isPro: true,
    content: "CONTRATO DE AUDITORIA DE SEGURANÇA...",
    clauses: [
      "Não Divulgação (NDA): Sigilo total sobre vulnerabilidades.",
      "Limitação de Responsabilidade: Danos em sistemas legados.",
      "Relatório de Mitigação: Guia passo a passo para correções."
    ],
    incentives: [
      "Re-scaneamento grátis após correções.",
      "Selo de empresa auditada para o cliente.",
      "Workshop de segurança para funcionários."
    ]
  },
  { 
    id: "16", 
    name: "Contrato de Social Media - Influencers", 
    category: "Marketing", 
    description: "Ideal para marcas que contratam influenciadores para campanhas pontuais.", 
    uses: 312, 
    isPro: true,
    content: "CONTRATO DE PARCERIA COM INFLUENCIADOR...",
    clauses: [
      "Exclusividade: O influenciador não poderá promover concorrentes por 30 dias.",
      "Uso de Imagem: Direito de uso da imagem em anúncios pagos por 6 meses.",
      "Métricas: Envio de prints de alcance e engajamento em 24h."
    ],
    incentives: [
      "Bônus por Conversão: R$ 5,00 por cada venda gerada pelo cupom.",
      "Envio de mimos mensais para unboxing.",
      "Convite VIP para eventos da marca."
    ]
  },
  { 
    id: "17", 
    name: "Contrato de Personal Trainer", 
    category: "Saúde", 
    description: "Focado em resultados e compromisso com horários de treino.", 
    uses: 245, 
    isPro: false,
    content: "CONTRATO DE ACOMPANHAMENTO ESPORTIVO...",
    clauses: [
      "Frequência: Definição de dias e horários fixos de treino.",
      "Aviso de Falta: Reagendamento permitido com 12h de antecedência.",
      "Responsabilidade: Termo de aptidão física assinado pelo aluno."
    ],
    incentives: [
      "Avaliação física mensal gratuita.",
      "Planilha de dieta personalizada de bônus.",
      "Desconto na renovação trimestral."
    ]
  },
  { 
    id: "18", 
    name: "Contrato de Arquitetura - Interiores", 
    category: "Design", 
    description: "Modelo completo para reformas e consultorias de design de interiores.", 
    uses: 189, 
    isPro: true,
    content: "CONTRATO DE PROJETO DE ARQUITETURA...",
    clauses: [
      "Visitas Técnicas: Limite de 3 visitas à obra inclusas.",
      "RRT/ART: Responsabilidade pelo registro profissional do projeto.",
      "Detalhamento: Lista de fornecedores e especificações de materiais."
    ],
    incentives: [
      "Render 3D fotorrealista de um ambiente adicional.",
      "Curadoria de mobiliário com desconto em lojas parceiras.",
      "Cronograma de obra detalhado de brinde."
    ]
  },
];

const categories = ["Todos", "Web", "Branding", "Mobile", "Software", "Design", "Marketing", "Jurídico", "Saúde", "Educação", "Eventos", "Estética", "Fotografia"];

export default function Templates() {
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [userPlan] = useState<"free" | "pro" | "premium">("free");

  const filteredTemplates = activeCategory === "Todos" 
    ? mockTemplates 
    : mockTemplates.filter(t => t.category === activeCategory);

  if (selectedTemplate) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="noise-overlay" />
        <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 bg-background/20 backdrop-blur-2xl border-b border-white/5">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between">
            <button onClick={() => setSelectedTemplate(null)} className="font-display text-2xl font-bold tracking-tight group flex items-center gap-2">
              <span className="text-accent group-hover:-translate-x-1 transition-transform">←</span> VOLTAR
            </button>
            <div className="px-3 py-1 rounded-full border border-white/10 text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              Visualizando Template
            </div>
          </div>
        </nav>

        <main className="pt-32 pb-20 px-6">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mb-12">
                <span className="text-[10px] uppercase tracking-[0.3em] text-accent px-3 py-1 rounded-full border border-accent/20 mb-6 inline-block">
                  {selectedTemplate.category}
                </span>
                <h1 className="font-display text-4xl md:text-6xl font-bold tracking-[-0.04em] leading-tight mb-4">
                  {selectedTemplate.name}
                </h1>
                <p className="text-xl text-muted-foreground">
                  {selectedTemplate.description}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                <div className="p-8 rounded-3xl border border-white/5 bg-white/[0.02]">
                  <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    Cláusulas Essenciais
                  </h3>
                  <div className="space-y-4">
                    {selectedTemplate.clauses.map((clause, idx) => (
                      <div key={idx} className="flex gap-4 p-4 rounded-xl bg-white/[0.01] border border-white/5">
                        <span className="text-accent font-mono text-xs">0{idx + 1}</span>
                        <p className="text-sm text-muted-foreground leading-relaxed">{clause}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-8 rounded-3xl border border-white/5 bg-white/[0.02]">
                  <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Diferenciais Irresistíveis
                  </h3>
                  <div className="space-y-4">
                    {selectedTemplate.incentives.map((inc, idx) => (
                      <div key={idx} className="flex gap-4 p-4 rounded-xl bg-green-500/[0.02] border border-green-500/10">
                        <span className="text-green-500">✓</span>
                        <p className="text-sm text-muted-foreground leading-relaxed font-medium">{inc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-8 rounded-3xl border border-white/5 bg-white/[0.02] mb-12">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Prévia do Texto</h3>
                  <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-white/10" />
                    <div className="w-2 h-2 rounded-full bg-white/10" />
                    <div className="w-2 h-2 rounded-full bg-white/10" />
                  </div>
                </div>
                <div className="bg-black/40 p-8 rounded-2xl border border-white/5 font-mono text-xs leading-relaxed text-muted-foreground/80 overflow-y-auto max-h-[400px]">
                  {selectedTemplate.content}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-center justify-center pt-8 border-t border-white/5">
                <Link href={`/propostas/nova?templateId=${selectedTemplate.id}`} className="w-full sm:w-auto">
                  <motion.button
                    whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(255,102,0,0.3)" }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full px-12 py-4 rounded-full bg-accent text-white text-[11px] uppercase tracking-[0.2em] font-bold"
                  >
                    Usar este Template
                  </motion.button>
                </Link>
                <button 
                  onClick={() => setSelectedTemplate(null)}
                  className="px-12 py-4 rounded-full border border-white/10 text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:bg-white/5 transition-colors"
                >
                  Voltar aos Templates
                </button>
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="noise-overlay" />
      
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 bg-background/20 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <Link href="/" className="font-display text-2xl font-bold tracking-tight group">
            FECHOU<span className="text-accent group-hover:italic transition-all">!</span>
          </Link>

          <div className="flex items-center gap-8">
            <Link href="/propostas" className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-accent transition-colors relative group">
              Propostas
              <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-accent group-hover:w-full transition-all duration-300" />
            </Link>
            <span className="text-[10px] uppercase tracking-[0.3em] text-foreground">Templates</span>
          </div>

          <div className="px-3 py-1 rounded-full border border-white/10 text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            {userPlan}
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-[1400px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mb-16">
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">Templates</p>
              <h1 className="font-display text-6xl md:text-8xl font-bold tracking-[-0.04em] text-reveal leading-[0.9] mb-6">
                Comece mais<br />rápido<span className="text-accent">.</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg">
                Templates profissionais prontos para você personalizar e enviar em minutos.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 mb-12">
              {categories.map((cat) => (
                <motion.button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`px-5 py-2 rounded-full text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${
                    activeCategory === cat 
                      ? "bg-accent text-white" 
                      : "border border-white/10 text-muted-foreground hover:border-accent/50 hover:text-accent"
                  }`}
                >
                  {cat}
                </motion.button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 md:grid-cols-3 gap-4">
              {filteredTemplates.map((template, i) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i, duration: 0.5 }}
                  whileHover={{ y: -4, borderColor: "rgba(255,102,0,0.3)" }}
                  onClick={() => setSelectedTemplate(template)}
                  className={`group p-6 rounded-2xl border border-white/5 bg-white/[0.02] transition-all duration-500 cursor-pointer relative ${
                    template.isPro && userPlan === "free" ? "opacity-60" : ""
                  }`}
                >
                  {template.isPro && userPlan === "free" && (
                    <div className="absolute top-4 right-4 px-2 py-1 rounded-full bg-white/10 text-[8px] uppercase tracking-[0.2em] text-muted-foreground">
                      pro
                    </div>
                  )}
                  
                  <div className="flex items-start justify-between mb-8">
                    <span className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground px-2 py-1 rounded-full border border-white/10">
                      {template.category}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {template.uses} usos
                    </span>
                  </div>

                  <h3 className="font-display text-xl font-semibold mb-3 group-hover:text-accent transition-colors">
                    {template.name}
                  </h3>
                  <p className="text-[12px] text-muted-foreground leading-relaxed mb-4">
                    {template.description}
                  </p>

                  <div className="space-y-4 mb-6">
                    <div>
                      <p className="text-[8px] uppercase tracking-[0.2em] text-accent mb-2">Cláusulas Chave</p>
                      <ul className="space-y-1">
                        {template.clauses.slice(0, 2).map((clause, idx) => (
                          <li key={idx} className="text-[10px] text-muted-foreground flex gap-2">
                            <span className="text-accent">•</span> {clause}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      Clique para detalhes
                    </span>
                    <span className="text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                      →
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            {userPlan === "free" && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-16 text-center"
              >
                <div className="inline-block p-8 rounded-2xl border border-white/5 bg-gradient-to-b from-accent/5 to-transparent">
                  <p className="font-display text-2xl font-semibold mb-2">Desbloqueie todos os templates</p>
                  <p className="text-muted-foreground text-sm mb-6">Acesso ilimitado a templates exclusivos no plano Pro</p>
                  <motion.button
                    whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(255,102,0,0.3)" }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-3 rounded-full bg-accent text-white text-[10px] uppercase tracking-[0.2em] font-medium"
                  >
                    Fazer Upgrade
                  </motion.button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
