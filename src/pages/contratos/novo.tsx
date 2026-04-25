import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { AlertTriangle, ArrowLeft, ArrowRight, FileText, Loader2, Check, ChevronRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  createContract,
  type ContractType,
  type PaymentForm,
} from "../../service/contracts";
import { getFriendlyApiErrorMessage } from "../../lib/api/errors";
import { runMccAutoGenerate, type MccAutoGenerateResult } from "../../lib/api/mcc";
import {
  CUSTOM_CLAUSE_COUNT_OPTIONS,
  DEFAULT_CLAUSE_MODE,
  DEFAULT_TARGET_CLAUSE_COUNT,
  LEGAL_CLAUSE_COMPLETENESS_OPTIONS,
  PARTY_QUALIFICATION_FIELDS,
  normalizeAutoGeneratePayload,
} from "../../lib/legal-contracts";
import type { AutoGenerateContractPayload, LegalContractModel } from "../../types/legal-contracts";

// ─── tipos de contrato expandidos ───────────────────────────────────────────

const CONTRACT_TYPES: { value: ContractType; label: string; icon: string; desc: string }[] = [
  { value: "prestacao_servicos", label: "Prestação de Serviços",   icon: "◈", desc: "Serviços gerais e profissionais" },
  { value: "desenvolvimento",    label: "Desenvolvimento",          icon: "⌨", desc: "Software, apps e sistemas" },
  { value: "design",             label: "Design",                   icon: "◉", desc: "UI/UX, branding e visual" },
  { value: "marketing",          label: "Marketing",                icon: "◎", desc: "Conteúdo, tráfego e mídia" },
  { value: "consultoria",        label: "Consultoria",              icon: "◑", desc: "Mentoria e estratégia" },
  { value: "outro",              label: "Outro",                    icon: "◦", desc: "Tipo personalizado" },
];

// ─── steps ────────────────────────────────────────────────────────────────────

const STEPS = ["Tipo", "Cliente", "Valores", "Escopo", "Inteligencia"];

type SmartSection = "partes" | "contexto" | "dados" | "operacao" | "prova";
type CreationResult = {
  contractId: number;
  generated?: MccAutoGenerateResult;
  generationError?: string;
};

const SMART_SECTIONS: Array<{ value: SmartSection; label: string }> = [
  { value: "partes", label: "Partes" },
  { value: "contexto", label: "Contexto" },
  { value: "dados", label: "Dados e IP" },
  { value: "operacao", label: "Operacao" },
  { value: "prova", label: "Prova" },
];

const AUDIENCE_OPTIONS: Array<{ value: "b2b" | "b2c"; label: string; hint: string }> = [
  { value: "b2b", label: "B2B", hint: "Empresa com empresa." },
  { value: "b2c", label: "B2C", hint: "Cliente final consumidor." },
];

const MODEL_OPTIONS: Array<{ value: LegalContractModel; label: string }> = [
  { value: "saas", label: "SaaS" },
  { value: "projeto", label: "Projeto" },
  { value: "servico_continuado", label: "Servico continuado" },
];

const AUTH_METHODS = [
  { value: "email", label: "E-mail" },
  { value: "ip", label: "IP" },
  { value: "timestamp", label: "Timestamp" },
  { value: "aceite_eletronico", label: "Aceite eletronico" },
  { value: "assinatura_eletronica", label: "Assinatura eletronica" },
  { value: "certificado_digital", label: "Certificado digital" },
];

