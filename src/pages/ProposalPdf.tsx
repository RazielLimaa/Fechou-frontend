import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getProposalById, type ApiProposal } from "../service/proposals";
import { getMyPlan, type PlanId } from "../service/payment";
import { Loader2, Printer, ArrowLeft, ShieldCheck, Lock } from "lucide-react";

const formatCurrency = (value: string | number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));

const formatDate = (d: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(d));

const PLAN_ORDER: Record<PlanId, number> = { free: 0, pro: 1, premium: 2 };
function hasPlan(current: PlanId, required: PlanId) {
  return PLAN_ORDER[current] >= PLAN_ORDER[required];
}

const statusLabel: Record<string, { text: string; color: string }> = {
  pendente: { text: "Aguardando Aceite", color: "#fbbf24" },
  vendida: { text: "Contrato Aceito e Pago", color: "#4ade80" },
  cancelada: { text: "Cancelado", color: "#f87171" },
};

export default function ProposalPdf() {
  const { id } = useParams<{ id: string }>();
  const proposalId = Number(id);

  const {
    data: proposal,
    isLoading: loadingProposal,
    error: proposalError,
  } = useQuery({
    queryKey: ["proposal-pdf", proposalId],
    queryFn: () => getProposalById(proposalId),
    enabled: !isNaN(proposalId),
    retry: 1,
  });

  const { data: planData, isLoading: loadingPlan } = useQuery({
    queryKey: ["my-plan"],
    queryFn: getMyPlan,
    retry: 1,
  });

  const planId: PlanId = planData?.plan?.planId ?? "free";
  const isPro = hasPlan(planId, "pro");
  const isLoading = loadingProposal || loadingPlan;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <span className="text-sm font-display">Preparando contrato...</span>
        </div>
      </div>
    );
  }

  if (proposalError || !proposal) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-lg text-foreground mb-2">Proposta não encontrada</p>
          <Link href="/propostas">
            <button className="mt-4 px-6 py-2 rounded-full border border-white/10 text-[10px] uppercase tracking-[0.2em] hover:bg-white/5 transition-colors text-muted-foreground">
              Voltar para propostas
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = statusLabel[proposal.status] ?? statusLabel.pendente;
  const contractNumber = `FECH-${String(proposal.id).padStart(6, "0")}`;
  const createdDate = formatDate(proposal.createdAt);
  const signedDate = proposal.contract?.signedAt ? formatDate(proposal.contract.signedAt) : null;
  const signerName = proposal.contract?.signerName ?? null;
  const descriptionParagraphs = (proposal.description ?? "").split(/\n+/).filter(Boolean);

  return (
    <>
      {/* ── PRINT STYLES ───────────────────────────────────────────── */}
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-page { box-shadow: none !important; margin: 0 !important; border-radius: 0 !important; }
          @page { size: A4; margin: 20mm 18mm; }
        }
      `}</style>

      {/* ── APP SHELL (hidden on print) ─────────────────────────────── */}
      <div className="no-print min-h-screen bg-background text-foreground">
        <div className="noise-overlay" />

        {/* Navbar */}
        <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 bg-background/20 backdrop-blur-2xl border-b border-white/5">
          <div className="max-w-[1100px] mx-auto flex items-center justify-between">
            <Link href="/" className="font-display text-2xl font-bold tracking-tight group">
              FECHOU<span className="text-accent group-hover:italic transition-all">!</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/propostas"
                className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-accent transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar
              </Link>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent text-white text-[10px] uppercase tracking-[0.2em] hover:opacity-90 transition-opacity font-bold shadow-lg shadow-accent/20"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir / PDF
              </button>
            </div>
          </div>
        </nav>

        {/* Preview wrapper */}
        <div className="pt-32 pb-24 px-4 flex flex-col items-center">
          {!isPro && (
            <div className="w-full max-w-[800px] mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 flex items-start gap-3">
              <Lock className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-200">Plano Free — contrato com marca d'água</p>
                <p className="text-xs text-yellow-300/70 mt-0.5">
                  Faça upgrade para o plano <strong>Pro</strong> ou <strong>Premium</strong> para emitir contratos sem marca d'água.{" "}
                  <Link href="/system" className="underline hover:text-yellow-200">Ver planos</Link>
                </p>
              </div>
            </div>
          )}

          {isPro && (
            <div className="w-full max-w-[800px] mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-sm text-emerald-200">
                Contrato limpo — sem marca d'água ({planId === "premium" ? "Premium" : "Pro"})
              </p>
            </div>
          )}

          <ContractDocument proposal={proposal} isPro={isPro} contractNumber={contractNumber} createdDate={createdDate} signedDate={signedDate} signerName={signerName} statusInfo={statusInfo} descriptionParagraphs={descriptionParagraphs} />
        </div>
      </div>

      {/* ── PRINT-ONLY DOCUMENT (rendered off-screen until printed) ─ */}
      <div className="hidden print:block">
        <ContractDocument proposal={proposal} isPro={isPro} contractNumber={contractNumber} createdDate={createdDate} signedDate={signedDate} signerName={signerName} statusInfo={statusInfo} descriptionParagraphs={descriptionParagraphs} />
      </div>
    </>
  );
}

type ContractDocumentProps = {
  proposal: ApiProposal;
  isPro: boolean;
  contractNumber: string;
  createdDate: string;
  signedDate: string | null;
  signerName: string | null;
  statusInfo: { text: string; color: string };
  descriptionParagraphs: string[];
};

function ContractDocument({
  proposal,
  isPro,
  contractNumber,
  createdDate,
  signedDate,
  signerName,
  statusInfo,
  descriptionParagraphs,
}: ContractDocumentProps) {
  return (
    <div
      className="print-page relative bg-white text-[#111] w-full max-w-[800px] min-h-[1122px] mx-auto shadow-2xl rounded-xl overflow-hidden"
      style={{ fontFamily: "'Manrope', 'Inter', sans-serif", fontSize: "13px", lineHeight: "1.7" }}
    >
      {/* ── WATERMARK (free only) ─────────────────────────────────── */}
      {!isPro && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {Array.from({ length: 40 }).map((_, i) => {
            const row = Math.floor(i / 5);
            const col = i % 5;
            return (
              <span
                key={i}
                style={{
                  position: "absolute",
                  top: `${row * 22 - 10}%`,
                  left: `${col * 22 - 5}%`,
                  transform: "rotate(-35deg)",
                  fontSize: "28px",
                  fontWeight: 900,
                  fontFamily: "'Syne', sans-serif",
                  color: "rgba(255, 102, 0, 0.07)",
                  letterSpacing: "0.08em",
                  whiteSpace: "nowrap",
                  userSelect: "none",
                }}
              >
                FECHOU!
              </span>
            );
          })}
        </div>
      )}

      {/* ── CONTENT ─────────────────────────────────────────────────── */}
      <div style={{ position: "relative", zIndex: 20, padding: "48px 52px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "40px", paddingBottom: "24px", borderBottom: "2px solid #ff6600" }}>
          <div>
            <div style={{ fontSize: "28px", fontWeight: 900, fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em", color: "#111" }}>
              FECHOU<span style={{ color: "#ff6600" }}>!</span>
            </div>
            <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.25em", color: "#888", marginTop: "2px" }}>
              Plataforma de Contratos
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.2em", color: "#aaa" }}>Nº do Contrato</div>
            <div style={{ fontSize: "18px", fontWeight: 800, fontFamily: "'Syne', sans-serif", color: "#111", marginTop: "2px" }}>{contractNumber}</div>
            <div style={{ marginTop: "6px", display: "inline-block", padding: "3px 10px", borderRadius: "999px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", border: `1px solid ${statusInfo.color}`, color: statusInfo.color }}>
              {statusInfo.text}
            </div>
          </div>
        </div>

        {/* Title */}
        <div style={{ marginBottom: "36px" }}>
          <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.3em", color: "#aaa", marginBottom: "6px" }}>
            Proposta / Contrato de Serviço
          </div>
          <div style={{ fontSize: "26px", fontWeight: 800, fontFamily: "'Syne', sans-serif", color: "#111", lineHeight: 1.2 }}>
            {proposal.title}
          </div>
        </div>

        {/* Info Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "36px" }}>
          <InfoBox label="Cliente" value={proposal.clientName} accent />
          <InfoBox label="Valor do Contrato" value={formatCurrency(proposal.value)} accent />
          <InfoBox label="Data de Emissão" value={createdDate} />
          <InfoBox label="Situação" value={statusInfo.text} />
        </div>

        {/* Scope / Description */}
        <Section title="Escopo de Trabalho e Condições">
          {descriptionParagraphs.length > 0 ? (
            descriptionParagraphs.map((p, i) => (
              <p key={i} style={{ marginBottom: "10px", color: "#333" }}>{p}</p>
            ))
          ) : (
            <p style={{ color: "#888", fontStyle: "italic" }}>Nenhuma descrição foi fornecida para esta proposta.</p>
          )}
        </Section>

        {/* Payment Conditions */}
        <Section title="Condições de Pagamento">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <InfoBox label="Valor Total" value={formatCurrency(proposal.value)} accent />
            <InfoBox label="Forma de Pagamento" value="PIX / Transferência Bancária" />
          </div>
          <p style={{ marginTop: "12px", color: "#555", fontSize: "12px" }}>
            O pagamento deverá ser efetuado conforme acordado entre as partes. O início dos serviços está condicionado à
            confirmação do pagamento.
          </p>
        </Section>

        {/* General Clauses */}
        <Section title="Cláusulas Gerais">
          <ClauseList items={[
            "O prestador compromete-se a entregar os serviços descritos no escopo acima dentro do prazo acordado.",
            "Alterações no escopo poderão implicar em ajuste no valor e/ou prazo, mediante acordo entre as partes.",
            "Informações confidenciais compartilhadas por ambas as partes serão tratadas com sigilo.",
            "Em caso de cancelamento após o início dos serviços, o cliente deverá arcar com o valor proporcional ao trabalho realizado.",
            "Este contrato é regido pelas leis da República Federativa do Brasil.",
          ]} />
        </Section>

        {/* Signature section */}
        <Section title="Assinatura e Aceite">
          {proposal.contract?.signed ? (
            <div style={{ padding: "16px", background: "#f0fdf4", borderRadius: "10px", border: "1px solid #86efac" }}>
              <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.2em", color: "#16a34a", fontWeight: 700, marginBottom: "8px" }}>
                ✓ Contrato Aceito Eletronicamente
              </div>
              {signerName && <Row label="Signatário" value={signerName} />}
              {signedDate && <Row label="Data do Aceite" value={signedDate} />}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", paddingTop: "20px" }}>
              <SignatureLine label="Prestador de Serviços" />
              <SignatureLine label={`Cliente — ${proposal.clientName}`} />
            </div>
          )}
          <p style={{ marginTop: "16px", fontSize: "11px", color: "#aaa", textAlign: "center" }}>
            Emitido via Fechou! · {contractNumber} · {createdDate}
          </p>
        </Section>

        {/* Footer */}
        <div style={{ marginTop: "40px", paddingTop: "20px", borderTop: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "10px", color: "#ccc", textTransform: "uppercase", letterSpacing: "0.2em" }}>
            FECHOU! — fechou.app
          </div>
          <div style={{ fontSize: "10px", color: "#ccc" }}>
            {contractNumber}
          </div>
          {!isPro && (
            <div style={{ fontSize: "9px", color: "#ff6600", textTransform: "uppercase", letterSpacing: "0.15em" }}>
              Plano Free — com marca d'água
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ padding: "14px 16px", background: "#f8f8f8", borderRadius: "10px", border: "1px solid #eee" }}>
      <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.25em", color: "#aaa", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: "14px", color: accent ? "#ff6600" : "#111" }}>{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "32px" }}>
      <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.3em", color: "#ff6600", fontWeight: 800, marginBottom: "12px", paddingBottom: "6px", borderBottom: "1px solid #ffe0cc" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function ClauseList({ items }: { items: string[] }) {
  return (
    <ol style={{ paddingLeft: "20px", margin: 0 }}>
      {items.map((item, i) => (
        <li key={i} style={{ marginBottom: "8px", color: "#444", fontSize: "12px" }}>{item}</li>
      ))}
    </ol>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: "8px", marginBottom: "4px", fontSize: "12px" }}>
      <span style={{ color: "#888", minWidth: "110px" }}>{label}:</span>
      <span style={{ fontWeight: 600, color: "#111" }}>{value}</span>
    </div>
  );
}

function SignatureLine({ label }: { label: string }) {
  return (
    <div>
      <div style={{ borderBottom: "1.5px solid #333", marginBottom: "8px", height: "40px" }} />
      <div style={{ fontSize: "11px", color: "#666" }}>{label}</div>
    </div>
  );
}
