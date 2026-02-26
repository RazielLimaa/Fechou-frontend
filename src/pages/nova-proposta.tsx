import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { createProposal } from "../service/proposals"; // ajuste o path se necessário

interface ProposalData {
  clientName: string;
  clientEmail: string;
  projectTitle: string;
  description: string;
  value: string;
  deadline: string;
  deliverables: string[];
  clauses: string[];
}

const mockTemplatesFull = [
  {
    id: "1",
    name: "Prestação de Serviços (Freelance)",
    category: "Web",
    description: "Ideal para desenvolvedores e designers.",
    clauses: [
      "DO OBJETO: O presente contrato tem por objeto a prestação de serviços de desenvolvimento e design, conforme as especificações detalhadas no escopo do projeto.",
      "DA PROPRIEDADE INTELECTUAL: Todos os direitos de propriedade intelectual sobre os produtos do serviço serão transferidos ao CONTRATANTE após o pagamento integral do valor acordado.",
      "DA CONFIDENCIALIDADE: As partes comprometem-se a manter sigilo absoluto sobre quaisquer informações técnicas ou comerciais trocadas durante a vigência deste contrato.",
      "DA RESCISÃO: O contrato poderá ser rescindido por qualquer uma das partes mediante aviso prévio por escrito de 15 dias, cabendo o pagamento proporcional pelos serviços realizados.",
    ],
  },
  {
    id: "14",
    name: "Landing Page de Alta Conversão",
    category: "Web",
    description: "Focado em performance e copy persuasiva.",
    clauses: [
      "DO DESENVOLVIMENTO: O CONTRATADO compromete-se a desenvolver uma landing page otimizada para conversão, incluindo copywriting e design responsivo.",
      "DOS ACESSOS: O CONTRATANTE deverá fornecer todos os acessos necessários (hospedagem, domínio, integrações) em até 48h após a assinatura.",
      "DA GARANTIA DE PERFORMANCE: O CONTRATADO garante o funcionamento técnico da página e a correta integração de pixels de rastreio conforme solicitado.",
      "DO PRAZO DE SUPORTE: Inclusos 30 dias de suporte técnico após a publicação para correção de eventuais bugs ou ajustes finos.",
    ],
  },
  {
    id: "2",
    name: "Gestão de Redes Sociais",
    category: "Marketing",
    description: "Focado em recorrência mensal.",
    clauses: [
      "DA GESTÃO DE CONTEÚDO: O serviço compreende a criação, agendamento e monitoramento de postagens conforme o cronograma mensal aprovado.",
      "DA APROVAÇÃO: O CONTRATANTE terá o prazo de 48 horas úteis para aprovar as artes e textos enviados, sob pena de adiamento da postagem.",
      "DOS RELATÓRIOS: Serão entregues relatórios de métricas (alcance, engajamento e crescimento) até o 5º dia útil do mês subsequente.",
      "DA VIGÊNCIA: Este contrato tem validade mensal, com renovação automática, salvo manifestação em contrário com 30 dias de antecedência.",
    ],
  },
  {
    id: "18",
    name: "Arquitetura - Interiores",
    category: "Design",
    description: "Modelo completo para reformas.",
    clauses: [
      "DO PROJETO: O objeto deste contrato é a elaboração de projeto executivo de interiores, contemplando planta baixa, detalhamento de marcenaria e iluminação.",
      "DAS VISITAS TÉCNICAS: Estão inclusas até 03 (três) visitas técnicas à obra para acompanhamento e verificação de conformidade com o projeto.",
      "DA RESPONSABILIDADE: O CONTRATADO é responsável pela RT (Registro Técnico) do projeto, não se responsabilizando por alterações executadas sem sua anuência.",
      "DAS REVISÕES: Estão inclusas 02 (duas) rodadas de alterações na fase de estudo preliminar, antes da finalização do projeto executivo.",
    ],
  },
];

