import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Loader2, Check, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  createContract,
  type ContractType,
  type PaymentForm,
  CONTRACT_TYPE_LABELS,
} from "../../service/contracts";

// ─── tipos de contrato expandidos ───────────────────────────────────────────

const CONTRACT_TYPES: { value: ContractType; label: string; icon: string; desc: string }[] = [
  { value: "prestacao_servicos", label: "Prestação de Serviços",   icon: "◈", desc: "Serviços gerais e profissionais" },
  { value: "desenvolvimento",    label: "Desenvolvimento",          icon: "⌨", desc: "Software, apps e sistemas" },
  { value: "design",             label: "Design",                   icon: "◉", desc: "UI/UX, branding e visual" },
  { value: "marketing",          label: "Marketing",                icon: "◎", desc: "Conteúdo, tráfego e mídia" },
  { value: "consultoria",        label: "Consultoria",              icon: "◑", desc: "Mentoria e estratégia" },
  { value: "fotografia",         label: "Fotografia",               icon: "◷", desc: "Fotos, ensaios e eventos" },
  { value: "video",              label: "Produção de Vídeo",        icon: "▷", desc: "Edição, filmagem e motion" },
  { value: "redacao",            label: "Redação / Copy",           icon: "✦", desc: "Textos, roteiros e artigos" },
  { value: "educacao",           label: "Educação / Mentoria",      icon: "◆", desc: "Cursos, aulas e coaching" },
  { value: "outro",              label: "Outro",                    icon: "◦", desc: "Tipo personalizado" },
];

// ─── steps ────────────────────────────────────────────────────────────────────

const STEPS = ["Tipo", "Cliente", "Valores", "Escopo"];