export default function NovoContratoPage() {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [smartEnabled, setSmartEnabled] = useState(true);
  const [smartSection, setSmartSection] = useState<SmartSection>("partes");
  const [usesSubprocessors, setUsesSubprocessors] = useState(false);
  const [creationResult, setCreationResult] = useState<CreationResult | null>(null);

  const [form, setForm] = useState({
    clientName:       "",
    clientProfession: "",
    contractType:     "" as ContractType,
    executionDate:    "",
    value:            "",
    paymentForm:      "pix" as PaymentForm,
    scope:            "",
  });

  const [mccContext, setMccContext] = useState<AutoGenerateContractPayload>({
    riskLevel: "medio",
    clauseMode: DEFAULT_CLAUSE_MODE,
    targetClauseCount: DEFAULT_TARGET_CLAUSE_COUNT,
    replaceExisting: true,
    authenticationMethods: ["email", "ip", "timestamp", "aceite_eletronico"],
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm(f => ({ ...f, [key]: value }));

  const patchMcc = (patch: Partial<AutoGenerateContractPayload>) =>
    setMccContext((current) => ({ ...current, ...patch }));

  const toggleModel = (model: LegalContractModel) => {
    setMccContext((current) => {
      const models = current.contractModels ?? [];
      return {
        ...current,
        contractModels: models.includes(model)
          ? models.filter((item) => item !== model)
          : [...models, model],
      };
    });
  };

  const toggleAuthMethod = (method: string) => {
    setMccContext((current) => {
      const methods = current.authenticationMethods ?? [];
      return {
        ...current,
        authenticationMethods: methods.includes(method)
          ? methods.filter((item) => item !== method)
          : [...methods, method],
      };
    });
  };

  const selectClauseMode = (
    clauseMode: NonNullable<AutoGenerateContractPayload["clauseMode"]>,
    targetClauseCount?: number,
  ) => {
    patchMcc({
      clauseMode,
      targetClauseCount: targetClauseCount ?? (
        clauseMode === "custom"
          ? mccContext.targetClauseCount ?? DEFAULT_TARGET_CLAUSE_COUNT
          : LEGAL_CLAUSE_COMPLETENESS_OPTIONS.find((option) => option.value === clauseMode)?.targetClauseCount
      ),
    });
  };

  const buildMccPayload = (): AutoGenerateContractPayload => {
    const payload: AutoGenerateContractPayload = { ...mccContext, replaceExisting: true };
    if (usesSubprocessors && !payload.subprocessorSummary?.trim()) {
      payload.subprocessorSummary = "Ha subprocessadores ou terceiros de apoio.";
    }
    return normalizeAutoGeneratePayload(payload);
  };

  // validação por step
  const canNext = () => {
    if (step === 0) return !!form.contractType;
    if (step === 1) return form.clientName.trim().length >= 2;
    if (step === 2) return !!form.value.trim() && !!form.executionDate;
    if (step === 3) return form.scope.trim().length >= 5;
    if (step === 4) return true;
    return false;
  };

  const handleSubmit = async () => {
    if (!canNext()) return;
    setLoading(true);
    setCreationResult(null);
    try {
      const result = await createContract({
        ...form,
        autoApplySuggestions: false,
      });

      if (!smartEnabled) {
        toast.success("Contrato criado! Abrindo editor...");
        navigate(`/contratos/${result.contractId}/editor`);
        return;
      }

      try {
        const generated = await runMccAutoGenerate(result.contractId, buildMccPayload());
        setCreationResult({ contractId: result.contractId, generated });
        toast.success("Contrato criado e modelagem inteligente gerada.");
      } catch (error) {
        const message = getFriendlyApiErrorMessage(
          error,
          "Contrato criado, mas nao foi possivel gerar a modelagem inteligente.",
        );
        setCreationResult({ contractId: result.contractId, generationError: message });
        toast.error(message);
      }
    } catch (error) {
      toast.error(getFriendlyApiErrorMessage(error, "Erro ao criar contrato. Tente novamente."));
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

  if (creationResult) {
    const generated = creationResult.generated;
    return (
      <div className="min-h-screen bg-[#09090b] text-white">
        <div className="noise-overlay" />
        <div style={{
          position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          backgroundImage: `
            linear-gradient(rgba(255,102,0,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,102,0,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }} />

        <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-8 sm:px-8">
          <div className="mb-8 flex items-center justify-between gap-4">
            <Link href="/contratos">
              <button className="flex items-center gap-2 text-sm text-white/45 transition-colors hover:text-white/80">
                <ArrowLeft size={14} /> Contratos
              </button>
            </Link>
            <button
              onClick={() => navigate(`/contratos/${creationResult.contractId}/editor`)}
              className="rounded-xl bg-[#ff6600] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#e45c00]"
            >
              Abrir editor
            </button>
          </div>

          <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.35)] sm:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#ff6600]">
                  Contrato #{String(creationResult.contractId).padStart(4, "0")}
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-white">
                  {generated ? "Modelagem inteligente pronta" : "Contrato criado"}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/48">
                  {generated
                    ? "Revise alertas, clausulas e texto consolidado antes de assinar ou enviar."
                    : "O contrato foi criado. Voce pode completar a modelagem inteligente no editor."}
                </p>
              </div>
              <div className="rounded-2xl border border-[#ff6600]/25 bg-[#ff6600]/10 px-4 py-3 text-sm text-[#ffb07a]">
                Revisao humana recomendada
              </div>
            </div>

            {creationResult.generationError && (
              <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-200">
                {creationResult.generationError}
              </div>
            )}

            {generated && Boolean(generated.raw.missingTemplateFields?.length) && (
              <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="text-sm font-bold text-amber-100">Faltam dados das partes para completar o contrato.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {generated.raw.missingTemplateFields?.map((field) => (
                    <div key={field.key} className="rounded-xl border border-amber-500/20 bg-black/12 px-3 py-2">
                      <p className="text-sm font-semibold text-amber-100">{field.label}</p>
                      <p className="mt-1 text-xs leading-5 text-amber-100/70">{field.helperText}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {generated && mccContext.targetClauseCount && generated.raw.clauses.length > mccContext.targetClauseCount && (
              <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
                Para este caso, o minimo recomendado ficou acima do limite escolhido. O backend manteve as clausulas essenciais e retornou {generated.raw.clauses.length} clausulas.
              </div>
            )}

            {generated && (
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <section className="rounded-2xl border border-white/10 bg-black/18 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-white">Warnings</p>
                      <p className="text-xs text-white/36">Pontos de atencao retornados pelo backend.</p>
                    </div>
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">
                      {generated.raw.warnings.length}
                    </span>
                  </div>
                  {generated.raw.warnings.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white/42">
                      Nenhum warning retornado para este contexto.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {generated.raw.warnings.map((warning, index) => (
                        <article key={warning.code ?? warning.title ?? index} className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-3">
                          <p className="text-sm font-semibold text-amber-100">{warning.title ?? warning.message ?? "Ponto de atencao"}</p>
                          {warning.title && warning.message && <p className="mt-1 text-xs leading-5 text-amber-100/70">{warning.message}</p>}
                          {warning.recommendation && <p className="mt-2 text-xs leading-5 text-white/48">{warning.recommendation}</p>}
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-white/10 bg-black/18 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-white">Clausulas selecionadas</p>
                      <p className="text-xs text-white/36">Ordenadas pelo motor para revisao.</p>
                    </div>
                    <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-xs text-sky-200">
                      {generated.raw.clauses.length}
                    </span>
                  </div>
                  <div className="max-h-[320px] space-y-2 overflow-auto pr-1">
                    {generated.raw.clauses.map((clause) => (
                      <article key={`${clause.id}-${clause.orderIndex}`} className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[11px] text-white/34">#{clause.orderIndex + 1} {clause.slug}</p>
                            <p className="mt-1 text-sm font-semibold text-white">{clause.title}</p>
                          </div>
                          <div className="flex shrink-0 flex-col gap-1 text-right">
                            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200">
                              {clause.required ? "Obrigatoria" : "Opcional"}
                            </span>
                            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-200">
                              {clause.riskLevel}
                            </span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-white/10 bg-black/18 p-4 lg:col-span-2">
                  <div className="mb-3 flex items-center gap-2">
                    <FileText size={15} className="text-[#ff9a57]" />
                    <p className="text-sm font-bold text-white">Texto consolidado</p>
                  </div>
                  <div className="max-h-[360px] overflow-auto rounded-xl border border-white/10 bg-white/[0.035] p-4">
                    <pre className="whitespace-pre-wrap text-sm leading-6 text-white/72">{generated.raw.contractText}</pre>
                  </div>
                </section>
              </div>
            )}
          </section>
        </main>
      </div>
    );
  }

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
        className="relative z-10 flex flex-col gap-4 px-5 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between"
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
        <div className="flex w-full flex-wrap items-center justify-center gap-1.5 lg:w-auto lg:justify-end">
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
                <ChevronRight size={10} className="hidden sm:block" style={{ color: "rgba(255,255,255,0.15)" }} />
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
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <div style={{ width: "100%", maxWidth: step === 4 ? 920 : 680 }}>

          <AnimatePresence mode="wait">

            {/* ── STEP 0: Tipo de contrato ────────────────────────────────── */}
            {step === 0 && (
              <motion.div key="step0"
                initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.22 }}
              >
                <div className="mb-8">
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "#ff6600", marginBottom: 10 }}>
                    Passo 1 de 5
                  </p>
                  <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, color: "#fff" }}>
                    Qual tipo de<br />contrato?
                  </h2>
                  <p style={{ marginTop: 10, fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
                    Escolha o tipo que melhor descreve o serviço prestado.
                  </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
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
                    Passo 2 de 5
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
                    Passo 3 de 5
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
                    Passo 4 de 5
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

                  <div style={{
                    padding: "12px 16px",
                    borderRadius: 12,
                    background: "rgba(255,102,0,0.06)",
                    border: "1px solid rgba(255,102,0,0.18)",
                  }}>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.72)", lineHeight: 1.6 }}>
                      O proximo passo e opcional: ele ajuda o MCC a escolher clausulas melhores e mostrar pontos de atencao.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4"
                initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.22 }}
              >
                <div className="mb-8">
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "#ff6600", marginBottom: 10 }}>
                    Passo 5 de 5 opcional
                  </p>
                  <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, color: "#fff" }}>
                    Contexto<br />inteligente
                  </h2>
                  <p style={{ marginTop: 10, fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
                    Responda so o que souber. O contrato tambem pode ser criado sem preencher esta parte.
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
                  <button
                    type="button"
                    onClick={() => setSmartEnabled((current) => !current)}
                    className={`flex w-full items-start justify-between gap-4 rounded-2xl border px-4 py-4 text-left transition-all ${
                      smartEnabled
                        ? "border-[#ff6600]/45 bg-[#ff6600]/10"
                        : "border-white/10 bg-white/[0.035] hover:border-white/18"
                    }`}
                    aria-pressed={smartEnabled}
                  >
                    <span>
                      <span className="flex items-center gap-2 text-sm font-bold text-white">
                        <Sparkles size={15} className="text-[#ff9a57]" />
                        Gerar contrato inteligente ao criar
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-white/42">
                        Chama o MCC, mostra alertas, clausulas e texto consolidado para revisao.
                      </span>
                    </span>
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${smartEnabled ? "border-[#ff6600] bg-[#ff6600]" : "border-white/18 bg-black/20"}`}>
                      {smartEnabled && <Check size={12} className="text-white" />}
                    </span>
                  </button>

                  {smartEnabled && (
                    <div className="mt-5 space-y-5">
                      <div className="flex flex-wrap gap-2">
                        {SMART_SECTIONS.map((section) => (
                          <button
                            key={section.value}
                            type="button"
                            onClick={() => setSmartSection(section.value)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                              smartSection === section.value
                                ? "border-[#ff6600]/55 bg-[#ff6600]/12 text-[#ffb07a]"
                                : "border-white/10 bg-white/[0.035] text-white/46 hover:border-white/20 hover:text-white/70"
                            }`}
                          >
                            {section.label}
                          </button>
                        ))}
                      </div>

                      {smartSection === "partes" && (
                        <div className="space-y-5">
                          <div>
                            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/38">Qualificacao das partes</p>
                            <p className="text-xs leading-5 text-white/36">
                              Esses dados evitam campos como CNPJ [preencher] no contrato gerado.
                            </p>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            {PARTY_QUALIFICATION_FIELDS.map((field) => (
                              <div key={field.key}>
                                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-white/38">
                                  {field.label}
                                </label>
                                {field.multiline ? (
                                  <textarea
                                    value={mccContext[field.key] ?? ""}
                                    onChange={(event) => patchMcc({ [field.key]: event.target.value } as Partial<AutoGenerateContractPayload>)}
                                    rows={3}
                                    placeholder={field.placeholder}
                                    className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/24 focus:border-[#ff6600]/60"
                                  />
                                ) : (
                                  <input
                                    value={mccContext[field.key] ?? ""}
                                    onChange={(event) => patchMcc({ [field.key]: event.target.value } as Partial<AutoGenerateContractPayload>)}
                                    placeholder={field.placeholder}
                                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/24 focus:border-[#ff6600]/60"
                                  />
                                )}
                                <p className="mt-1.5 text-xs leading-5 text-white/36">{field.helperText}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {smartSection === "contexto" && (
                        <div className="space-y-5">
                          <div>
                            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/38">Relacao do contrato</p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {AUDIENCE_OPTIONS.map((option) => {
                                const active = mccContext.audience === option.value;
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => patchMcc({ audience: option.value })}
                                    className={`rounded-2xl border px-4 py-3 text-left transition-all ${active ? "border-[#ff6600]/55 bg-[#ff6600]/10" : "border-white/10 bg-white/[0.035] hover:border-white/18"}`}
                                  >
                                    <span className="block text-sm font-bold text-white">{option.label}</span>
                                    <span className="mt-1 block text-xs text-white/40">{option.hint}</span>
                                  </button>
                                );
                              })}
                            </div>
                            <p className="mt-2 text-xs leading-5 text-white/36">B2B e empresa com empresa. B2C e quando o cliente final e consumidor.</p>
                          </div>

                          <div>
                            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/38">Modelo do contrato</p>
                            <div className="flex flex-wrap gap-2">
                              {MODEL_OPTIONS.map((option) => {
                                const active = mccContext.contractModels?.includes(option.value) ?? false;
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => toggleModel(option.value)}
                                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${active ? "border-[#ff6600]/55 bg-[#ff6600]/12 text-[#ffb07a]" : "border-white/10 bg-white/[0.035] text-white/46 hover:border-white/20"}`}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/38">Nivel de risco</p>
                            <div className="grid gap-2 sm:grid-cols-3">
                              {(["baixo", "medio", "alto"] as const).map((risk) => {
                                const active = mccContext.riskLevel === risk;
                                return (
                                  <button
                                    key={risk}
                                    type="button"
                                    onClick={() => patchMcc({ riskLevel: risk })}
                                    className={`rounded-2xl border px-4 py-3 text-left capitalize transition-all ${active ? "border-[#ff6600]/55 bg-[#ff6600]/10" : "border-white/10 bg-white/[0.035] hover:border-white/18"}`}
                                  >
                                    <span className="text-sm font-bold text-white">{risk}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                              <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/38">Tamanho do contrato</p>
                                <p className="mt-1 text-xs leading-5 text-white/36">Mantemos as clausulas essenciais mesmo em contratos curtos.</p>
                              </div>
                              <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[11px] text-white/40">
                                ate {mccContext.targetClauseCount ?? DEFAULT_TARGET_CLAUSE_COUNT} clausulas
                              </span>
                            </div>

                            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                              {LEGAL_CLAUSE_COMPLETENESS_OPTIONS.map((option) => {
                                const active = (mccContext.clauseMode ?? DEFAULT_CLAUSE_MODE) === option.value;
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => selectClauseMode(option.value, option.targetClauseCount)}
                                    className={`rounded-2xl border px-4 py-3 text-left transition-all ${active ? "border-[#ff6600]/55 bg-[#ff6600]/10" : "border-white/10 bg-white/[0.035] hover:border-white/18"}`}
                                  >
                                    <span className="block text-sm font-bold text-white">{option.label}</span>
                                    <span className="mt-1 block text-xs font-semibold text-[#ffb07a]">{option.range}</span>
                                    <span className="mt-2 block text-xs leading-5 text-white/40">{option.description}</span>
                                  </button>
                                );
                              })}
                            </div>

                            <div className={`mt-2 rounded-2xl border px-4 py-3 transition-all ${(mccContext.clauseMode ?? DEFAULT_CLAUSE_MODE) === "custom" ? "border-[#ff6600]/55 bg-[#ff6600]/10" : "border-white/10 bg-white/[0.025]"}`}>
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="text-sm font-bold text-white">Personalizado</p>
                                  <p className="mt-1 text-xs leading-5 text-white/40">Escolha um limite aproximado. O motor corta apenas opcionais.</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {CUSTOM_CLAUSE_COUNT_OPTIONS.map((count) => {
                                    const active = (mccContext.clauseMode ?? DEFAULT_CLAUSE_MODE) === "custom" && mccContext.targetClauseCount === count;
                                    return (
                                      <button
                                        key={count}
                                        type="button"
                                        onClick={() => selectClauseMode("custom", count)}
                                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${active ? "border-[#ff6600]/60 bg-[#ff6600] text-white" : "border-white/10 bg-white/[0.035] text-white/46 hover:border-white/20"}`}
                                      >
                                        ate {count}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-2">
                            {[
                              ["Contrato recorrente?", "Mensalidade, assinatura ou renovacao.", "subscription"],
                              ["Cobranca por etapas?", "Pagamentos por marcos ou entregas.", "milestoneBilling"],
                            ].map(([title, hint, key]) => {
                              const checked = Boolean(mccContext[key as keyof AutoGenerateContractPayload]);
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => patchMcc({ [key]: !checked } as Partial<AutoGenerateContractPayload>)}
                                  className={`rounded-2xl border px-4 py-3 text-left transition-all ${checked ? "border-[#ff6600]/55 bg-[#ff6600]/10" : "border-white/10 bg-white/[0.035] hover:border-white/18"}`}
                                >
                                  <span className="block text-sm font-bold text-white">{title}</span>
                                  <span className="mt-1 block text-xs text-white/40">{hint}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {smartSection === "dados" && (
                        <div className="space-y-5">
                          <div className="grid gap-2 sm:grid-cols-2">
                            {[
                              ["Trata dados pessoais?", "Nome, CPF, e-mail, telefone ou dado que identifique alguem.", "personalData"],
                              ["Trata dados sensiveis?", "Saude, biometria, religiao, origem racial, politica ou similares.", "sensitiveData"],
                              ["Ha subprocessadores?", "Terceiros que ajudam e podem acessar dados.", "usesSubprocessors"],
                              ["Entrega codigo-fonte?", "Importante para propriedade intelectual e handover.", "sourceCodeDelivery"],
                            ].map(([title, hint, key]) => {
                              const checked = key === "usesSubprocessors"
                                ? usesSubprocessors
                                : Boolean(mccContext[key as keyof AutoGenerateContractPayload]);
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => {
                                    if (key === "usesSubprocessors") {
                                      setUsesSubprocessors((current) => !current);
                                      if (usesSubprocessors) patchMcc({ subprocessorSummary: "" });
                                    } else {
                                      patchMcc({ [key]: !checked } as Partial<AutoGenerateContractPayload>);
                                    }
                                  }}
                                  className={`rounded-2xl border px-4 py-3 text-left transition-all ${checked ? "border-[#ff6600]/55 bg-[#ff6600]/10" : "border-white/10 bg-white/[0.035] hover:border-white/18"}`}
                                >
                                  <span className="block text-sm font-bold text-white">{title}</span>
                                  <span className="mt-1 block text-xs leading-5 text-white/40">{hint}</span>
                                </button>
                              );
                            })}
                          </div>

                          <div>
                            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/38">Propriedade intelectual</p>
                            <div className="grid gap-2 sm:grid-cols-3">
                              {[
                                ["licenca", "Licenca", "Cliente usa, voce segue titular."],
                                ["cessao", "Cessao", "Cliente vira dono do material."],
                                ["titularidade_prestador", "Titularidade", "Voce mantem metodo e base previa."],
                              ].map(([value, label, hint]) => (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => patchMcc({ ipMode: value as AutoGenerateContractPayload["ipMode"] })}
                                  className={`rounded-2xl border px-4 py-3 text-left transition-all ${mccContext.ipMode === value ? "border-[#ff6600]/55 bg-[#ff6600]/10" : "border-white/10 bg-white/[0.035] hover:border-white/18"}`}
                                >
                                  <span className="block text-sm font-bold text-white">{label}</span>
                                  <span className="mt-1 block text-xs leading-5 text-white/40">{hint}</span>
                                </button>
                              ))}
                            </div>
                            <p className="mt-2 text-xs leading-5 text-white/36">Define quem pode usar, editar ou ficar dono do que for criado.</p>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-white/38">Resumo de seguranca</label>
                              <textarea
                                value={mccContext.securitySummary ?? ""}
                                onChange={(event) => patchMcc({ securitySummary: event.target.value })}
                                rows={3}
                                placeholder="Ex.: logs, backups e acesso com senha forte."
                                className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/24 focus:border-[#ff6600]/60"
                              />
                            </div>
                            <div>
                              <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-white/38">Subprocessadores</label>
                              <textarea
                                value={mccContext.subprocessorSummary ?? ""}
                                onChange={(event) => {
                                  setUsesSubprocessors(Boolean(event.target.value.trim()));
                                  patchMcc({ subprocessorSummary: event.target.value });
                                }}
                                rows={3}
                                placeholder="Ex.: cloud, pagamentos ou e-mail."
                                className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/24 focus:border-[#ff6600]/60"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {smartSection === "operacao" && (
                        <div className="space-y-5">
                          <div>
                            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/38">Nivel de suporte</p>
                            <div className="grid gap-2 sm:grid-cols-3">
                              {([
                                ["none", "Nenhum", "Sem suporte formal."],
                                ["horario_comercial", "Horario comercial", "Atendimento em dias uteis."],
                                ["estendido", "Estendido", "Maior cobertura de horario."],
                              ] as const).map(([value, label, hint]) => {
                                const active = mccContext.supportLevel === value;
                                return (
                                  <button
                                    key={value}
                                    type="button"
                                    onClick={() => patchMcc({ supportLevel: value })}
                                    className={`rounded-2xl border px-4 py-3 text-left transition-all ${active ? "border-[#ff6600]/55 bg-[#ff6600]/10" : "border-white/10 bg-white/[0.035] hover:border-white/18"}`}
                                  >
                                    <span className="block text-sm font-bold text-white">{label}</span>
                                    <span className="mt-1 block text-xs leading-5 text-white/40">{hint}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-white/38">Resumo de suporte</label>
                            <textarea
                              value={mccContext.supportSummary ?? ""}
                              onChange={(event) => patchMcc({ supportSummary: event.target.value })}
                              rows={3}
                              placeholder="Ex.: suporte por e-mail em ate 2 dias uteis."
                              className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/24 focus:border-[#ff6600]/60"
                            />
                          </div>

                          <div className="grid gap-2 sm:grid-cols-3">
                            {([
                              ["Precisa de handover?", "Transicao para acessos, arquivos e orientacoes.", "includeHandOver"],
                              ["Pode usar em portfolio?", "Permite mostrar o trabalho como caso ou vitrine.", "includePortfolioUse"],
                              ["Incluir chargeback?", "Regra para estorno ou disputa financeira.", "includeChargebackRule"],
                            ] as const).map(([title, hint, key]) => {
                              const checked = Boolean(mccContext[key]);
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => patchMcc({ [key]: !checked } as Partial<AutoGenerateContractPayload>)}
                                  className={`rounded-2xl border px-4 py-3 text-left transition-all ${checked ? "border-[#ff6600]/55 bg-[#ff6600]/10" : "border-white/10 bg-white/[0.035] hover:border-white/18"}`}
                                >
                                  <span className="block text-sm font-bold text-white">{title}</span>
                                  <span className="mt-1 block text-xs leading-5 text-white/40">{hint}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {smartSection === "prova" && (
                        <div className="space-y-5">
                          <div className="grid gap-2 sm:grid-cols-2">
                            {([
                              ["Incluir arbitragem?", "Conflitos fora do Judiciario comum, por camara arbitral.", "includeArbitration"],
                              ["Incluir escrow?", "Terceiro guarda algo importante, como codigo ou garantia.", "includeEscrow"],
                            ] as const).map(([title, hint, key]) => {
                              const checked = Boolean(mccContext[key]);
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => patchMcc({ [key]: !checked } as Partial<AutoGenerateContractPayload>)}
                                  className={`rounded-2xl border px-4 py-3 text-left transition-all ${checked ? "border-[#ff6600]/55 bg-[#ff6600]/10" : "border-white/10 bg-white/[0.035] hover:border-white/18"}`}
                                >
                                  <span className="block text-sm font-bold text-white">{title}</span>
                                  <span className="mt-1 block text-xs leading-5 text-white/40">{hint}</span>
                                </button>
                              );
                            })}
                          </div>

                          <div>
                            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/38">Metodos de autenticacao e prova</p>
                            <div className="flex flex-wrap gap-2">
                              {AUTH_METHODS.map((method) => {
                                const active = mccContext.authenticationMethods?.includes(method.value) ?? false;
                                return (
                                  <button
                                    key={method.value}
                                    type="button"
                                    onClick={() => toggleAuthMethod(method.value)}
                                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${active ? "border-[#ff6600]/55 bg-[#ff6600]/12 text-[#ffb07a]" : "border-white/10 bg-white/[0.035] text-white/46 hover:border-white/20"}`}
                                  >
                                    {method.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-white/38">Foro: cidade/UF</label>
                              <input
                                value={mccContext.forumCityUf ?? ""}
                                onChange={(event) => patchMcc({ forumCityUf: event.target.value })}
                                placeholder="Ex.: Sao Paulo/SP"
                                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/24 focus:border-[#ff6600]/60"
                              />
                              <p className="mt-2 text-xs leading-5 text-white/36">Foro e a cidade/estado escolhido para resolver disputas judiciais.</p>
                            </div>
                            <div>
                              <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-white/38">Conexao do foro</label>
                              <input
                                value={mccContext.forumConnection ?? ""}
                                onChange={(event) => patchMcc({ forumConnection: event.target.value })}
                                placeholder="Ex.: sede do prestador ou local do servico."
                                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/24 focus:border-[#ff6600]/60"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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
                <>
                  <Loader2 size={15} className="animate-spin" />
                  {smartEnabled ? "Criando e modelando..." : "Criando contrato..."}
                </>
              ) : step === STEPS.length - 1 ? (
                smartEnabled ? (
                  <>
                    <Sparkles size={15} />
                    Criar e gerar contrato inteligente
                  </>
                ) : (
                  <>Criar contrato e ir para o editor <ArrowRight size={15} /></>
                )
              ) : (
                <>Continuar <ArrowRight size={15} /></>
              )}
            </motion.button>
          </div>

          {step === STEPS.length - 1 && smartEnabled && (
            <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/8 px-4 py-3 text-xs leading-5 text-amber-100/70">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-300" />
              O MCC ajuda com alertas e robustez, mas a revisao humana continua recomendada antes de assinar ou enviar.
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