// Aceita: "3500", "3.500", "3.500,00", "3500,00", "R$ 3.500,00"
function parseMoneyBRL(input: string): number {
  const cleaned = input
    .replace(/\s/g, "")
    .replace("R$", "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

export default function NovaProposta() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const [data, setData] = useState<ProposalData>({
    clientName: "",
    clientEmail: "",
    projectTitle: "",
    description: "",
    value: "",
    deadline: "",
    deliverables: [""],
    clauses: [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preencher cláusulas quando o template é selecionado
  useEffect(() => {
    if (!selectedTemplate) return;

    const template = mockTemplatesFull.find((t) => t.id === selectedTemplate);
    if (template) {
      setData((prev) => ({
        ...prev,
        projectTitle: template.name,
        description: template.description,
        clauses: [...template.clauses],
      }));
      return;
    }

    if (selectedTemplate === "blank") {
      setData((prev) => ({
        ...prev,
        projectTitle: "",
        description: "",
        clauses: [],
      }));
    }
  }, [selectedTemplate]);

  // Verificar se veio ID de template via URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const templateId = params.get("templateId");
    if (templateId) {
      setSelectedTemplate(templateId);
      setStep(2);
    }
  }, []);

  const updateField = (field: keyof ProposalData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const addDeliverable = () => {
    setData((prev) => ({ ...prev, deliverables: [...prev.deliverables, ""] }));
  };

  const updateDeliverable = (index: number, value: string) => {
    const newDeliverables = [...data.deliverables];
    newDeliverables[index] = value;
    setData((prev) => ({ ...prev, deliverables: newDeliverables }));
  };

  const canGoStep2 = useMemo(() => !!selectedTemplate, [selectedTemplate]);

  const canSubmit = useMemo(() => {
    const valueNum = parseMoneyBRL(data.value);
    return (
      data.clientName.trim().length >= 2 &&
      data.projectTitle.trim().length >= 2 &&
      data.description.trim().length >= 5 &&
      Number.isFinite(valueNum) &&
      valueNum > 0
    );
  }, [data.clientName, data.projectTitle, data.description, data.value]);

  const handleSubmit = async () => {
    setError(null);

    const token = localStorage.getItem("access_token");
    if (!token) {
      setLocation("/login");
      return;
    }

    const valueNum = parseMoneyBRL(data.value);
    if (!Number.isFinite(valueNum) || valueNum <= 0) {
      setError("Informe um valor válido (ex: 3500 ou 3.500,00).");
      return;
    }

    setIsSubmitting(true);
    try {
      await createProposal({
        title: data.projectTitle.trim(),
        clientName: data.clientName.trim(),
        description: data.description.trim(),
        value: valueNum,
      });

      // avisa o dashboard e volta
      window.dispatchEvent(new Event("proposals:changed"));
      setLocation("/propostas");
    } catch (e: any) {
      setError(e?.message ?? "Falha ao criar proposta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="noise-overlay" />

      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 bg-background/20 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <Link href="/" className="font-display text-2xl font-bold tracking-tight group">
            FECHOU<span className="text-accent group-hover:italic transition-all">!</span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Etapa {step} de 3
            </span>
            <div className="flex gap-1">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`w-8 h-1 rounded-full transition-all ${s <= step ? "bg-accent" : "bg-white/10"}`}
                />
              ))}
            </div>
          </div>

          <Link href="/propostas">
            <button className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-accent transition-colors">
              Cancelar
            </button>
          </Link>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-[800px] mx-auto">
          {error && (
            <div className="mb-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -40 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="mb-16">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">Etapa 1</p>
                  <h1 className="font-display text-5xl md:text-7xl font-bold tracking-[-0.04em] text-reveal leading-[0.9] mb-4">
                    Escolha um<br />template<span className="text-accent">.</span>
                  </h1>
                  <p className="text-muted-foreground">Ou comece do zero com uma proposta em branco.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
                  <motion.button
                    onClick={() => setSelectedTemplate("blank")}
                    whileHover={{ scale: 1.02, borderColor: "rgba(255,102,0,0.3)" }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-8 rounded-2xl border text-left transition-all duration-300 ${
                      selectedTemplate === "blank"
                        ? "border-accent bg-accent/5"
                        : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
                    }`}
                  >
                    <p className="font-display text-xl font-semibold mb-2">Em Branco</p>
                    <p className="text-[11px] text-muted-foreground">Comece do zero</p>
                  </motion.button>

                  {mockTemplatesFull.map((template) => (
                    <motion.button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      whileHover={{ scale: 1.02, borderColor: "rgba(255,102,0,0.3)" }}
                      whileTap={{ scale: 0.98 }}
                      className={`p-8 rounded-2xl border text-left transition-all duration-300 ${
                        selectedTemplate === template.id
                          ? "border-accent bg-accent/5"
                          : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
                      }`}
                    >
                      <p className="font-display text-xl font-semibold mb-2">{template.name}</p>
                      <p className="text-[11px] text-muted-foreground">{template.description}</p>
                    </motion.button>
                  ))}
                </div>

                <motion.button
                  onClick={() => canGoStep2 && setStep(2)}
                  disabled={!canGoStep2}
                  whileHover={{ scale: canGoStep2 ? 1.02 : 1, boxShadow: canGoStep2 ? "0 0 40px rgba(255,102,0,0.3)" : "none" }}
                  whileTap={{ scale: canGoStep2 ? 0.98 : 1 }}
                  className={`w-full py-4 rounded-full text-[10px] uppercase tracking-[0.2em] font-medium transition-all ${
                    canGoStep2 ? "bg-accent text-white" : "bg-white/5 text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  Continuar
                </motion.button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -40 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="mb-16">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">Etapa 2</p>
                  <h1 className="font-display text-5xl md:text-7xl font-bold tracking-[-0.04em] text-reveal leading-[0.9] mb-4">
                    Detalhes do<br />projeto<span className="text-accent">.</span>
                  </h1>
                </div>

                <div className="space-y-6 mb-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-2 block">
                        Cliente
                      </label>
                      <input
                        type="text"
                        value={data.clientName}
                        onChange={(e) => updateField("clientName", e.target.value)}
                        placeholder="Nome do cliente"
                        className="w-full px-4 py-3 bg-white/[0.02] border border-white/5 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-2 block">
                        Email
                      </label>
                      <input
                        type="email"
                        value={data.clientEmail}
                        onChange={(e) => updateField("clientEmail", e.target.value)}
                        placeholder="email@cliente.com"
                        className="w-full px-4 py-3 bg-white/[0.02] border border-white/5 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent/50 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-2 block">
                      Título do Projeto
                    </label>
                    <input
                      type="text"
                      value={data.projectTitle}
                      onChange={(e) => updateField("projectTitle", e.target.value)}
                      placeholder="Ex: Desenvolvimento de Landing Page"
                      className="w-full px-4 py-3 bg-white/[0.02] border border-white/5 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-2 block">
                      Descrição
                    </label>
                    <textarea
                      value={data.description}
                      onChange={(e) => updateField("description", e.target.value)}
                      placeholder="Descreva o escopo do projeto..."
                      rows={4}
                      className="w-full px-4 py-3 bg-white/[0.02] border border-white/5 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent/50 transition-colors resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-2 block">
                      Cláusulas do Contrato
                    </label>
                    <div className="space-y-3">
                      {data.clauses.map((clause, index) => (
                        <div key={index} className="p-4 bg-white/[0.01] border border-white/5 rounded-xl">
                          <p className="text-[12px] text-muted-foreground leading-relaxed">{clause}</p>
                        </div>
                      ))}
                      {data.clauses.length === 0 && (
                        <p className="text-[12px] text-muted-foreground italic p-4 border border-dashed border-white/10 rounded-xl">
                          Nenhuma cláusula automática definida para este template.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep(1)}
                    className="px-8 py-4 rounded-full border border-white/10 text-[10px] uppercase tracking-[0.2em] hover:bg-white/5 transition-colors"
                  >
                    Voltar
                  </button>
                  <motion.button
                    onClick={() => setStep(3)}
                    whileHover={{ scale: 1.02, boxShadow: "0 0 40px rgba(255,102,0,0.3)" }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 py-4 rounded-full bg-accent text-white text-[10px] uppercase tracking-[0.2em] font-medium"
                  >
                    Continuar
                  </motion.button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -40 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="mb-16">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">Etapa 3</p>
                  <h1 className="font-display text-5xl md:text-7xl font-bold tracking-[-0.04em] text-reveal leading-[0.9] mb-4">
                    Valor e<br />prazo<span className="text-accent">.</span>
                  </h1>
                </div>

                <div className="space-y-6 mb-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-2 block">
                        Valor Total
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                        <input
                          type="text"
                          value={data.value}
                          onChange={(e) => updateField("value", e.target.value)}
                          placeholder="0,00"
                          className="w-full pl-12 pr-4 py-3 bg-white/[0.02] border border-white/5 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent/50 transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-2 block">
                        Prazo de Entrega
                      </label>
                      <input
                        type="text"
                        value={data.deadline}
                        onChange={(e) => updateField("deadline", e.target.value)}
                        placeholder="Ex: 15 dias úteis"
                        className="w-full px-4 py-3 bg-white/[0.02] border border-white/5 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent/50 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
                    <p className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-4">
                      Resumo da Proposta
                    </p>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cliente</span>
                        <span>{data.clientName || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Projeto</span>
                        <span>{data.projectTitle || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Entregas</span>
                        <span>{data.deliverables.filter((d) => d).length} itens</span>
                      </div>
                      <div className="pt-3 border-t border-white/5 flex justify-between">
                        <span className="font-medium">Valor Total</span>
                        <span className="font-display text-xl font-bold text-accent">
                          {data.value ? `R$ ${data.value}` : "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {!canSubmit && (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-xs text-muted-foreground">
                      Preencha <b>Cliente</b>, <b>Título</b>, <b>Descrição</b> e um <b>Valor</b> válido para criar a proposta.
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep(2)}
                    className="px-8 py-4 rounded-full border border-white/10 text-[10px] uppercase tracking-[0.2em] hover:bg-white/5 transition-colors"
                    disabled={isSubmitting}
                  >
                    Voltar
                  </button>

                  <motion.button
                    onClick={handleSubmit}
                    disabled={!canSubmit || isSubmitting}
                    whileHover={{ scale: !canSubmit || isSubmitting ? 1 : 1.02, boxShadow: !canSubmit || isSubmitting ? "none" : "0 0 60px rgba(255,102,0,0.4)" }}
                    whileTap={{ scale: !canSubmit || isSubmitting ? 1 : 0.98 }}
                    className={`flex-1 py-4 rounded-full text-[10px] uppercase tracking-[0.2em] font-medium transition-all ${
                      !canSubmit || isSubmitting
                        ? "bg-white/5 text-muted-foreground cursor-not-allowed"
                        : "bg-accent text-white"
                    }`}
                  >
                    {isSubmitting ? "Criando..." : "Criar Proposta"}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
