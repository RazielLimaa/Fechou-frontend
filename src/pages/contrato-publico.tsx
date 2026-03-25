import { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { getPublicProposal, signProposal, type ApiProposal } from "../service/proposals";
import { getPublicProfile, type UserProfile } from "../service/profile.service";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import { rateLimiter, sanitizeInput } from "../lib/security";
import {
  normalizeSignerDocument,
  validateSignatureDataUrl,
  validateSignerName,
} from "../lib/signature-security";
import {
  CheckCircle2, Pen, Copy, ArrowRight, FileText, Calendar,
  DollarSign, User, Eraser, Shield, Clock, AlertCircle,
  ChevronDown, Lock, Banknote, Star, ExternalLink,
  Globe, Github, Instagram, Linkedin, MapPin, UserCheck,
} from "lucide-react";

// ─── types ────────────────────────────────────────────────────────────────────

type PublicProposalWithPix = ApiProposal & {
  pixKey?: string | null;
  pixKeyType?: string | null;
  userId?: number;
};

type SignProposalPayload = {
  signerName: string;
  signerDocument: string;
  signatureDataUrl: string;
};

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmt = (v: string | number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));

const fmtDate = (d: string | null | undefined): string => {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(date);
};

function maskPixKey(key: string, type?: string | null): string {
  if (!key) return "---";
  if (type === "email") { const [u, d] = key.split("@"); if (!d) return key; return `${u.slice(0,3)}***@${d}`; }
  if (type === "cpf") { const d = key.replace(/\D/g,""); if (d.length===11) return `***.${d.slice(3,6)}.${d.slice(6,9)}-**`; }
  if (type === "cnpj") { const d = key.replace(/\D/g,""); if (d.length===14) return `**.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-**`; }
  if (type === "phone") { const d = key.replace(/\D/g,""); if (d.length>=10) return `+** (**) *****-${d.slice(-4)}`; }
  if (key.length > 12) return `${key.slice(0,8)}...${key.slice(-4)}`;
  return key;
}

function pixTypeLabel(type?: string | null) {
  const map: Record<string,string> = { cpf:"CPF", cnpj:"CNPJ", email:"E-mail", phone:"Telefone", random:"Chave Aleatória" };
  return type ? (map[type] ?? "PIX") : "PIX";
}

// ─── Signature Canvas ─────────────────────────────────────────────────────────

function SignatureCanvas({ onSave, onClear, disabled = false }: {
  onSave: (dataUrl: string) => void; onClear: () => void; disabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [saved, setSaved] = useState(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current; if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width; const scaleY = canvas.height / rect.height;
    if ("touches" in e) { const t = e.touches[0]; return { x: (t.clientX-rect.left)*scaleX, y: (t.clientY-rect.top)*scaleY }; }
    return { x: (e.clientX-rect.left)*scaleX, y: (e.clientY-rect.top)*scaleY };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => { if (disabled) return; e.preventDefault(); isDrawing.current=true; lastPos.current=getPos(e); setSaved(false); };
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return; e.preventDefault();
    if (!isDrawing.current||!lastPos.current) return;
    const canvas=canvasRef.current; const ctx=canvas?.getContext("2d");
    if (!ctx||!canvas) return;
    const pos=getPos(e);
    ctx.beginPath(); ctx.moveTo(lastPos.current.x,lastPos.current.y); ctx.lineTo(pos.x,pos.y);
    ctx.strokeStyle="#ff6600"; ctx.lineWidth=2.5; ctx.lineCap="round"; ctx.lineJoin="round"; ctx.stroke();
    lastPos.current=pos; setIsEmpty(false);
  };
  const stopDraw = () => { isDrawing.current=false; lastPos.current=null; };
  const handleClear = () => {
    if (disabled) return;
    const canvas=canvasRef.current; const ctx=canvas?.getContext("2d");
    if (!ctx||!canvas) return;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    setIsEmpty(true); setSaved(false); onClear();
  };
  const handleSave = () => {
    if (disabled) return;
    const canvas=canvasRef.current; if (!canvas||isEmpty) return;
    onSave(canvas.toDataURL("image/png")); setSaved(true); toast.success("Assinatura capturada!");
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      <div style={{ position:"relative", borderRadius:14, overflow:"hidden", border:"1px solid rgba(255,255,255,0.08)", background:"rgba(255,255,255,0.02)", touchAction:"none", opacity:disabled?0.6:1, pointerEvents:disabled?"none":"auto" }}>
        <canvas ref={canvasRef} width={700} height={180} style={{ width:"100%", height:180, cursor:"crosshair", display:"block" }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
        {isEmpty && (
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8, pointerEvents:"none" }}>
            <Pen size={22} style={{ color:"rgba(255,255,255,0.12)" }} />
            <span style={{ fontSize:12, color:"rgba(255,255,255,0.2)" }}>Assine aqui com o mouse ou dedo</span>
          </div>
        )}
        <div style={{ position:"absolute", bottom:32, left:20, right:20, height:1, background:"rgba(255,255,255,0.06)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:10, left:20, fontSize:9, color:"rgba(255,255,255,0.15)", textTransform:"uppercase", letterSpacing:"0.2em", pointerEvents:"none" }}>Assinatura</div>
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <button type="button" onClick={handleClear} disabled={disabled}
          style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:10, border:"1px solid rgba(255,255,255,0.08)", background:"transparent", color:"rgba(255,255,255,0.35)", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
          <Eraser size={12} /> Limpar
        </button>
        <button type="button" onClick={handleSave} disabled={isEmpty||disabled}
          style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 18px", borderRadius:10, fontSize:12, fontWeight:700, cursor:isEmpty||disabled?"not-allowed":"pointer", fontFamily:"inherit", transition:"all 0.2s",
            background:saved?"rgba(34,197,94,0.1)":isEmpty||disabled?"rgba(255,255,255,0.04)":"#ff6600",
            border:saved?"1px solid rgba(34,197,94,0.3)":"none",
            color:saved?"#22c55e":isEmpty||disabled?"rgba(255,255,255,0.2)":"#fff" }}>
          <CheckCircle2 size={12} />
          {saved ? "Assinatura salva" : "Usar esta assinatura"}
        </button>
      </div>
    </div>
  );
}