export default function NovoContratoPage() {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);

  const [form, setForm] = useState({
    clientName:       "",
    clientProfession: "",
    contractType:     "" as ContractType,
    executionDate:    "",
    value:            "",
    paymentForm:      "pix" as PaymentForm,
    scope:            "",
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm(f => ({ ...f, [key]: value }));

  // validação por step
  const canNext = () => {
    if (step === 0) return !!form.contractType;
    if (step === 1) return form.clientName.trim().length >= 2;
    if (step === 2) return !!form.value.trim() && !!form.executionDate;
    if (step === 3) return form.scope.trim().length >= 5;
    return false;
  };

  const handleSubmit = async () => {
    if (!canNext()) return;
    setLoading(true);
    try {
      const result = await createContract(form);
      toast.success("Contrato criado! Abrindo editor...");
      navigate(`/contratos/${result.contractId}/editor`);
    } catch {
      toast.error("Erro ao criar contrato. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const next = () => {
    if (!canNext()) { toast.error("Preencha o campo antes de continuar."); return; }
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else handleSubmit();
  };

  const prev = () => { if (step > 0) setStep(s => s - 1); };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div
      className="min-h-screen text-white flex flex-col"
      style={{
        background: "#09090b",
        fontFamily: "'DM Sans', 'Inter', sans-serif",
      }}
    >
      {/* noise texture */}
      <div className="noise-overlay" />

      {/* grade decorativa de fundo */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: `
          linear-gradient(rgba(255,102,0,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,102,0,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "48px 48px",
      }} />

      {/* brilho laranja difuso no topo */}
      <div style={{
        position: "fixed", top: -200, left: "50%", transform: "translateX(-50%)",
        width: 600, height: 400,
        background: "radial-gradient(ellipse, rgba(255,102,0,0.12) 0%, transparent 70%)",
        zIndex: 0, pointerEvents: "none",
      }} />

      {/* header */}
      <header
        className="relative z-10 flex items-center justify-between px-8 py-5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <Link href="/contratos">
          <button className="flex items-center gap-2 text-sm transition-colors"
            style={{ color: "rgba(255,255,255,0.45)" }}
            onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.8)"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.45)"}
          >
            <ArrowLeft size={14} /> Contratos
          </button>
        </Link>

        <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em", color: "#fff" }}>
          FECHOU<span style={{ color: "#ff6600" }}>!</span>
        </div>

        {/* steps */}
        <div className="flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              <button
                onClick={() => i < step && setStep(i)}
                style={{
                  fontSize: 11, fontWeight: 600,
                  padding: "3px 10px", borderRadius: 999,
                  cursor: i < step ? "pointer" : "default",
                  transition: "all 0.2s",
                  background: i === step
                    ? "rgba(255,102,0,0.15)"
                    : i < step
                    ? "rgba(255,102,0,0.08)"
                    : "transparent",
                  border: i === step
                    ? "1px solid rgba(255,102,0,0.4)"
                    : i < step
                    ? "1px solid rgba(255,102,0,0.2)"
                    : "1px solid rgba(255,255,255,0.08)",
                  color: i === step ? "#ff6600" : i < step ? "rgba(255,102,0,0.6)" : "rgba(255,255,255,0.25)",
                }}
              >
                {i < step ? <Check size={9} style={{ display: "inline" }} /> : i + 1} {s}
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight size={10} style={{ color: "rgba(255,255,255,0.15)" }} />
              )}
            </div>
          ))}
        </div>
      </header>

      {/* barra de progresso */}
      <div style={{ height: 2, background: "rgba(255,255,255,0.04)", position: "relative", zIndex: 10 }}>
        <motion.div
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          style={{ height: "100%", background: "#ff6600" }}
        />
      </div>

      {/* conteúdo principal */}
      <main className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
        <div style={{ width: "100%", maxWidth: 680 }}>

          <AnimatePresence mode="wait">

            {/* ── STEP 0: Tipo de contrato ────────────────────────────────── */}
            {step === 0 && (
              <motion.div key="step0"
                initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.22 }}
              >
                <div className="mb-8">
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "#ff6600", marginBottom: 10 }}>
                    Passo 1 de 4
                  </p>
                  <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, color: "#fff" }}>
                    Qual tipo de<br />contrato?
                  </h2>
                  <p style={{ marginTop: 10, fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
                    Escolha o tipo que melhor descreve o serviço prestado.
                  </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {CONTRACT_TYPES.map(ct => {
                    const selected = form.contractType === ct.value;
                    return (
                      <motion.button
                        key={ct.value}
                        onClick={() => set("contractType", ct.value)}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "14px 16px", borderRadius: 14, textAlign: "left",
                          cursor: "pointer", transition: "all 0.15s",
                          background: selected ? "rgba(255,102,0,0.1)" : "rgba(255,255,255,0.03)",
                          border: selected ? "1.5px solid rgba(255,102,0,0.5)" : "1.5px solid rgba(255,255,255,0.07)",
                        }}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 18,
                          background: selected ? "rgba(255,102,0,0.15)" : "rgba(255,255,255,0.05)",
                          border: selected ? "1px solid rgba(255,102,0,0.3)" : "1px solid rgba(255,255,255,0.06)",
                          color: selected ? "#ff6600" : "rgba(255,255,255,0.4)",
                        }}>
                          {ct.icon}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: selected ? "#fff" : "rgba(255,255,255,0.7)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {ct.label}
                          </p>
                          <p style={{ fontSize: 11, color: selected ? "rgba(255,102,0,0.7)" : "rgba(255,255,255,0.28)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {ct.desc}
                          </p>
                        </div>
                        {selected && (
                          <div style={{ marginLeft: "auto", flexShrink: 0 }}>
                            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#ff6600", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Check size={10} color="#fff" />
                            </div>
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ── STEP 1: Cliente ──────────────────────────────────────────── */}
            {step === 1 && (
              <motion.div key="step1"
                initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.22 }}
              >
                <div className="mb-10">
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "#ff6600", marginBottom: 10 }}>
                    Passo 2 de 4
                  </p>
                  <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, color: "#fff" }}>
                    Quem é o<br />seu cliente?
                  </h2>
                  <p style={{ marginTop: 10, fontSize: 14, color: "rgba(255,255,255,0.4)" }}>
                    Dados da pessoa ou empresa que vai assinar o contrato.
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>
                      Nome completo <span style={{ color: "#ff6600" }}>*</span>
                    </label>
                    <input
                      autoFocus
                      value={form.clientName}
                      onChange={e => set("clientName", e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") next(); }}
                      placeholder="Ex: Maria Silva"
                      style={{
                        width: "100%", padding: "14px 16px", borderRadius: 12,
                        background: "rgba(255,255,255,0.04)",
                        border: "1.5px solid rgba(255,255,255,0.1)",
                        color: "#fff", fontSize: 15, outline: "none",
                        transition: "border-color 0.15s",
                      }}
                      onFocus={e => { e.target.style.borderColor = "rgba(255,102,0,0.5)"; }}
                      onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>
                      Profissão / Empresa
                    </label>
                    <input
                      value={form.clientProfession}
                      onChange={e => set("clientProfession", e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") next(); }}
                      placeholder="Ex: Designer Gráfico ou Acme Ltda."
                      style={{
                        width: "100%", padding: "14px 16px", borderRadius: 12,
                        background: "rgba(255,255,255,0.04)",
                        border: "1.5px solid rgba(255,255,255,0.1)",
                        color: "#fff", fontSize: 15, outline: "none",
                        transition: "border-color 0.15s",
                      }}
                      onFocus={e => { e.target.style.borderColor = "rgba(255,102,0,0.5)"; }}
                      onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
                    />
                  </div>

                  {/* preview do tipo selecionado */}
                  <div style={{
                    marginTop: 8, padding: "12px 16px", borderRadius: 12,
                    background: "rgba(255,102,0,0.06)",
                    border: "1px solid rgba(255,102,0,0.15)",
                    display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <span style={{ fontSize: 20 }}>
                      {CONTRACT_TYPES.find(c => c.value === form.contractType)?.icon}
                    </span>
                    <div>
                      <p style={{ fontSize: 11, color: "rgba(255,102,0,0.6)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>Tipo selecionado</p>
                      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 1 }}>
                        {CONTRACT_TYPES.find(c => c.value === form.contractType)?.label}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── STEP 2: Valores ──────────────────────────────────────────── */}
            {step === 2 && (
              <motion.div key="step2"
                initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.22 }}
              >
                <div className="mb-10">
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "#ff6600", marginBottom: 10 }}>
                    Passo 3 de 4
                  </p>
                  <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, color: "#fff" }}>
                    Quanto e<br />quando?
                  </h2>
                  <p style={{ marginTop: 10, fontSize: 14, color: "rgba(255,255,255,0.4)" }}>
                    Valor do contrato e data prevista de execução.
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* valor */}
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>
                      Valor do contrato <span style={{ color: "#ff6600" }}>*</span>
                    </label>
                    <div style={{ position: "relative" }}>
                      <span style={{
                        position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
                        fontSize: 14, fontWeight: 700, color: "#ff6600",
                      }}>
                        R$
                      </span>
                      <input
                        autoFocus
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.value}
                        onChange={e => set("value", e.target.value)}
                        placeholder="0,00"
                        style={{
                          width: "100%", padding: "14px 16px 14px 44px", borderRadius: 12,
                          background: "rgba(255,255,255,0.04)",
                          border: "1.5px solid rgba(255,255,255,0.1)",
                          color: "#fff", fontSize: 22, fontWeight: 700, outline: "none",
                          transition: "border-color 0.15s",
                        }}
                        onFocus={e => { e.target.style.borderColor = "rgba(255,102,0,0.5)"; }}
                        onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
                      />
                    </div>
                  </div>

                  {/* data */}
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>
                      Data de execução <span style={{ color: "#ff6600" }}>*</span>
                    </label>
                    <input
                      type="date"
                      value={form.executionDate}
                      onChange={e => set("executionDate", e.target.value)}
                      style={{
                        width: "100%", padding: "14px 16px", borderRadius: 12,
                        background: "rgba(255,255,255,0.04)",
                        border: "1.5px solid rgba(255,255,255,0.1)",
                        color: "#fff", fontSize: 15, outline: "none",
                        transition: "border-color 0.15s",
                        colorScheme: "dark",
                      }}
                      onFocus={e => { e.target.style.borderColor = "rgba(255,102,0,0.5)"; }}
                      onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
                    />
                  </div>

                  {/* pagamento — só PIX */}
                  <div style={{
                    padding: "14px 16px", borderRadius: 12,
                    background: "rgba(255,102,0,0.06)",
                    border: "1.5px solid rgba(255,102,0,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: "rgba(255,102,0,0.15)", border: "1px solid rgba(255,102,0,0.3)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16, fontWeight: 900, color: "#ff6600",
                      }}>
                        ₽
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>PIX</p>
                        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Único método disponível</p>
                      </div>
                    </div>
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%", background: "#ff6600",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Check size={11} color="#fff" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: Escopo ───────────────────────────────────────────── */}
            {step === 3 && (
              <motion.div key="step3"
                initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.22 }}
              >
                <div className="mb-10">
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "#ff6600", marginBottom: 10 }}>
                    Passo 4 de 4 · Último!
                  </p>
                  <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, color: "#fff" }}>
                    O que será<br />entregue?
                  </h2>
                  <p style={{ marginTop: 10, fontSize: 14, color: "rgba(255,255,255,0.4)" }}>
                    Descreva detalhadamente o escopo do serviço.
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>
                      Escopo do serviço <span style={{ color: "#ff6600" }}>*</span>
                    </label>
                    <textarea
                      autoFocus
                      value={form.scope}
                      onChange={e => set("scope", e.target.value)}
                      placeholder="Ex: Desenvolvimento de landing page responsiva com até 5 seções, integração com formulário de contato, entrega em 15 dias úteis..."
                      rows={6}
                      style={{
                        width: "100%", padding: "14px 16px", borderRadius: 12,
                        background: "rgba(255,255,255,0.04)",
                        border: "1.5px solid rgba(255,255,255,0.1)",
                        color: "#fff", fontSize: 14, lineHeight: 1.7,
                        outline: "none", resize: "none",
                        transition: "border-color 0.15s",
                        fontFamily: "inherit",
                      }}
                      onFocus={e => { e.target.style.borderColor = "rgba(255,102,0,0.5)"; }}
                      onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
                    />
                    <p style={{ marginTop: 6, fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "right" }}>
                      {form.scope.length} caracteres
                    </p>
                  </div>

                  {/* resumo */}
                  <div style={{
                    padding: "14px 16px", borderRadius: 12,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(255,255,255,0.25)", marginBottom: 10 }}>
                      Resumo do contrato
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {[
                        { label: "Tipo", value: CONTRACT_TYPES.find(c => c.value === form.contractType)?.label },
                        { label: "Cliente", value: form.clientName || "—" },
                        { label: "Valor", value: form.value ? `R$ ${parseFloat(form.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—" },
                        { label: "Data", value: form.executionDate ? new Date(form.executionDate + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : "—" },
                        { label: "Pagamento", value: "PIX" },
                      ].map(item => (
                        <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{item.label}</span>
                          <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.65)" }}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

          {/* ── navegação ─────────────────────────────────────────────────── */}
          <div style={{ display: "flex", gap: 10, marginTop: 32 }}>
            {step > 0 && (
              <button
                onClick={prev}
                style={{
                  padding: "14px 20px", borderRadius: 12,
                  background: "rgba(255,255,255,0.05)",
                  border: "1.5px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: 500,
                  cursor: "pointer", transition: "all 0.15s",
                  display: "flex", alignItems: "center", gap: 6,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
              >
                <ArrowLeft size={14} /> Voltar
              </button>
            )}

            <motion.button
              onClick={next}
              disabled={!canNext() || loading}
              whileHover={canNext() && !loading ? { scale: 1.01 } : {}}
              whileTap={canNext() && !loading ? { scale: 0.99 } : {}}
              style={{
                flex: 1, padding: "14px 24px", borderRadius: 12,
                background: canNext() ? "#ff6600" : "rgba(255,102,0,0.2)",
                border: "none", color: canNext() ? "#fff" : "rgba(255,255,255,0.3)",
                fontSize: 14, fontWeight: 700, cursor: canNext() ? "pointer" : "not-allowed",
                transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                letterSpacing: "-0.01em",
              }}
            >
              {loading ? (
                <><Loader2 size={15} className="animate-spin" /> Criando contrato...</>
              ) : step === STEPS.length - 1 ? (
                <>Criar contrato e ir para o editor <ArrowRight size={15} /></>
              ) : (
                <>Continuar <ArrowRight size={15} /></>
              )}
            </motion.button>
          </div>

        </div>
      </main>
    </div>
  );
}