// ─── Steps ────────────────────────────────────────────────────────────────────

function Steps({ current }: { current: number }) {
  const steps = [{ label:"Revisar", icon:FileText }, { label:"Assinar", icon:Pen }, { label:"Pagar", icon:Banknote }];
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", marginBottom:32 }}>
      {steps.map(({ label, icon:Icon }, i) => {
        const done=i<current; const active=i===current;
        return (
          <div key={label} style={{ display:"flex", alignItems:"center" }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
              <div style={{ width:36, height:36, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.3s",
                background:done?"#ff6600":active?"rgba(255,102,0,0.1)":"rgba(255,255,255,0.03)",
                border:`1px solid ${done?"#ff6600":active?"#ff6600":"rgba(255,255,255,0.08)"}` }}>
                {done ? <CheckCircle2 size={16} style={{ color:"#fff" }} /> : <Icon size={14} style={{ color:active?"#ff6600":"rgba(255,255,255,0.25)" }} />}
              </div>
              <span style={{ fontSize:9, textTransform:"uppercase", letterSpacing:"0.2em", fontWeight:700,
                color:active?"#ff6600":done?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.18)" }}>{label}</span>
            </div>
            {i < steps.length-1 && (
              <div style={{ width:"clamp(40px,8vw,80px)", height:1, margin:"0 10px 20px", background:i<current?"#ff6600":"rgba(255,255,255,0.07)", transition:"background 0.5s" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── FreelancerCard ───────────────────────────────────────────────────────────

function StarRow({ stars }: { stars: number }) {
  return (
    <div style={{ display:"flex", gap:2 }}>
      {[1,2,3,4,5].map(s => (
        <Star key={s} size={11} fill={s<=stars?"#f59e0b":"none"} stroke={s<=stars?"#f59e0b":"rgba(255,255,255,0.15)"} />
      ))}
    </div>
  );
}

function FreelancerCard({ userId }: { userId: number }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getPublicProfile(userId)
      .then(p => { setProfile(p); })
      .catch(() => { setNotFound(true); })
      .finally(() => setLoading(false));
  }, [userId]);

  // skeleton
  if (loading) return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
      style={{ padding:"20px 24px", borderRadius:20, border:"1px solid rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.02)", display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
      <div style={{ width:44, height:44, borderRadius:"50%", background:"rgba(255,102,0,0.08)", border:"1px solid rgba(255,102,0,0.15)", flexShrink:0 }} />
      <div style={{ flex:1 }}>
        <div style={{ height:12, width:100, borderRadius:6, background:"rgba(255,255,255,0.06)", marginBottom:6 }} />
        <div style={{ height:9, width:60, borderRadius:6, background:"rgba(255,255,255,0.04)" }} />
      </div>
    </motion.div>
  );

  // sem perfil preenchido — mostra card mínimo só com badge verificado
  if (notFound || !profile) return (
    <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
      style={{ marginBottom:20, borderRadius:20, border:"1px solid rgba(255,102,0,0.14)", background:"rgba(255,102,0,0.02)", overflow:"hidden" }}>
      <div style={{ height:2, background:"linear-gradient(90deg, #ff6600, rgba(255,102,0,0.2))" }} />
      <div style={{ padding:"16px 22px", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:40, height:40, borderRadius:"50%", background:"rgba(255,102,0,0.1)", border:"2px solid rgba(255,102,0,0.2)", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <User size={18} style={{ color:"#ff6600", opacity:0.6 }} />
        </div>
        <div>
          <p style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.22em", color:"rgba(255,102,0,0.5)", marginBottom:4 }}>◈ Freelancer responsável</p>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.6)" }}>Profissional verificado</span>
            <div style={{ display:"flex", alignItems:"center", gap:3, padding:"2px 7px", borderRadius:999, background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.18)" }}>
              <UserCheck size={9} style={{ color:"#22c55e" }} />
              <span style={{ fontSize:8, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.12em", color:"#22c55e" }}>Verificado</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const { score, ratings, links } = profile;
  const hasLinks = Object.values(links).some(Boolean);

  return (
    <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
      transition={{ duration:0.5, ease:[0.16,1,0.3,1] }} style={{ marginBottom:20 }}>
      <div style={{ position:"relative", borderRadius:20, border:"1px solid rgba(255,102,0,0.18)", background:"linear-gradient(135deg, rgba(255,102,0,0.04) 0%, rgba(255,255,255,0.01) 60%)", overflow:"hidden" }}>
        <div style={{ height:2, background:"linear-gradient(90deg, #ff6600, rgba(255,102,0,0.2))" }} />
        <div style={{ padding:"20px 22px 18px" }}>

          <p style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.28em", color:"rgba(255,102,0,0.6)", marginBottom:14 }}>◈ Freelancer responsável</p>

          {/* avatar + info */}
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
            <div style={{ width:48, height:48, borderRadius:"50%", overflow:"hidden", background:"rgba(255,102,0,0.1)", border:"2px solid rgba(255,102,0,0.25)", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
              {profile.avatarUrl
                ? <img src={profile.avatarUrl} alt={profile.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                : <span style={{ fontSize:18, fontWeight:900, color:"#ff6600", opacity:0.7 }}>{profile.name?.[0]?.toUpperCase()}</span>}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3, flexWrap:"wrap" }}>
                <span style={{ fontSize:15, fontWeight:800, color:"#fff", letterSpacing:"-0.02em" }}>{profile.name}</span>
                <div style={{ display:"flex", alignItems:"center", gap:3, padding:"2px 7px", borderRadius:999, background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.18)" }}>
                  <UserCheck size={9} style={{ color:"#22c55e" }} />
                  <span style={{ fontSize:8, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.14em", color:"#22c55e" }}>Verificado</span>
                </div>
              </div>
              {profile.profession && <p style={{ fontSize:11, color:"rgba(255,255,255,0.38)", margin:0 }}>{profile.profession}</p>}
              {profile.location && (
                <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:3 }}>
                  <MapPin size={9} style={{ color:"rgba(255,255,255,0.2)" }} />
                  <span style={{ fontSize:10, color:"rgba(255,255,255,0.25)" }}>{profile.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* score + estrelas */}
          <div style={{ display:"grid", gridTemplateColumns:ratings.totalRatings>0?"1fr 1fr":"1fr", gap:10, marginBottom:profile.bio||hasLinks?14:0 }}>
            <div style={{ padding:"10px 14px", borderRadius:12, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
              <p style={{ fontSize:9, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.14em", marginBottom:5 }}>Score</p>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:8 }}>{score.level.emoji}</span>
                <span style={{ fontSize:18, fontWeight:900, letterSpacing:"-0.04em", color:"#fff", lineHeight:1 }}>{score.value}</span>
                <span style={{ fontSize:9, fontWeight:700, color:score.level.color }}>{score.level.label}</span>
              </div>
              <div style={{ marginTop:6, height:3, borderRadius:999, background:"rgba(255,255,255,0.06)", overflow:"hidden" }}>
                <motion.div initial={{ width:0 }} animate={{ width:`${Math.min(100,(score.value/500)*100)}%` }}
                  transition={{ duration:1, delay:0.3, ease:[0.16,1,0.3,1] }}
                  style={{ height:"100%", borderRadius:999, background:score.level.color }} />
              </div>
            </div>
            {ratings.totalRatings > 0 && (
              <div style={{ padding:"10px 14px", borderRadius:12, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontSize:9, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.14em", marginBottom:5 }}>Avaliação</p>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <StarRow stars={Math.round(ratings.avgStars)} />
                  <span style={{ fontSize:16, fontWeight:900, color:"#fff", letterSpacing:"-0.03em", lineHeight:1 }}>{ratings.avgStars.toFixed(1)}</span>
                </div>
                <p style={{ fontSize:10, color:"rgba(255,255,255,0.25)", marginTop:4 }}>{ratings.totalRatings} avaliação{ratings.totalRatings!==1?"ões":""}</p>
              </div>
            )}
          </div>

          {profile.bio && (
            <p style={{ fontSize:12, color:"rgba(255,255,255,0.35)", lineHeight:1.65, marginBottom:hasLinks?12:14, fontWeight:300, fontStyle:"italic" }}>
              "{profile.bio}"
            </p>
          )}

          {hasLinks && (
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
              {[
                { url:links.website,   icon:<Globe size={10} />,        label:"Site"      },
                { url:links.linkedin,  icon:<Linkedin size={10} />,     label:"LinkedIn"  },
                { url:links.instagram, icon:<Instagram size={10} />,    label:"Instagram" },
                { url:links.github,    icon:<Github size={10} />,       label:"GitHub"    },
                { url:links.behance,   icon:<ExternalLink size={10} />, label:"Behance"   },
              ].filter(l=>l.url).map(l=>(
                <a key={l.label} href={l.url!} target="_blank" rel="noopener noreferrer"
                  style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"5px 10px", borderRadius:999, border:"1px solid rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.03)", color:"rgba(255,255,255,0.4)", fontSize:10, textDecoration:"none" }}>
                  {l.icon} {l.label}
                </a>
              ))}
            </div>
          )}

          <a href={`/u/${profile.slug || userId}`} target="_blank" rel="noopener noreferrer"
            style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:999, border:"1px solid rgba(255,102,0,0.25)", background:"rgba(255,102,0,0.06)", color:"#ff6600", fontSize:11, fontWeight:700, textDecoration:"none" }}>
            <ExternalLink size={11} /> Ver perfil completo
          </a>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function Card({ children, accent=false }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <div style={{ borderRadius:20, overflow:"hidden", border:accent?"1px solid rgba(255,102,0,0.2)":"1px solid rgba(255,255,255,0.07)", background:accent?"rgba(255,102,0,0.02)":"rgba(255,255,255,0.02)" }}>
      {children}
    </div>
  );
}

function CardHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ padding:"18px 22px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
      <h2 style={{ fontSize:14, fontWeight:800, color:"#fff", letterSpacing:"-0.02em", margin:0 }}>{title}</h2>
      {sub && <p style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:3 }}>{sub}</p>}
    </div>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────

export default function ContratoPublico() {
  const [, params] = useRoute("/c/:token");
  const token = params?.token;

  const [proposal, setProposal] = useState<PublicProposalWithPix | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [signing, setSigning] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerDocument, setSignerDocument] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [expandedClause, setExpandedClause] = useState<number | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [copied, setCopied] = useState(false);

  const pixKey = proposal?.pixKey ? String(proposal.pixKey).trim() : "";
  const pixKeyType = proposal?.pixKeyType ?? null;
  const hasPixKey = pixKey.length > 0;

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    getPublicProposal(token)
      .then((p: any) => { setProposal(p); setStep(p?.contract?.signed ? 2 : 0); })
      .catch((err) => toast.error(err?.message ?? "Falha ao carregar contrato."))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !proposal) return;
    if (proposal.contract?.signed) { toast.error("Este contrato já foi assinado."); return; }
    if (!signatureDataUrl) { toast.error("Desenhe sua assinatura antes de continuar."); return; }
    if (!agreed) { toast.error("Você precisa aceitar os termos."); return; }
    if (!rateLimiter.check("sign-contract", 3, 5*60*1000)) { toast.error("Muitas tentativas. Aguarde alguns minutos."); return; }
    setSigning(true);
    try {
      const signerNameSafe = validateSignerName(signerName);
      const signerDocumentSafe = normalizeSignerDocument(signerDocument);
      const signatureDataUrlSafe = validateSignatureDataUrl(signatureDataUrl);

      await signProposal(token, {
        signerName: sanitizeInput(signerNameSafe),
        signerDocument: signerDocumentSafe,
        signatureDataUrl: signatureDataUrlSafe,
      });
      toast.success("Contrato assinado com sucesso!");
      const updated: any = await getPublicProposal(token);
      setProposal(updated);
      setStep(2);
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao assinar contrato.");
    } finally {
      setSigning(false);
    }
  };

  const handleCopyPix = async () => {
    if (!hasPixKey) return;
    try {
      await navigator.clipboard.writeText(pixKey);
      setCopied(true); toast.success("Chave PIX copiada!");
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error("Não foi possível copiar. Copie manualmente."); }
  };

  const clauses = [
    { title:"Objeto do Contrato",    content:`Os serviços contratados compreendem: ${proposal?.description ?? "conforme descrito na proposta"}. Atividades não descritas dependem de aditivo contratual escrito.` },
    { title:"Valor e Pagamento",     content:`O contratante pagará o valor de ${proposal ? fmt(proposal.value) : "—"} mediante PIX. O início dos serviços está condicionado à confirmação do pagamento.` },
    { title:"Confidencialidade",     content:"Ambas as partes comprometem-se a manter sigilo sobre informações confidenciais trocadas durante a execução e após o término deste contrato." },
    { title:"Autonomia do Contratado",content:"O contratado é profissional autônomo e executará os serviços com independência técnica, sem vínculo empregatício, nos termos do art. 593 do Código Civil." },
    { title:"Rescisão",              content:"Rescisão por mútuo acordo sem penalidades, com pagamento proporcional. Rescisão unilateral imotivada implica multa de 20% sobre o valor total." },
    { title:"Foro",                  content:"As partes elegem o foro do domicílio do contratante para dirimir quaisquer conflitos decorrentes deste instrumento." },
  ];

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#09090b", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <motion.div animate={{ rotate:360 }} transition={{ duration:1, repeat:Infinity, ease:"linear" }}>
        <div style={{ width:28, height:28, border:"2px solid #ff6600", borderTopColor:"transparent", borderRadius:"50%" }} />
      </motion.div>
    </div>
  );

  if (!proposal) return (
    <div style={{ minHeight:"100vh", background:"#09090b", display:"flex", alignItems:"center", justifyContent:"center", padding:"0 20px" }}>
      <div style={{ textAlign:"center", maxWidth:320 }}>
        <AlertCircle size={44} style={{ color:"rgba(255,255,255,0.12)", margin:"0 auto 16px", display:"block" }} />
        <h2 style={{ fontSize:24, fontWeight:900, letterSpacing:"-0.03em", color:"#fff", marginBottom:8 }}>Link inválido</h2>
        <p style={{ fontSize:13, color:"rgba(255,255,255,0.3)" }}>Este link pode ter expirado ou ser inválido.</p>
      </div>
    </div>
  );

  const signed = !!proposal.contract?.signed;
  const descParagraphs = (proposal.description ?? "").split(/\n+/).filter(Boolean);
  const displaySignatureUrl: string | null = signatureDataUrl ?? (proposal.contract as any)?.signatureDataUrl ?? null;
  const freelancerId: number | null = typeof (proposal as any).userId === "number" ? (proposal as any).userId : null;

  return (
    <div style={{ minHeight:"100vh", background:"#09090b", color:"#fff", fontFamily:"'DM Sans','Inter',sans-serif" }}>
      <div style={{ position:"fixed", top:0, left:0, width:"50%", height:"50%", background:"conic-gradient(from 20deg at 0% 0%, transparent 0deg, rgba(255,102,0,0.03) 18deg, rgba(255,130,0,0.05) 23deg, transparent 38deg)", pointerEvents:"none", zIndex:0 }} />

      <header style={{ position:"sticky", top:0, zIndex:50, borderBottom:"1px solid rgba(255,255,255,0.06)", background:"rgba(9,9,11,0.94)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)" }}>
        <div style={{ maxWidth:680, margin:"0 auto", padding:"0 clamp(16px,4vw,28px)", height:56, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontSize:16, fontWeight:900, letterSpacing:"-0.04em", color:"#fff" }}>
            FECHOU<span style={{ color:"#ff6600", fontStyle:"italic" }}>!</span>
          </span>
          <div style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px", borderRadius:999, border:"1px solid rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.02)" }}>
            <Lock size={10} style={{ color:"#ff6600" }} />
            <span style={{ fontSize:9, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.2em" }}>Documento seguro</span>
          </div>
        </div>
      </header>

      <main style={{ maxWidth:680, margin:"0 auto", padding:"clamp(28px,5vw,48px) clamp(16px,4vw,28px) 60px", position:"relative", zIndex:1 }}>

        {/* freelancer card — só renderiza se userId vier da API */}
        {freelancerId !== null && <FreelancerCard userId={freelancerId} />}

        {/* contrato */}
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} style={{ marginBottom:20 }}>
          <Card accent>
            <div style={{ height:2, background:"linear-gradient(90deg, #ff6600, rgba(255,102,0,0.2))" }} />
            <div style={{ padding:"clamp(18px,4vw,28px)" }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, marginBottom:20 }}>
                <div>
                  <p style={{ fontSize:9, textTransform:"uppercase", letterSpacing:"0.28em", color:"rgba(255,255,255,0.3)", marginBottom:6 }}>Contrato de Serviços Profissionais</p>
                  <h1 style={{ fontSize:"clamp(16px,3vw,22px)", fontWeight:900, letterSpacing:"-0.03em", color:"#fff", lineHeight:1.2, margin:0 }}>{proposal.title}</h1>
                </div>
                <div style={{ flexShrink:0, display:"flex", alignItems:"center", gap:5, padding:"5px 12px", borderRadius:999, fontSize:10, fontWeight:700,
                  background:signed?"rgba(34,197,94,0.08)":"rgba(255,102,0,0.08)",
                  border:`1px solid ${signed?"rgba(34,197,94,0.2)":"rgba(255,102,0,0.2)"}`,
                  color:signed?"#22c55e":"#ff6600" }}>
                  {signed ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                  {signed ? "Assinado" : "Aguardando"}
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:20 }}>
                {[
                  { icon:<User size={10} style={{ color:"rgba(255,255,255,0.3)" }} />,     label:"Cliente",  value:proposal.clientName },
                  { icon:<DollarSign size={10} style={{ color:"#ff6600" }} />,             label:"Valor",    value:fmt(proposal.value), orange:true },
                  { icon:<Calendar size={10} style={{ color:"rgba(255,255,255,0.3)" }} />, label:"Emissão",  value:fmtDate(proposal.createdAt) },
                ].map((m,i) => (
                  <div key={i} style={{ padding:"12px 14px", borderRadius:12, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:5 }}>{m.icon}<span style={{ fontSize:9, textTransform:"uppercase", letterSpacing:"0.16em", color:"rgba(255,255,255,0.3)" }}>{m.label}</span></div>
                    <p style={{ fontSize:12, fontWeight:700, color:(m as any).orange?"#ff6600":"#fff", margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.value}</p>
                  </div>
                ))}
              </div>

              <div>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                  <div style={{ width:2, height:14, background:"#ff6600", borderRadius:999 }} />
                  <span style={{ fontSize:9, textTransform:"uppercase", letterSpacing:"0.22em", color:"rgba(255,255,255,0.35)", fontWeight:700 }}>Escopo do serviço</span>
                </div>
                <div style={{ paddingLeft:10 }}>
                  {descParagraphs.length > 0
                    ? descParagraphs.map((p,i) => <p key={i} style={{ fontSize:13, color:"rgba(255,255,255,0.4)", lineHeight:1.7, margin:"0 0 6px", fontWeight:300 }}>{p}</p>)
                    : <p style={{ fontSize:13, color:"rgba(255,255,255,0.2)" }}>Nenhuma descrição informada.</p>}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        <Steps current={step} />

        <AnimatePresence mode="wait">

          {/* STEP 0 */}
          {step === 0 && !signed && (
            <motion.div key="step0" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }} transition={{ duration:0.2 }}
              style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <Card>
                <CardHeader title="Cláusulas Contratuais" sub="Leia atentamente cada cláusula antes de prosseguir" />
                <div>
                  {clauses.map((clause, i) => (
                    <div key={i} style={{ borderBottom:i<clauses.length-1?"1px solid rgba(255,255,255,0.04)":"none" }}>
                      <button type="button" onClick={() => setExpandedClause(expandedClause===i?null:i)}
                        style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 22px", background:"none", border:"none", cursor:"pointer", textAlign:"left" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                          <div style={{ width:22, height:22, borderRadius:7, background:"rgba(255,102,0,0.08)", border:"1px solid rgba(255,102,0,0.18)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                            <span style={{ fontSize:9, fontWeight:800, color:"#ff6600" }}>{i+1}</span>
                          </div>
                          <span style={{ fontSize:13, fontWeight:600, color:"rgba(255,255,255,0.75)" }}>{clause.title}</span>
                        </div>
                        <motion.div animate={{ rotate:expandedClause===i?180:0 }} transition={{ duration:0.2 }} style={{ flexShrink:0, marginLeft:8 }}>
                          <ChevronDown size={13} style={{ color:"rgba(255,255,255,0.25)" }} />
                        </motion.div>
                      </button>
                      <AnimatePresence>
                        {expandedClause === i && (
                          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:0.2 }} style={{ overflow:"hidden" }}>
                            <p style={{ fontSize:12, color:"rgba(255,255,255,0.35)", lineHeight:1.7, padding:"0 22px 16px 56px", fontWeight:300 }}>{clause.content}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <div style={{ padding:"20px 22px" }}>
                  <label style={{ display:"flex", alignItems:"flex-start", gap:12, cursor:"pointer", marginBottom:16 }}>
                    <div onClick={() => setAgreed(v=>!v)}
                      style={{ marginTop:2, width:18, height:18, borderRadius:6, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s",
                        background:agreed?"#ff6600":"transparent", border:`2px solid ${agreed?"#ff6600":"rgba(255,255,255,0.15)"}` }}>
                      {agreed && <CheckCircle2 size={10} style={{ color:"#fff" }} />}
                    </div>
                    <span style={{ fontSize:12, color:"rgba(255,255,255,0.4)", lineHeight:1.65 }}>
                      Li e concordo com todas as cláusulas deste contrato. Estou ciente que a assinatura digital tem validade jurídica nos termos da{" "}
                      <span style={{ color:"rgba(255,255,255,0.65)" }}>MP 2.200-2/2001</span>.
                    </span>
                  </label>
                  <motion.button type="button" onClick={() => { if (!agreed) { toast.error("Você precisa concordar com os termos."); return; } setStep(1); }}
                    whileHover={{ scale:1.02, background:"#e55a00" }} whileTap={{ scale:0.98 }}
                    style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"14px", borderRadius:14, background:"#ff6600", border:"none", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                    Continuar para assinatura <ArrowRight size={14} />
                  </motion.button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* STEP 1 */}
          {step === 1 && !signed && (
            <motion.div key="step1" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }} transition={{ duration:0.2 }}>
              <Card>
                <CardHeader title="Assinatura Digital" sub="Preencha seus dados e desenhe sua assinatura" />
                <form onSubmit={handleSign} style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:18 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                    {[
                      { label:"Nome completo *", value:signerName,     set:setSignerName,     ph:"Ex: João Silva",  max:200 },
                      { label:"CPF ou CNPJ *",   value:signerDocument, set:setSignerDocument, ph:"000.000.000-00",  max:20  },
                    ].map(f => (
                      <div key={f.label}>
                        <label style={{ display:"block", fontSize:9, textTransform:"uppercase", letterSpacing:"0.2em", color:"rgba(255,255,255,0.3)", marginBottom:6 }}>{f.label}</label>
                        <Input value={f.value} onChange={e=>f.set(e.target.value)} placeholder={f.ph} maxLength={f.max}
                          className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-[#ff6600] rounded-xl" />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label style={{ display:"block", fontSize:9, textTransform:"uppercase", letterSpacing:"0.2em", color:"rgba(255,255,255,0.3)", marginBottom:10 }}>Assinatura *</label>
                    <SignatureCanvas onSave={url=>setSignatureDataUrl(url)} onClear={()=>setSignatureDataUrl(null)} disabled={signing} />
                  </div>
                  {signatureDataUrl && (
                    <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
                      style={{ padding:"12px 16px", borderRadius:12, border:"1px solid rgba(34,197,94,0.2)", background:"rgba(34,197,94,0.04)", display:"flex", alignItems:"center", gap:10 }}>
                      <CheckCircle2 size={12} style={{ color:"#22c55e", flexShrink:0 }} />
                      <p style={{ fontSize:10, textTransform:"uppercase", letterSpacing:"0.16em", color:"#22c55e", margin:0 }}>Assinatura capturada</p>
                      <img src={signatureDataUrl} alt="Assinatura" style={{ maxHeight:36, objectFit:"contain", marginLeft:"auto" }} />
                    </motion.div>
                  )}
                  <div style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"12px 14px", borderRadius:12, border:"1px solid rgba(255,255,255,0.06)", background:"rgba(255,255,255,0.02)" }}>
                    <Shield size={11} style={{ color:"rgba(255,102,0,0.5)", marginTop:2, flexShrink:0 }} />
                    <p style={{ fontSize:11, color:"rgba(255,255,255,0.3)", lineHeight:1.6, margin:0 }}>
                      Ao assinar, você confirma que as informações são verdadeiras e que esta assinatura digital tem validade jurídica nos termos da{" "}
                      <strong style={{ color:"rgba(255,255,255,0.5)" }}>MP 2.200-2/2001</strong>.
                    </p>
                  </div>
                  <div style={{ display:"flex", gap:10 }}>
                    <button type="button" onClick={()=>setStep(0)} disabled={signing}
                      style={{ padding:"12px 18px", borderRadius:12, border:"1px solid rgba(255,255,255,0.08)", background:"transparent", color:"rgba(255,255,255,0.35)", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
                      Voltar
                    </button>
                    <motion.button type="submit" disabled={signing||!signatureDataUrl}
                      whileHover={!signing&&signatureDataUrl?{ scale:1.02, background:"#e55a00" }:{}}
                      whileTap={!signing&&signatureDataUrl?{ scale:0.98 }:{}}
                      style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"12px", borderRadius:12, fontSize:13, fontWeight:700,
                        cursor:signing||!signatureDataUrl?"not-allowed":"pointer", fontFamily:"inherit", transition:"background 0.2s",
                        background:signing||!signatureDataUrl?"rgba(255,255,255,0.04)":"#ff6600",
                        border:signing||!signatureDataUrl?"1px solid rgba(255,255,255,0.07)":"none",
                        color:signing||!signatureDataUrl?"rgba(255,255,255,0.2)":"#fff" }}>
                      {signing
                        ? <><motion.div animate={{ rotate:360 }} transition={{ duration:1, repeat:Infinity, ease:"linear" }} style={{ width:14, height:14, border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", borderRadius:"50%" }} /> Assinando...</>
                        : <><Pen size={13} /> Assinar contrato</>}
                    </motion.button>
                  </div>
                </form>
              </Card>
            </motion.div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity:0, scale:0.98 }} animate={{ opacity:1, scale:1 }} transition={{ duration:0.25 }}
              style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <Card>
                <div style={{ height:2, background:"linear-gradient(90deg, #22c55e, rgba(34,197,94,0.2))" }} />
                <div style={{ padding:"20px 22px", display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ width:44, height:44, borderRadius:14, background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.18)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <CheckCircle2 size={20} style={{ color:"#22c55e" }} />
                  </div>
                  <div>
                    <h2 style={{ fontSize:16, fontWeight:800, color:"#fff", margin:"0 0 2px" }}>Contrato assinado!</h2>
                    {proposal.contract?.signerName && (
                      <p style={{ fontSize:12, color:"rgba(255,255,255,0.35)", margin:0 }}>
                        Por <strong style={{ color:"rgba(255,255,255,0.65)" }}>{proposal.contract.signerName}</strong>
                        {proposal.contract.signedAt && ` · ${fmtDate(proposal.contract.signedAt)}`}
                      </p>
                    )}
                  </div>
                </div>
              </Card>

              {proposal.contract?.canPay && (
                <Card>
                  <CardHeader title="Pagamento via PIX" sub={`Transfira ${fmt(proposal.value)} para a chave abaixo`} />
                  <div style={{ padding:"18px 22px" }}>
                    {!hasPixKey ? (
                      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", borderRadius:12, border:"1px solid rgba(239,68,68,0.18)", background:"rgba(239,68,68,0.04)" }}>
                        <AlertCircle size={13} style={{ color:"#f87171", flexShrink:0 }} />
                        <p style={{ fontSize:12, color:"#f87171", margin:0 }}>O prestador ainda não configurou uma chave PIX. Entre em contato diretamente.</p>
                      </div>
                    ) : (
                      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                        <div style={{ padding:"14px 16px", borderRadius:14, border:"1px solid rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.02)", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
                          <div style={{ minWidth:0 }}>
                            <p style={{ fontSize:9, textTransform:"uppercase", letterSpacing:"0.2em", color:"rgba(255,255,255,0.3)", marginBottom:5 }}>{pixTypeLabel(pixKeyType)}</p>
                            <p style={{ fontFamily:"monospace", fontWeight:700, color:"#fff", fontSize:13, wordBreak:"break-all", margin:0 }}>{pixKey}</p>
                            <p style={{ fontSize:10, color:"rgba(255,255,255,0.2)", marginTop:3 }}>{maskPixKey(pixKey,pixKeyType)}</p>
                          </div>
                          <motion.button type="button" onClick={handleCopyPix} whileTap={{ scale:0.95 }}
                            style={{ flexShrink:0, display:"flex", alignItems:"center", gap:6, padding:"9px 16px", borderRadius:10, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s",
                              background:copied?"rgba(34,197,94,0.1)":"#ff6600", border:copied?"1px solid rgba(34,197,94,0.25)":"none", color:copied?"#22c55e":"#fff" }}>
                            {copied ? <><CheckCircle2 size={12} />Copiado!</> : <><Copy size={12} />Copiar</>}
                          </motion.button>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", borderRadius:12, border:"1px solid rgba(255,102,0,0.18)", background:"rgba(255,102,0,0.04)" }}>
                          <span style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>Valor a transferir</span>
                          <span style={{ fontSize:22, fontWeight:900, letterSpacing:"-0.04em", color:"#ff6600" }}>{fmt(proposal.value)}</span>
                        </div>
                        <div style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"12px 14px", borderRadius:12, border:"1px solid rgba(255,255,255,0.05)", background:"rgba(255,255,255,0.02)" }}>
                          <Shield size={11} style={{ color:"rgba(255,255,255,0.2)", marginTop:2, flexShrink:0 }} />
                          <p style={{ fontSize:11, color:"rgba(255,255,255,0.28)", lineHeight:1.6, margin:0 }}>
                            Após realizar o pagamento, envie o comprovante ao prestador. O serviço será iniciado após a confirmação do recebimento.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              <Card>
                <CardHeader title="Resumo do contrato" />
                <div style={{ padding:"0 22px" }}>
                  {[
                    { label:"Contrato",           value:proposal.title },
                    { label:"Cliente",             value:proposal.clientName },
                    { label:"Valor",               value:fmt(proposal.value) },
                    { label:"Emissão",             value:fmtDate(proposal.createdAt) },
                    proposal.contract?.signerName  ? { label:"Assinado por",       value:proposal.contract.signerName } : null,
                    proposal.contract?.signedAt    ? { label:"Data da assinatura", value:fmtDate(proposal.contract.signedAt) } : null,
                  ].filter(Boolean).map((item:any) => (
                    <div key={item.label} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ fontSize:9, textTransform:"uppercase", letterSpacing:"0.2em", color:"rgba(255,255,255,0.25)" }}>{item.label}</span>
                      <span style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.7)" }}>{item.value}</span>
                    </div>
                  ))}
                  {displaySignatureUrl && (
                    <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} style={{ padding:"16px 0" }}>
                      <p style={{ fontSize:9, textTransform:"uppercase", letterSpacing:"0.2em", color:"rgba(255,255,255,0.25)", marginBottom:10 }}>Assinatura do contratante</p>
                      <div style={{ position:"relative", borderRadius:12, overflow:"hidden", border:"1px solid rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.02)", padding:"16px 16px 32px" }}>
                        <img src={displaySignatureUrl} alt="Assinatura" style={{ maxHeight:72, objectFit:"contain" }} />
                        <div style={{ position:"absolute", bottom:28, left:12, right:12, height:1, background:"rgba(255,255,255,0.06)", pointerEvents:"none" }} />
                        <div style={{ position:"absolute", bottom:9, left:12, fontSize:8, color:"rgba(255,255,255,0.12)", textTransform:"uppercase", letterSpacing:"0.2em" }}>Assinatura</div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <p style={{ textAlign:"center", fontSize:10, color:"rgba(255,255,255,0.12)", paddingTop:24, letterSpacing:"0.04em" }}>
          Documento gerado por FECHOU! · fechou.app · Válido nos termos da legislação brasileira
        </p>
      </main>
    </div>
  );
}
