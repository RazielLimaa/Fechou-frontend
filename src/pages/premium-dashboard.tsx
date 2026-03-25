import React, { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/landing/Navbar";
import Footer from "../components/landing/Footer";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Sector,
  ComposedChart, Line, Area,
} from "recharts";
import {
  TrendingUp, AlertCircle, Clock, ShieldCheck,
  ArrowLeft, Flame, Target, Star,
  Activity, Zap, TrendingDown, CheckCircle2,
  ArrowUpRight, ArrowDownRight, Users, BarChart2,
  ChevronDown, ChevronUp, Info, X, Brain,
  MessageCircle, Mail, Phone, Video, MapPin,
  Lightbulb, BookOpen, RefreshCw, Check, XCircle,
  AlertTriangle, Sparkles,
} from "lucide-react";
import { useLocation } from "wouter";
import { usePlan } from "../hooks/use-plan";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { listProposals, type ApiProposal, type ApiProposalStatus } from "../service/proposals";
import { api } from "../services/api";

// ─── Types ────────────────────────────────────────────────────────────────────
export type PeriodType = "monthly" | "weekly";
type InsightLevel = "info" | "warning" | "critical";
const DISPLAY_MAX = 64;

// ─── Security helpers ─────────────────────────────────────────────────────────
function sanitizeText(raw: unknown, maxLen = DISPLAY_MAX): string {
  if (raw === null || raw === undefined) return "";
  const str = String(raw)
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/[<>"'`]/g, (c) =>
      ({ "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;" }[c] ?? c)
    ).trim();
  return str.length > maxLen ? str.slice(0, maxLen) + "…" : str;
}
function safeNum(v: unknown): number {
  const n = Number(v); return isFinite(n) ? n : 0;
}

// ─── Formatters ───────────────────────────────────────────────────────────────
const cn = (...inputs: any[]) => inputs.filter(Boolean).join(" ");
const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(v);
const fmtK = (v: number) => v >= 1000 ? `R$${(v / 1000).toFixed(1)}k` : fmt(v);
const fmtPct = (v: number) => `${v.toFixed(1)}%`;
const safeFmtK = (v: unknown) => fmtK(safeNum(v));
const safeFmtPct = (v: unknown) => fmtPct(safeNum(v));

// ─── Date helpers ─────────────────────────────────────────────────────────────
function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function daysBetween(a: Date, b: Date = new Date()) {
  return Math.max(0, Math.floor((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000));
}
function monthKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; }
function weekKey(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2,"0")}`;
}
function shortLabel(key: string, type: PeriodType) {
  if (type === "weekly") return key.replace(/^\d{4}-/, "");
  const [y,m] = key.split("-");
  return `${["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][+m-1]}/${y.slice(2)}`;
}
function buildPeriodBuckets(period: PeriodType, count: number) {
  const keys: string[] = []; const cursor = new Date();
  for (let i=0;i<count;i++) {
    keys.unshift(period === "monthly" ? monthKey(cursor) : weekKey(cursor));
    if (period === "monthly") cursor.setMonth(cursor.getMonth()-1);
    else cursor.setDate(cursor.getDate()-7);
  }
  return keys;
}

// ─── Data mappers ─────────────────────────────────────────────────────────────
function apiStatusToUi(s: ApiProposalStatus): "pending"|"cancelled"|"completed" {
  if (s === "vendida") return "completed"; if (s === "cancelada") return "cancelled"; return "pending";
}
function toUiProposal(p: ApiProposal) {
  return {
    id: sanitizeText(p.id, 64),
    clientName: sanitizeText(p.clientName),
    title: sanitizeText(p.title),
    value: safeNum(p.value),
    status: apiStatusToUi(p.status),
    createdAt: new Date(p.createdAt),
  };
}
type UiProposal = ReturnType<typeof toUiProposal>;

// ─── Chart builders ───────────────────────────────────────────────────────────
function buildCharts(proposals: UiProposal[], period: PeriodType) {
  const count = period === "monthly" ? 8 : 10;
  const buckets = buildPeriodBuckets(period, count);
  const map = new Map<string, { name:string; sold:number; pending:number; revenue:number; cancelled:number; convRate:number }>();
  for (const k of buckets) map.set(k, { name:shortLabel(k,period), sold:0, pending:0, revenue:0, cancelled:0, convRate:0 });
  for (const p of proposals) {
    const k = period === "monthly" ? monthKey(p.createdAt) : weekKey(p.createdAt);
    const b = map.get(k); if (!b) continue;
    if (p.status === "completed") { b.sold++; b.revenue += p.value; }
    else if (p.status === "pending") b.pending++;
    else if (p.status === "cancelled") b.cancelled++;
  }
  for (const b of map.values()) { const d = b.sold+b.cancelled; b.convRate = d>0?Math.round((b.sold/d)*100):0; }
  return buckets.map(k => map.get(k)!);
}
function buildRevenueTimeline(proposals: UiProposal[], period: PeriodType) {
  const count = period === "monthly" ? 8 : 10;
  const buckets = buildPeriodBuckets(period, count);
  const map = new Map<string, { name:string; revenue:number; cumulative:number }>();
  for (const k of buckets) map.set(k, { name:shortLabel(k,period), revenue:0, cumulative:0 });
  for (const p of proposals.filter(x=>x.status==="completed")) {
    const k = period === "monthly" ? monthKey(p.createdAt) : weekKey(p.createdAt);
    const b = map.get(k); if (b) b.revenue += p.value;
  }
  let cum = 0;
  return buckets.map(k => { const b = map.get(k)!; cum += b.revenue; return { ...b, cumulative:cum }; });
}
function buildTicketTrend(proposals: UiProposal[], period: PeriodType) {
  const count = period === "monthly" ? 8 : 10;
  const buckets = buildPeriodBuckets(period, count);
  const map = new Map<string, { name:string; total:number; count:number; avg:number }>();
  for (const k of buckets) map.set(k, { name:shortLabel(k,period), total:0, count:0, avg:0 });
  for (const p of proposals.filter(x=>x.status==="completed")) {
    const k = period === "monthly" ? monthKey(p.createdAt) : weekKey(p.createdAt);
    const b = map.get(k); if (b) { b.total += p.value; b.count++; }
  }
  return buckets.map(k => { const b = map.get(k)!; b.avg = b.count>0?Math.round(b.total/b.count):0; return b; });
}
function buildAgingData(proposals: UiProposal[]) {
  const now = new Date();
  const pending = proposals.filter(p => p.status === "pending");
  const buckets = [
    { name:"0–2 dias",  label:"Novo",      color:"#22c55e", value:0, totalValue:0 },
    { name:"3–6 dias",  label:"Follow-up", color:"#f59e0b", value:0, totalValue:0 },
    { name:"7–13 dias", label:"Atenção",   color:"#f97316", value:0, totalValue:0 },
    { name:"14d+",      label:"Crítico",   color:"#ef4444", value:0, totalValue:0 },
  ];
  for (const p of pending) {
    const age = daysBetween(p.createdAt, now);
    const b = age<=2?buckets[0]:age<=6?buckets[1]:age<=13?buckets[2]:buckets[3];
    b.value++; b.totalValue += p.value;
  }
  return buckets;
}
function buildStatusPie(proposals: UiProposal[]) {
  return [
    { name:"Fechadas",   value:proposals.filter(p=>p.status==="completed").length, color:"#FF6600" },
    { name:"Pendentes",  value:proposals.filter(p=>p.status==="pending").length,   color:"#3b82f6" },
    { name:"Canceladas", value:proposals.filter(p=>p.status==="cancelled").length, color:"#374151" },
  ].filter(d => d.value > 0);
}
function buildClientRanking(proposals: UiProposal[]) {
  const map = new Map<string, { name:string; total:number; count:number; won:number }>();
  for (const p of proposals) {
    if (!map.has(p.clientName)) map.set(p.clientName, { name:p.clientName, total:0, count:0, won:0 });
    const c = map.get(p.clientName)!; c.count++;
    if (p.status === "completed") { c.total += p.value; c.won++; }
  }
  return [...map.values()].sort((a,b)=>b.total-a.total).slice(0,6).map(c=>({ ...c, convRate:c.count?(c.won/c.count)*100:0 }));
}
function buildForecast(proposals: UiProposal[]) {
  const now = new Date();
  const sold = proposals.filter(p => p.status === "completed");
  const months: number[] = [];
  for (let i=2;i>=0;i--) { const d=new Date(now); d.setMonth(d.getMonth()-i); months.push(sold.filter(p=>monthKey(p.createdAt)===monthKey(d)).reduce((s,p)=>s+p.value,0)); }
  const avg = months.reduce((s,v)=>s+v,0)/3;
  const trend = months[0]>0?(months[2]-months[0])/months[0]:0;
  return { conservative:avg*0.7, base:avg, optimistic:avg*(1+Math.min(trend,0.5)), months };
}
function computeHealth(proposals: UiProposal[]) {
  const now = new Date();
  const pending=proposals.filter(p=>p.status==="pending");
  const sold=proposals.filter(p=>p.status==="completed");
  const cancelled=proposals.filter(p=>p.status==="cancelled");
  const agingAvg = pending.length===0?0:pending.reduce((a,p)=>a+daysBetween(p.createdAt,now),0)/pending.length;
  const denom = sold.length+cancelled.length;
  const convRate = denom===0?0:(sold.length/denom)*100;
  let score = Math.min(50,convRate*0.5)+Math.max(0,30-agingAvg*2)+Math.max(0,20-pending.length*2);
  score = Math.round(Math.max(0,Math.min(100,score)));
  const reasons: string[] = [];
  if (convRate<15) reasons.push("Conversão abaixo de 15% — revise proposta e follow-up.");
  if (agingAvg>=7) reasons.push("Pendências envelhecendo — priorize as mais antigas.");
  if (pending.length>=5) reasons.push("Muitas pendências abertas — reduza gargalos.");
  if (reasons.length===0) reasons.push("Funil saudável — mantenha a cadência.");
  return { score, reasons, agingAvg };
}
function buildInsights(proposals: UiProposal[]) {
  const now=new Date();
  const pending=proposals.filter(p=>p.status==="pending");
  const sold=proposals.filter(p=>p.status==="completed");
  const cancelled=proposals.filter(p=>p.status==="cancelled");
  const denom=sold.length+cancelled.length;
  const convRate=denom===0?0:(sold.length/denom)*100;
  const avgTicket=sold.length?sold.reduce((s,p)=>s+p.value,0)/sold.length:0;
  const pendingOld=pending.filter(p=>daysBetween(p.createdAt,now)>=14);
  const bigPending=[...pending].sort((a,b)=>b.value-a.value)[0];
  const d30=new Date();d30.setDate(d30.getDate()-30);
  const d60=new Date();d60.setDate(d60.getDate()-60);
  const curr30=sold.filter(p=>p.createdAt>=d30).length;
  const prev30=sold.filter(p=>p.createdAt>=d60&&p.createdAt<d30).length;
  const trendPct=prev30?((curr30-prev30)/prev30)*100:0;
  const avgDaysClose=sold.length?sold.reduce((s,p)=>s+daysBetween(p.createdAt,now),0)/sold.length:0;
  const items:{id:string;level:InsightLevel;title:string;metric:string;description:string;action:string;icon:any}[]=[];
  if(convRate<15) items.push({id:"conv-low",level:"critical",icon:Target,title:"Conversão muito baixa",metric:fmtPct(convRate),description:"Menos de 15% das propostas fecham.",action:"Adicione validade ('válida por 7 dias') e contate o cliente 48h após enviar."});
  else if(convRate<35) items.push({id:"conv-mid",level:"warning",icon:Target,title:"Conversão abaixo do ideal",metric:fmtPct(convRate),description:"Freelancers top convertem 40–60%.",action:"Teste pacotes com preço âncora e responda objeções com ROI."});
  else items.push({id:"conv-good",level:"info",icon:CheckCircle2,title:"Conversão saudável",metric:fmtPct(convRate),description:"Sua taxa está acima de 35%.",action:"Aumente o volume de envios e o ticket médio."});
  if(pendingOld.length>0){const v=pendingOld.reduce((s,p)=>s+p.value,0);items.push({id:"aging",level:pendingOld.length>=3?"critical":"warning",icon:Flame,title:`${pendingOld.length} proposta${pendingOld.length>1?"s":""} crítica${pendingOld.length>1?"s":""}`,metric:`${fmtK(v)} em risco`,description:"Sem resposta há mais de 14 dias.",action:`Envie: 'Oi [nome], ainda faz sentido avançarmos?'`});}
  if(bigPending) items.push({id:"big",level:bigPending.value>=5000?"warning":"info",icon:Star,title:"Maior oportunidade em aberto",metric:fmtK(bigPending.value),description:`${sanitizeText(bigPending.clientName)} — ${daysBetween(bigPending.createdAt,now)} dias em aberto.`,action:"Priorize este cliente agora."});
  if(trendPct<-20) items.push({id:"td",level:"critical",icon:TrendingDown,title:"Queda de vendas detectada",metric:`−${Math.abs(trendPct).toFixed(0)}%`,description:"Você fechou menos nos últimos 30 dias.",action:"Envie pelo menos 3 novas propostas esta semana."});
  else if(trendPct>20) items.push({id:"tu",level:"info",icon:TrendingUp,title:"Crescimento acelerado",metric:`+${trendPct.toFixed(0)}%`,description:"Ótimo ritmo!",action:"Considere aumentar preços para escalar receita."});
  if(avgDaysClose>14&&sold.length>=3) items.push({id:"slow",level:"warning",icon:Clock,title:"Ciclo de venda lento",metric:`~${avgDaysClose.toFixed(0)}d`,description:`Leva ~${avgDaysClose.toFixed(0)} dias para fechar.`,action:"Adicione validade de 7 dias e ofereça bônus por decisão rápida."});
  if(avgTicket>0&&avgTicket<2000&&sold.length>=3) items.push({id:"ticket",level:"warning",icon:ArrowUpRight,title:"Ticket médio pode crescer",metric:fmtK(avgTicket),description:"Abaixo de R$2.000.",action:"Crie um pacote 'completo' com serviços extras."});
  return items.slice(0,6);
}
function buildActions(proposals: UiProposal[]) {
  const now=new Date();
  const pending=proposals.filter(p=>p.status==="pending");
  const sold=proposals.filter(p=>p.status==="completed");
  const cancelled=proposals.filter(p=>p.status==="cancelled");
  const old=pending.filter(p=>daysBetween(p.createdAt,now)>=14);
  const denom=sold.length+cancelled.length;
  const convRate=denom===0?0:(sold.length/denom)*100;
  const list:{id:string;priority:"P1"|"P2"|"P3";title:string;description:string;why:string}[]=[];
  if(old.length>0) list.push({id:"a1",priority:"P1",title:"Follow-up nas propostas +14d",description:"Envie mensagem objetiva com próximo passo.",why:"Após 14 dias, chances de fechar caem abaixo de 20%."});
  if(convRate<30) list.push({id:"a2",priority:"P2",title:"Padronizar respostas a objeções",description:"Crie respostas prontas para preço e prazo.",why:"Respostas preparadas aumentam conversão em até 25%."});
  if(pending.length>=5) list.push({id:"a3",priority:"P2",title:"Organizar pipeline por prioridade",description:"Foque nos de maior valor e mais tempo aberto.",why:"Pipeline organizado reduz o ciclo de fechamento."});
  if(list.length===0) list.push({id:"a0",priority:"P3",title:"Manter cadência e aumentar volume",description:"Funil saudável. Aumente envio de propostas.",why:"Mais propostas = mais receita com a conversão atual."});
  return list.slice(0,4);
}

// ─── Copilot API types ────────────────────────────────────────────────────────
type CopilotApproach = {
  tone: string; channel: string; subject?: string;
  opening: string; body: string; cta: string;
  fullMessage: string; bestTime: string; followUpIn: string;
};
type CopilotAction = {
  proposalId: number; clientName: string; proposalTitle: string;
  stage: string; value: number; event: string; intent: string;
  priorityScore: number; whyNow: string; riskIfIgnore: string;
  contractAnalysis: string; approaches: CopilotApproach[];
};
type CopilotTip = {
  category: string; title: string; insight: string;
  actionable: string; priority: string;
};
type CopilotAlert = {
  id: string; severity: "critical"|"warning"|"info"|"celebration";
  title: string; message: string; actionLabel?: string;
  proposalId?: number; metric?: string;
};
type CopilotDiagnosis = {
  overallHealth: string; healthScore: number; conversionRate: number;
  avgCycledays: number; avgTicket: number; bottleneck: string;
  momentum: string; criticalProposals: number; recommendations: string[];
};
type CopilotPlan = {
  generatedAt: string;
  ritual: { objective: string; maxMinutes: number; mood: string };
  pipelineDiagnosis: CopilotDiagnosis;
  dashboardAlerts: CopilotAlert[];
  developmentTips: CopilotTip[];
  primaryAction: CopilotAction | null;
  secondaryActions: CopilotAction[];
  totalAnalyzed: number; totalRecommended: number;
  nextCheckIn: string;
};

// ─── Copilot API calls ────────────────────────────────────────────────────────
async function fetchCopilotPlan(): Promise<CopilotPlan> {
  const { data } = await api.get("/api/copilot/today");
  return data;
}
async function markDone(proposalId: number) {
  await api.post(`/api/copilot/actions/${proposalId}/done`);
}
async function markDismiss(proposalId: number) {
  await api.post(`/api/copilot/actions/${proposalId}/dismiss`);
}

// ─── Recharts ─────────────────────────────────────────────────────────────────
const TT_STYLE: React.CSSProperties = { backgroundColor:"#111", border:"1px solid rgba(255,102,0,0.2)", borderRadius:"8px", fontSize:"11px", color:"#fff", boxShadow:"0 8px 32px rgba(0,0,0,0.6)" };
function ActiveShape(props: any) {
  const { cx,cy,innerRadius,outerRadius,startAngle,endAngle,fill,payload,value } = props;
  return (<g>
    <text x={cx} y={cy-8} textAnchor="middle" fill="#fff" fontSize={18} fontWeight={900}>{value}</text>
    <text x={cx} y={cy+12} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={10} fontWeight={700}>{sanitizeText(payload.name,20)}</text>
    <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius+6} startAngle={startAngle} endAngle={endAngle} fill={fill}/>
    <Sector cx={cx} cy={cy} innerRadius={outerRadius+10} outerRadius={outerRadius+13} startAngle={startAngle} endAngle={endAngle} fill={fill}/>
  </g>);
}


// ─── UI Components ────────────────────────────────────────────────────────────
function InfoBadge({text}:{text:string}) {
  return (
    <TooltipProvider><Tooltip>
      <TooltipTrigger className="inline-flex ml-1 align-middle">
        <Info size={10} className="text-white/20 hover:text-white/50 transition-colors"/>
      </TooltipTrigger>
      <TooltipContent className="max-w-[220px] bg-[#111] border-white/10 text-xs text-white/70 leading-relaxed">{text}</TooltipContent>
    </Tooltip></TooltipProvider>
  );
}
function InfoPopup({title,children,onClose,wide=false}:{title:string;children:React.ReactNode;onClose:()=>void;wide?:boolean}) {
  useEffect(()=>{ const h=(e:KeyboardEvent)=>{ if(e.key==="Escape") onClose(); }; window.addEventListener("keydown",h); return ()=>window.removeEventListener("keydown",h); },[onClose]);
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{background:"rgba(0,0,0,0.9)",backdropFilter:"blur(8px)"}}
      onClick={onClose} role="dialog" aria-modal="true">
      <motion.div initial={{opacity:0,scale:0.93,y:24}} animate={{opacity:1,scale:1,y:0}}
        exit={{opacity:0,scale:0.93,y:24}} transition={{ease:[0.23,1,0.32,1],duration:0.3}}
        className={cn("relative rounded-2xl border border-[#FF6600]/25 bg-[#0d0d0d] p-7 w-full overflow-y-auto max-h-[90vh]", wide?"max-w-2xl":"max-w-md")}
        style={{boxShadow:"0 0 80px rgba(255,102,0,0.1),0 30px 60px rgba(0,0,0,0.9)"}}
        onClick={e=>e.stopPropagation()}>
        <div className="absolute top-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-[#FF6600] to-transparent"/>
        <div className="flex items-center justify-between mb-5">
          <span className="text-[9px] font-black uppercase tracking-[0.35em] text-[#FF6600]">{sanitizeText(title,80)}</span>
          <button onClick={onClose} aria-label="Fechar" className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
            <X size={12} className="text-white/50"/>
          </button>
        </div>
        <div className="text-[13px] text-white/55 leading-relaxed">{children}</div>
      </motion.div>
    </motion.div>
  );
}
function SectionLabel({number,title,sub}:{number:string;title:string;sub:string}) {
  return (
    <div className="mb-8 flex items-end gap-5 border-b border-white/[0.05] pb-6">
      <span className="text-[72px] font-black leading-none text-white/[0.05] select-none tabular-nums">{number}</span>
      <div className="pb-1.5">
        <h2 className="text-2xl font-black tracking-tighter text-white uppercase">{title}</h2>
        <p className="text-[10px] text-white/25 mt-0.5 uppercase tracking-[0.25em] font-bold">{sub}</p>
      </div>
    </div>
  );
}

// ─── Channel icon ─────────────────────────────────────────────────────────────
function ChannelIcon({channel}:{channel:string}) {
  const map: Record<string,React.ReactNode> = {
    whatsapp:   <MessageCircle size={12}/>,
    email:      <Mail size={12}/>,
    ligacao:    <Phone size={12}/>,
    loom:       <Video size={12}/>,
    presencial: <MapPin size={12}/>,
  };
  return <>{map[channel] ?? <MessageCircle size={12}/>}</>;
}

// ─── Copilot Section ──────────────────────────────────────────────────────────
function CopilotSection({openPopup}:{openPopup:(t:string,c:React.ReactNode,w?:boolean)=>void}) {
  const [selectedTone, setSelectedTone] = useState<string>("curto");
  const [expandedAction, setExpandedAction] = useState<number|null>(null);
  const [doneIds, setDoneIds]   = useState<Set<number>>(new Set());
  const [skipIds, setSkipIds]   = useState<Set<number>>(new Set());

  const planQ = useQuery({
    queryKey: ["copilot:today"],
    queryFn: fetchCopilotPlan,
    staleTime: 2 * 60_000,
    retry: false,
  });
  const plan = planQ.data;

  const handleDone = async (id: number) => {
    try { await markDone(id); } catch {}
    setDoneIds(prev => new Set([...prev, id]));
  };
  const handleSkip = async (id: number) => {
    try { await markDismiss(id); } catch {}
    setSkipIds(prev => new Set([...prev, id]));
  };

  const tones = ["curto","consultivo","direto","empático","provocativo"];
  const toneLabels: Record<string,string> = { curto:"Curto", consultivo:"Consultivo", direto:"Direto", empático:"Empático", provocativo:"Provocativo" };

  const severityConfig = {
    critical:    { bg:"bg-rose-500/[0.06]",    border:"border-rose-500/20",    icon:<AlertTriangle size={12} className="text-rose-400"/>,  label:"Crítico" },
    warning:     { bg:"bg-amber-500/[0.05]",   border:"border-amber-500/15",   icon:<AlertCircle size={12} className="text-amber-400"/>,    label:"Atenção" },
    info:        { bg:"bg-white/[0.02]",        border:"border-white/[0.07]",   icon:<Info size={12} className="text-white/35"/>,            label:"Info" },
    celebration: { bg:"bg-emerald-500/[0.05]", border:"border-emerald-500/15", icon:<Sparkles size={12} className="text-emerald-400"/>,     label:"🎉" },
  };

  const categoryIcon: Record<string,React.ReactNode> = {
    precificacao: <Target size={11} className="text-[#FF6600]"/>,
    comunicacao:  <MessageCircle size={11} className="text-blue-400"/>,
    processo:     <Zap size={11} className="text-amber-400"/>,
    posicionamento:<Star size={11} className="text-purple-400"/>,
    mindset:      <Brain size={11} className="text-emerald-400"/>,
    tecnica:      <BookOpen size={11} className="text-white/40"/>,
  };

  const allActions = plan ? [plan.primaryAction, ...plan.secondaryActions].filter(Boolean).filter(a => !doneIds.has(a!.proposalId) && !skipIds.has(a!.proposalId)) as CopilotAction[] : [];

  function openApproachPopup(action: CopilotAction) {
    const approach = action.approaches.find(a => a.tone === selectedTone) ?? action.approaches[0];
    openPopup(
      `Abordagem — ${sanitizeText(action.clientName)}`,
      <div className="space-y-5">
        {/* Análise do contrato */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <p className="text-[9px] font-black uppercase tracking-widest text-[#FF6600] mb-2">Análise do Contrato</p>
          <p className="text-[12px] text-white/55 leading-relaxed">{action.contractAnalysis}</p>
        </div>
        {/* Por que agora */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
            <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold mb-1">Por que agora</p>
            <p className="text-[11px] text-white/60 leading-relaxed">{action.whyNow}</p>
          </div>
          <div className="p-3 rounded-lg bg-rose-500/[0.05] border border-rose-500/15">
            <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold mb-1">Risco se ignorar</p>
            <p className="text-[11px] text-white/55 leading-relaxed">{action.riskIfIgnore}</p>
          </div>
        </div>
        {/* Seletor de tom */}
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">Tom da abordagem</p>
          <div className="flex flex-wrap gap-1">
            {tones.map(t=>(
              <button key={t} onClick={()=>setSelectedTone(t)}
                className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                  selectedTone===t?"bg-[#FF6600] text-white":"bg-white/[0.05] text-white/40 hover:text-white hover:bg-white/[0.08]")}>
                {toneLabels[t]}
              </button>
            ))}
          </div>
        </div>
        {/* Abordagem */}
        {approach && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-[10px] text-white/40 font-bold uppercase tracking-wider">
                <ChannelIcon channel={approach.channel}/>{approach.channel}
              </div>
              {approach.subject && <span className="text-[10px] text-white/25">· Assunto: {approach.subject}</span>}
            </div>
            <div className="p-4 rounded-xl bg-[#FF6600]/[0.05] border border-[#FF6600]/20">
              <p className="text-[9px] font-black uppercase tracking-widest text-[#FF6600] mb-2">Mensagem pronta para copiar</p>
              <p className="text-[12px] text-white/70 leading-relaxed whitespace-pre-line">{approach.fullMessage}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                <p className="text-[9px] text-white/25 uppercase tracking-widest font-bold mb-1">Melhor horário</p>
                <p className="text-white/55">{approach.bestTime}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                <p className="text-[9px] text-white/25 uppercase tracking-widest font-bold mb-1">Próximo follow-up</p>
                <p className="text-white/55">{approach.followUpIn}</p>
              </div>
            </div>
            {/* Todas as abordagens */}
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-white/25 mb-2">Outras abordagens disponíveis</p>
              <div className="space-y-1.5">
                {action.approaches.filter(a=>a.tone!==selectedTone).map(a=>(
                  <button key={a.tone} onClick={()=>setSelectedTone(a.tone)}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:border-[#FF6600]/20 transition-all group text-left">
                    <div className="flex items-center gap-2">
                      <ChannelIcon channel={a.channel}/>
                      <span className="text-[10px] font-bold text-white/50 group-hover:text-white/70 transition-colors">{toneLabels[a.tone] ?? a.tone}</span>
                    </div>
                    <span className="text-[9px] text-white/25 uppercase tracking-widest">{a.channel}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* Ações */}
        <div className="flex gap-2 pt-2">
          <button onClick={()=>{ handleDone(action.proposalId); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[11px] font-black uppercase tracking-widest hover:bg-emerald-500/25 transition-all">
            <Check size={12}/> Feito
          </button>
          <button onClick={()=>{ handleSkip(action.proposalId); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/40 text-[11px] font-black uppercase tracking-widest hover:bg-white/[0.08] transition-all">
            <XCircle size={12}/> Pular
          </button>
        </div>
      </div>,
      true
    );
  }

  if (planQ.isLoading) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d0d] p-12 flex flex-col items-center gap-4">
        <motion.div animate={{rotate:360}} transition={{repeat:Infinity,duration:1.5,ease:"linear"}}>
          <Brain className="w-8 h-8 text-[#FF6600]/50"/>
        </motion.div>
        <p className="text-[11px] text-white/25 uppercase tracking-widest font-bold">Analisando seu pipeline…</p>
      </div>
    );
  }
  if (planQ.isError || !plan) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d0d] p-8 text-center">
        <p className="text-[12px] text-white/30">Copiloto indisponível no momento. Tente novamente em breve.</p>
        <button onClick={()=>planQ.refetch()} className="mt-3 flex items-center gap-1.5 mx-auto text-[#FF6600] text-[11px] font-black uppercase tracking-widest hover:opacity-70 transition-opacity">
          <RefreshCw size={11}/> Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Ritual do dia + mood */}
      <div className="p-6 rounded-2xl border border-[#FF6600]/20 bg-[#FF6600]/[0.03] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.35em] text-[#FF6600] mb-1">Ritual de hoje</p>
          <p className="text-[13px] text-white/70 leading-relaxed">{plan.ritual.objective}</p>
          <p className="text-[11px] text-white/35 mt-1 italic">"{plan.ritual.mood}"</p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
          <p className="text-[9px] text-white/25 uppercase tracking-widest font-bold">Próximo check-in</p>
          <p className="text-[11px] text-white/50">{plan.nextCheckIn}</p>
          <p className="text-[9px] text-white/20">{plan.totalAnalyzed} proposta{plan.totalAnalyzed!==1?"s":""} analisada{plan.totalAnalyzed!==1?"s":""}</p>
        </div>
      </div>

      {/* Alertas do dashboard */}
      {plan.dashboardAlerts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {plan.dashboardAlerts.map(alert=>{
            const cfg = severityConfig[alert.severity] ?? severityConfig.info;
            return (
              <div key={alert.id} className={cn("p-4 rounded-xl border", cfg.bg, cfg.border)}>
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">{cfg.icon}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[11px] font-black text-white truncate">{alert.title}</p>
                      {alert.metric && <span className="text-[10px] font-black text-[#FF6600] shrink-0">{alert.metric}</span>}
                    </div>
                    <p className="text-[11px] text-white/45 leading-relaxed">{alert.message}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Diagnóstico */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health score do copiloto */}
        <div className="p-6 rounded-2xl border border-white/[0.06] bg-[#0d0d0d]">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-5">Saúde do Pipeline</p>
          <div className="flex items-end gap-3 mb-4">
            <span className={cn("text-[64px] font-black leading-none tabular-nums",
              plan.pipelineDiagnosis.healthScore>=70?"text-emerald-400":plan.pipelineDiagnosis.healthScore>=40?"text-amber-400":"text-rose-400")}>
              {plan.pipelineDiagnosis.healthScore}
            </span>
            <div className="pb-2">
              <p className={cn("text-[10px] font-black uppercase tracking-widest",
                plan.pipelineDiagnosis.healthScore>=70?"text-emerald-400":plan.pipelineDiagnosis.healthScore>=40?"text-amber-400":"text-rose-400")}>
                {plan.pipelineDiagnosis.overallHealth}
              </p>
              <p className="text-[9px] text-white/20 mt-0.5">de 100</p>
            </div>
          </div>
          <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden mb-4">
            <motion.div initial={{width:0}} animate={{width:`${plan.pipelineDiagnosis.healthScore}%`}}
              transition={{duration:1.2,ease:[0.23,1,0.32,1],delay:0.3}}
              className={cn("h-full rounded-full",plan.pipelineDiagnosis.healthScore>=70?"bg-emerald-500":plan.pipelineDiagnosis.healthScore>=40?"bg-amber-500":"bg-rose-500")}/>
          </div>
          <div className="space-y-2">
            {[
              {l:"Conversão",  v:`${plan.pipelineDiagnosis.conversionRate.toFixed(1)}%`},
              {l:"Ciclo médio",v:`${plan.pipelineDiagnosis.avgCycledays.toFixed(0)}d`},
              {l:"Momentum",   v:plan.pipelineDiagnosis.momentum},
              {l:"Críticas",   v:`${plan.pipelineDiagnosis.criticalProposals}`},
            ].map(r=>(
              <div key={r.l} className="flex items-center justify-between">
                <span className="text-[10px] text-white/30 font-medium">{r.l}</span>
                <span className="text-[11px] font-black text-white">{r.v}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.05]">
            <p className="text-[11px] text-white/35 leading-relaxed">{plan.pipelineDiagnosis.bottleneck}</p>
          </div>
        </div>

        {/* Ações prioritárias */}
        <div className="lg:col-span-2 p-6 rounded-2xl border border-white/[0.06] bg-[#0d0d0d]">
          <div className="flex items-center justify-between mb-5">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30">Ações Prioritárias</p>
            <div className="flex gap-1">
              {tones.map(t=>(
                <button key={t} onClick={()=>setSelectedTone(t)}
                  className={cn("px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider transition-all",
                    selectedTone===t?"bg-[#FF6600] text-white":"bg-white/[0.04] text-white/25 hover:text-white")}>
                  {toneLabels[t].slice(0,3)}
                </button>
              ))}
            </div>
          </div>

          {allActions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-3 text-white/20">
              <CheckCircle2 size={28}/>
              <p className="text-sm font-bold">Nenhuma ação pendente — pipeline em dia!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {allActions.map((action, i) => {
                const isExpanded = expandedAction === action.proposalId;
                const isPrimary = i === 0;
                const approach = action.approaches.find(a=>a.tone===selectedTone) ?? action.approaches[0];
                return (
                  <div key={action.proposalId}
                    className={cn("rounded-xl border overflow-hidden transition-all",
                      isPrimary?"border-[#FF6600]/25 bg-[#FF6600]/[0.04]":"border-white/[0.06] bg-white/[0.02]")}>
                    {/* Header */}
                    <div className="flex items-center justify-between p-3.5 cursor-pointer"
                      onClick={()=>setExpandedAction(isExpanded?null:action.proposalId)}>
                      <div className="flex items-center gap-3 min-w-0">
                        {isPrimary && (
                          <div className="w-5 h-5 rounded-md bg-[#FF6600]/20 flex items-center justify-center shrink-0">
                            <Zap size={10} className="text-[#FF6600]"/>
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-bold text-white truncate">{sanitizeText(action.clientName)}</span>
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-white/[0.06] text-white/30 uppercase tracking-wider shrink-0">
                              {action.priorityScore}pts
                            </span>
                          </div>
                          <p className="text-[10px] text-white/30 truncate mt-0.5">{sanitizeText(action.proposalTitle)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className="text-[11px] font-black text-[#FF6600]">{fmtK(action.value)}</span>
                        {isExpanded?<ChevronUp size={11} className="text-white/30"/>:<ChevronDown size={11} className="text-white/30"/>}
                      </div>
                    </div>
                    {/* Expandido */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}}
                          exit={{height:0,opacity:0}} transition={{duration:0.2}}
                          className="overflow-hidden border-t border-white/[0.05]">
                          <div className="p-4 space-y-3">
                            <p className="text-[11px] text-white/45 leading-relaxed">{action.contractAnalysis}</p>
                            {approach && (
                              <div className="p-3 rounded-lg bg-[#FF6600]/[0.05] border border-[#FF6600]/15">
                                <div className="flex items-center gap-1.5 text-[9px] text-[#FF6600] font-black uppercase tracking-widest mb-2">
                                  <ChannelIcon channel={approach.channel}/>{toneLabels[selectedTone] ?? selectedTone} · {approach.channel}
                                </div>
                                <p className="text-[11px] text-white/60 leading-relaxed line-clamp-3">{approach.opening} {approach.cta}</p>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <button onClick={()=>openApproachPopup(action)}
                                className="flex-1 py-2 rounded-lg bg-[#FF6600] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#FF6600]/80 transition-all">
                                Ver todas as abordagens
                              </button>
                              <button onClick={()=>handleDone(action.proposalId)}
                                className="px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25 transition-all">
                                <Check size={12}/>
                              </button>
                              <button onClick={()=>handleSkip(action.proposalId)}
                                className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/30 hover:bg-white/[0.08] transition-all">
                                <XCircle size={12}/>
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recomendações do diagnóstico */}
      {plan.pipelineDiagnosis.recommendations.length > 0 && (
        <div className="p-6 rounded-2xl border border-white/[0.06] bg-[#0d0d0d]">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-4">Recomendações do Motor</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {plan.pipelineDiagnosis.recommendations.map((rec,i)=>(
              <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#FF6600] mt-1.5 shrink-0"/>
                <p className="text-[12px] text-white/50 leading-relaxed">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dicas de desenvolvimento */}
      {plan.developmentTips.length > 0 && (
        <div className="p-6 rounded-2xl border border-white/[0.06] bg-[#0d0d0d]">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-5">Dicas de Desenvolvimento</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {plan.developmentTips.map((tip,i)=>(
              <motion.div key={i} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.08}}
                onClick={()=>openPopup(tip.title,<div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider",
                      tip.priority==="alta"?"bg-rose-500/15 text-rose-400":tip.priority==="media"?"bg-amber-500/15 text-amber-400":"bg-white/[0.06] text-white/30")}>
                      {tip.priority}
                    </span>
                    <span className="text-[9px] text-white/25 uppercase tracking-widest">{tip.category}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">O insight</p>
                    <p className="text-[13px] text-white/60 leading-relaxed">{tip.insight}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#FF6600]/[0.05] border border-[#FF6600]/20">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#FF6600] mb-2">O que fazer agora</p>
                    <p className="text-[13px] text-white/65 leading-relaxed">{tip.actionable}</p>
                  </div>
                </div>)}
                className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] cursor-pointer hover:border-[#FF6600]/20 hover:bg-[#FF6600]/[0.02] transition-all group">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0 mt-0.5">
                    {categoryIcon[tip.category] ?? <Lightbulb size={11} className="text-white/30"/>}
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-white group-hover:text-[#FF6600] transition-colors">{tip.title}</p>
                    <p className="text-[11px] text-white/30 mt-0.5 leading-relaxed line-clamp-2">{tip.insight}</p>
                    <p className="text-[9px] text-[#FF6600]/30 mt-2 font-black uppercase tracking-widest group-hover:text-[#FF6600]/60 transition-colors">Ver como aplicar →</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PremiumDashboard() {
  const [,navigate]    = useLocation();
  const queryClient    = useQueryClient();
  const {plan,loading:planLoading} = usePlan();
  const [viewMode,setViewMode]       = useState<PeriodType>("monthly");
  const [openInsight,setOpenInsight] = useState<string|null>(null);
  const [popup,setPopup]             = useState<{title:string;content:React.ReactNode;wide?:boolean}|null>(null);
  const [activePie,setActivePie]     = useState(0);

  const proposalsQ = useQuery({
    queryKey: ["proposals:list"],
    queryFn: async () => (await listProposals()).map(toUiProposal),
  });
  const proposals = proposalsQ.data ?? [];

  const openPopup  = useCallback((title:string,content:React.ReactNode,wide=false)=>setPopup({title,content,wide}),[]);
  const closePopup = useCallback(()=>setPopup(null),[]);

  const stats = useMemo(()=>{
    const sold=proposals.filter(p=>p.status==="completed");
    const pending=proposals.filter(p=>p.status==="pending");
    const cancelled=proposals.filter(p=>p.status==="cancelled");
    const totalValue=sold.reduce((s,p)=>s+p.value,0);
    const pendingValue=pending.reduce((s,p)=>s+p.value,0);
    const avgTicket=sold.length?totalValue/sold.length:0;
    const denom=sold.length+cancelled.length;
    const convRate=denom===0?0:(sold.length/denom)*100;
    const d30=new Date();d30.setDate(d30.getDate()-30);
    const d60=new Date();d60.setDate(d60.getDate()-60);
    const curr30Rev=sold.filter(p=>p.createdAt>=d30).reduce((s,p)=>s+p.value,0);
    const prev30Rev=sold.filter(p=>p.createdAt>=d60&&p.createdAt<d30).reduce((s,p)=>s+p.value,0);
    const revGrowth=prev30Rev?((curr30Rev-prev30Rev)/prev30Rev)*100:0;
    const avgDaysClose=sold.length?sold.reduce((s,p)=>s+daysBetween(p.createdAt),0)/sold.length:0;
    return{sold:sold.length,pending:pending.length,cancelled:cancelled.length,totalValue,pendingValue,avgTicket,convRate,revGrowth,avgDaysClose,curr30Rev};
  },[proposals]);

  const chartData     = useMemo(()=>buildCharts(proposals,viewMode),          [proposals,viewMode]);
  const revenueData   = useMemo(()=>buildRevenueTimeline(proposals,viewMode),  [proposals,viewMode]);
  const ticketData    = useMemo(()=>buildTicketTrend(proposals,viewMode),      [proposals,viewMode]);
  const agingData     = useMemo(()=>buildAgingData(proposals),                 [proposals]);
  const statusPie     = useMemo(()=>buildStatusPie(proposals),                 [proposals]);
  const health        = useMemo(()=>computeHealth(proposals),                  [proposals]);
  const insights      = useMemo(()=>buildInsights(proposals),                  [proposals]);
  const actions       = useMemo(()=>buildActions(proposals),                   [proposals]);
  const clientRanking = useMemo(()=>buildClientRanking(proposals),             [proposals]);
  const forecast      = useMemo(()=>buildForecast(proposals),                  [proposals]);
  const hotLeads      = useMemo(()=>proposals.filter(p=>p.status==="pending")
    .map(p=>({...p,age:daysBetween(p.createdAt)}))
    .sort((a,b)=>(b.value*(1+b.age/7))-(a.value*(1+a.age/7))).slice(0,5),[proposals]);

  useEffect(()=>{
    const onRefresh=()=>{ queryClient.invalidateQueries({queryKey:["proposals:list"]}); queryClient.invalidateQueries({queryKey:["copilot:today"]}); };
    window.addEventListener("premium:refresh",onRefresh as EventListener);
    window.addEventListener("proposals:changed",onRefresh as EventListener);
    return()=>{ window.removeEventListener("premium:refresh",onRefresh as EventListener); window.removeEventListener("proposals:changed",onRefresh as EventListener); };
  },[queryClient]);

  if(planLoading||proposalsQ.isLoading){
    return(<div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <motion.div animate={{rotate:360}} transition={{repeat:Infinity,duration:1,ease:"linear"}}>
        <Activity className="w-6 h-6 text-[#FF6600]"/>
      </motion.div>
    </div>);
  }

  return(
    <div className="bg-[#080808] min-h-screen text-white overflow-x-hidden" style={{fontFamily:"'DM Sans',sans-serif"}}>
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.025]"
        style={{backgroundImage:"linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)",backgroundSize:"64px 64px"}}/>
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 left-1/3 w-[600px] h-[600px] rounded-full bg-[#FF6600]/[0.055] blur-[140px]"/>
        <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] rounded-full bg-[#FF6600]/[0.03] blur-[120px]"/>
      </div>

      <AnimatePresence>
        {popup && <InfoPopup title={popup.title} onClose={closePopup} wide={popup.wide}>{popup.content}</InfoPopup>}
      </AnimatePresence>

      <div className="relative z-10">
        <Navbar/>
        <main className="pt-24 sm:pt-32 pb-24 px-4 sm:px-8 lg:px-16">
          <div className="max-w-[1440px] mx-auto space-y-20">

            {/* HEADER */}
            <div>
              <button onClick={()=>navigate("/propostas")}
                className="flex items-center gap-2 text-white/25 hover:text-[#FF6600] transition-colors mb-8 text-[9px] uppercase tracking-[0.4em] font-black">
                <ArrowLeft size={10}/> Voltar às propostas
              </button>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.45em] text-[#FF6600] mb-4">● Premium — Dashboard de Vendas</p>
                  <h1 className="text-[clamp(3.5rem,9vw,8rem)] font-black leading-none text-white uppercase" style={{letterSpacing:"-0.04em"}}>
                    FECHOU<span className="text-[#FF6600]">!</span>
                  </h1>
                  <p className="text-white/30 text-sm mt-4 max-w-sm leading-relaxed">Análise completa das suas propostas em tempo real.</p>
                </div>
                <div className="flex flex-col items-start md:items-end gap-3">
                  <div className="flex border border-white/[0.08] rounded-lg overflow-hidden">
                    {(["monthly","weekly"] as PeriodType[]).map(m=>(
                      <button key={m} onClick={()=>setViewMode(m)}
                        className={cn("px-6 py-2.5 text-[9px] font-black uppercase tracking-[0.28em] transition-all",
                          viewMode===m?"bg-[#FF6600] text-white":"text-white/25 hover:text-white hover:bg-white/[0.04]")}>
                        {m==="monthly"?"Mensal":"Semanal"}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-white/20">{proposals.length} propostas analisadas</p>
                </div>
              </div>
            </div>

            {/* 01 — KPIs */}
            <section>
              <SectionLabel number="01" title="Visão Geral" sub="Clique em qualquer card para detalhes"/>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.05] rounded-2xl overflow-hidden border border-white/[0.05]">
                {[
                  {label:"Receita Total",  value:fmtK(stats.totalValue),  sub:`${stats.sold} fechamento${stats.sold!==1?"s":""}`,    color:"#FF6600", badge:stats.revGrowth!==0?`${stats.revGrowth>0?"+":""}${stats.revGrowth.toFixed(0)}%`:null, up:stats.revGrowth>=0,  tip:"Soma de todas as propostas fechadas."},
                  {label:"Pipeline Ativo", value:fmtK(stats.pendingValue), sub:`${stats.pending} em aberto`,                          color:"#3b82f6", badge:null, up:true,                   tip:"Valor total das propostas abertas."},
                  {label:"Conversão",      value:fmtPct(stats.convRate),   sub:"benchmark: 40–60%",                                   color:stats.convRate>=40?"#22c55e":stats.convRate>=20?"#f59e0b":"#ef4444", badge:null, up:stats.convRate>=40, tip:"% das propostas que viraram venda."},
                  {label:"Ticket Médio",   value:fmtK(stats.avgTicket),    sub:`Ciclo: ~${stats.avgDaysClose.toFixed(0)}d`,            color:"#a855f7", badge:null, up:stats.avgTicket>=2000,  tip:"Valor médio por proposta fechada."},
                ].map((k,i)=>(
                  <motion.div key={k.label} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*0.07,ease:[0.23,1,0.32,1]}}
                    onClick={()=>openPopup(k.label,<p>{k.tip}</p>)}
                    className="relative p-7 bg-[#0d0d0d] group cursor-pointer hover:bg-[#111] transition-colors">
                    <div className="flex items-start justify-between mb-6">
                      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30">{k.label}</p>
                      <div className="flex items-center gap-1.5">
                        {k.badge&&<span className={cn("text-[10px] font-black px-2 py-0.5 rounded flex items-center gap-0.5",k.up?"text-emerald-400 bg-emerald-500/10":"text-rose-400 bg-rose-500/10")}>{k.up?<ArrowUpRight size={9}/>:<ArrowDownRight size={9}/>}{k.badge}</span>}
                        <div className="w-5 h-5 rounded bg-white/[0.04] border border-white/[0.05] group-hover:border-[#FF6600]/30 group-hover:bg-[#FF6600]/[0.08] flex items-center justify-center transition-all">
                          <Info size={9} className="text-white/15 group-hover:text-[#FF6600]/70 transition-colors"/>
                        </div>
                      </div>
                    </div>
                    <p className="text-[2.2rem] font-black leading-none mb-2 tabular-nums" style={{color:k.color}}>{k.value}</p>
                    <p className="text-[10px] text-white/25">{k.sub}</p>
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{background:`linear-gradient(90deg,transparent,${k.color},transparent)`}}/>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* 02 — PROPOSTAS & RECEITA */}
            <section>
              <SectionLabel number="02" title="Propostas & Receita" sub="Volume e receita histórica por período"/>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-7 rounded-2xl border border-white/[0.06] bg-[#0d0d0d]">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-1">Volume de Propostas</p>
                  <p className="text-[11px] text-white/20 mb-6"><span className="text-[#FF6600]">■</span> Fechadas · <span className="text-white/25">■</span> Pendentes · <span className="text-white/10">■</span> Canceladas</p>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{top:4,right:4,bottom:0,left:-22}} barGap={3}>
                        <CartesianGrid strokeDasharray="2 8" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                        <XAxis dataKey="name" tick={{fill:"rgba(255,255,255,0.25)",fontSize:10,fontWeight:700}} tickLine={false} axisLine={false}/>
                        <YAxis tick={{fill:"rgba(255,255,255,0.18)",fontSize:9}} tickLine={false} axisLine={false} allowDecimals={false}/>
                        <RechartsTooltip contentStyle={TT_STYLE} cursor={{fill:"rgba(255,102,0,0.04)"}}/>
                        <Bar dataKey="sold" name="Fechadas" fill="#FF6600" radius={[3,3,0,0]}/>
                        <Bar dataKey="pending" name="Pendentes" fill="rgba(255,255,255,0.09)" radius={[3,3,0,0]}/>
                        <Bar dataKey="cancelled" name="Canceladas" fill="rgba(255,255,255,0.04)" radius={[3,3,0,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="p-7 rounded-2xl border border-white/[0.06] bg-[#0d0d0d]">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-1">Receita por Período</p>
                  <p className="text-[11px] text-white/20 mb-6"><span className="text-[#FF6600]">■</span> Período · <span className="text-white/35">—</span> Acumulado</p>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={revenueData} margin={{top:4,right:4,bottom:0,left:-22}}>
                        <CartesianGrid strokeDasharray="2 8" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                        <XAxis dataKey="name" tick={{fill:"rgba(255,255,255,0.25)",fontSize:10,fontWeight:700}} tickLine={false} axisLine={false}/>
                        <YAxis tick={{fill:"rgba(255,255,255,0.18)",fontSize:9}} tickLine={false} axisLine={false} tickFormatter={(v:number)=>v>=1000?`${(v/1000).toFixed(0)}k`:String(v)}/>
                        <RechartsTooltip contentStyle={TT_STYLE} cursor={{fill:"rgba(255,102,0,0.04)"}} formatter={(v:number)=>safeFmtK(v)}/>
                        <Bar dataKey="revenue" name="Receita" fill="#FF6600" radius={[3,3,0,0]} opacity={0.85}/>
                        <Line dataKey="cumulative" name="Acumulado" type="monotone" stroke="rgba(255,255,255,0.35)" strokeWidth={1.5} dot={false} strokeDasharray="4 3"/>
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </section>

            {/* 03 — QUALIDADE & MIX */}
            <section>
              <SectionLabel number="03" title="Qualidade & Mix" sub="Ticket médio, conversão e distribuição de status"/>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 p-7 rounded-2xl border border-white/[0.06] bg-[#0d0d0d]">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-1">Ticket Médio & Conversão</p>
                  <p className="text-[11px] text-white/20 mb-6"><span className="text-purple-400">■</span> Ticket (R$) · <span className="text-emerald-400">■</span> Conversão (%)</p>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={ticketData.map((t,i)=>({...t,convRate:chartData[i]?.convRate??0}))} margin={{top:4,right:4,bottom:0,left:-22}}>
                        <CartesianGrid strokeDasharray="2 8" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                        <XAxis dataKey="name" tick={{fill:"rgba(255,255,255,0.25)",fontSize:10,fontWeight:700}} tickLine={false} axisLine={false}/>
                        <YAxis yAxisId="left" tick={{fill:"rgba(255,255,255,0.18)",fontSize:9}} tickLine={false} axisLine={false} tickFormatter={(v:number)=>v>=1000?`${(v/1000).toFixed(0)}k`:String(v)}/>
                        <YAxis yAxisId="right" orientation="right" tick={{fill:"rgba(255,255,255,0.18)",fontSize:9}} tickLine={false} axisLine={false} domain={[0,100]} tickFormatter={(v:number)=>`${v}%`}/>
                        <RechartsTooltip contentStyle={TT_STYLE} cursor={{fill:"rgba(255,255,255,0.02)"}} formatter={(v:number,name:string)=>name==="Ticket médio"?safeFmtK(v):`${v}%`}/>
                        <Area yAxisId="left" dataKey="avg" name="Ticket médio" type="monotone" fill="rgba(168,85,247,0.08)" stroke="#a855f7" strokeWidth={2} dot={false}/>
                        <Line yAxisId="right" dataKey="convRate" name="Conversão" type="monotone" stroke="#22c55e" strokeWidth={1.5} dot={{fill:"#22c55e",r:2.5}}/>
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="p-7 rounded-2xl border border-white/[0.06] bg-[#0d0d0d] flex flex-col">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-4">Mix de Status</p>
                  {statusPie.length===0?(<div className="flex-1 flex items-center justify-center text-white/20 text-sm">Sem dados</div>):(
                    <>
                      <div className="flex-1">
                        <ResponsiveContainer width="100%" height={170}>
                          <PieChart>
                            <Pie data={statusPie} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value" activeIndex={activePie} activeShape={ActiveShape} onMouseEnter={(_,i)=>setActivePie(i)}>
                              {statusPie.map((e,i)=><Cell key={i} fill={e.color} stroke="transparent"/>)}
                            </Pie>
                            <RechartsTooltip contentStyle={TT_STYLE}/>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2">
                        {statusPie.map((s,i)=>(
                          <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-sm" style={{backgroundColor:s.color}}/><span className="text-[11px] text-white/45">{s.name}</span></div>
                            <span className="text-[11px] font-black text-white">{s.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>

            {/* 04 — AGING */}
            <section>
              <SectionLabel number="04" title="Aging do Pipeline" sub="Tempo de vida das propostas pendentes"/>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-7 rounded-2xl border border-white/[0.06] bg-[#0d0d0d]">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-6">Valor em risco por faixa</p>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={agingData} margin={{top:4,right:4,bottom:0,left:-22}} barSize={44}>
                        <CartesianGrid strokeDasharray="2 8" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                        <XAxis dataKey="name" tick={{fill:"rgba(255,255,255,0.25)",fontSize:10,fontWeight:700}} tickLine={false} axisLine={false}/>
                        <YAxis tick={{fill:"rgba(255,255,255,0.18)",fontSize:9}} tickLine={false} axisLine={false} tickFormatter={(v:number)=>v>=1000?`${(v/1000).toFixed(0)}k`:String(v)}/>
                        <RechartsTooltip contentStyle={TT_STYLE} cursor={{fill:"rgba(255,255,255,0.02)"}} formatter={(v:number)=>safeFmtK(v)}/>
                        <Bar dataKey="totalValue" name="Valor" radius={[4,4,0,0]}>{agingData.map((b,i)=><Cell key={i} fill={b.color}/>)}</Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="p-7 rounded-2xl border border-white/[0.06] bg-[#0d0d0d]">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-6">Proporção por faixa — clique para ações</p>
                  {agingData.every(b=>b.value===0)?(<div className="h-[200px] flex items-center justify-center gap-3 text-white/20"><CheckCircle2 size={24}/><p className="text-sm font-bold">Nenhuma pendência</p></div>):(
                    <div className="space-y-5 mt-2">
                      {agingData.map((b,i)=>(
                        <motion.div key={b.name} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:0.1+i*0.07}}
                          onClick={()=>openPopup(`Aging — ${b.name}`,<div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]"><p className="text-[9px] text-white/30 uppercase tracking-widest font-bold mb-1">Propostas</p><p className="text-xl font-black" style={{color:b.color}}>{b.value}</p></div>
                              <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]"><p className="text-[9px] text-white/30 uppercase tracking-widest font-bold mb-1">Valor em risco</p><p className="text-xl font-black text-white">{safeFmtK(b.totalValue)}</p></div>
                            </div>
                            <p className="text-[12px] text-white/50 leading-relaxed">{b.label==="Crítico"?"Após 14 dias, a taxa de fechamento cai abaixo de 20%. Contate agora.":b.label==="Atenção"?"7–13 dias exigem follow-up proativo.":b.label==="Follow-up"?"3–6 dias é o momento ideal para o primeiro follow-up.":"Propostas novas — aguarde 2–3 dias úteis."}</p>
                          </div>)}
                          className="cursor-pointer group space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor:b.color}}/><span className="text-[12px] font-bold text-white">{b.name}</span><span className="text-[9px] text-white/20 font-black uppercase tracking-widest">{b.label}</span></div>
                            <div className="flex items-center gap-3"><span className="text-[10px] text-white/30">{b.value} proposta{b.value!==1?"s":""}</span><span className="text-[12px] font-black text-white">{safeFmtK(b.totalValue)}</span></div>
                          </div>
                          <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                            <motion.div initial={{width:0}} animate={{width:stats.pending>0?`${(b.value/stats.pending)*100}%`:"0%"}} transition={{duration:0.8,ease:[0.23,1,0.32,1],delay:0.2+i*0.07}} className="h-full rounded-full" style={{backgroundColor:b.color}}/>
                          </div>
                        </motion.div>
                      ))}
                      <div className="pt-3 border-t border-white/[0.05] flex items-center justify-between">
                        <span className="text-[10px] text-white/25 uppercase tracking-widest font-bold">Total em aberto</span>
                        <span className="text-sm font-black text-white">{fmtK(stats.pendingValue)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* 05 — INTELIGÊNCIA */}
            <section>
              <SectionLabel number="05" title="Inteligência de Vendas" sub="Score, insights e próximas ações"/>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="p-7 rounded-2xl border border-white/[0.06] bg-[#0d0d0d] cursor-pointer group hover:border-[#FF6600]/20 transition-colors"
                  onClick={()=>openPopup("Score de Saúde",<div className="space-y-4"><p>Calculado com 3 fatores:</p><ul className="space-y-2 text-white/45"><li>• <strong className="text-white/65">Conversão (50pts)</strong></li><li>• <strong className="text-white/65">Aging (30pts)</strong></li><li>• <strong className="text-white/65">Volume (20pts)</strong></li></ul><div className="space-y-2 mt-3 border-t border-white/[0.06] pt-3">{health.reasons.map(r=><p key={r} className="text-[12px] text-white/50 leading-relaxed">· {r}</p>)}</div></div>)}>
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-7">Score de Saúde</p>
                  <div className="flex items-end gap-4 mb-5">
                    <span className={cn("text-[80px] font-black leading-none tabular-nums",health.score>=70?"text-emerald-400":health.score>=40?"text-amber-400":"text-rose-400")}>{health.score}</span>
                    <div className="pb-3">
                      <p className={cn("text-[10px] font-black uppercase tracking-widest",health.score>=70?"text-emerald-400":health.score>=40?"text-amber-400":"text-rose-400")}>{health.score>=80?"Excelente":health.score>=60?"Bom":health.score>=40?"Atenção":"Crítico"}</p>
                      <p className="text-[10px] text-white/20 mt-0.5">de 100</p>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden mb-5">
                    <motion.div initial={{width:0}} animate={{width:`${health.score}%`}} transition={{duration:1.2,ease:[0.23,1,0.32,1],delay:0.3}} className={cn("h-full rounded-full",health.score>=70?"bg-emerald-500":health.score>=40?"bg-amber-500":"bg-rose-500")}/>
                  </div>
                  <p className="text-[11px] text-white/30 leading-relaxed line-clamp-2">{health.reasons[0]}</p>
                  <p className="text-[9px] text-[#FF6600]/30 mt-3 font-black uppercase tracking-widest group-hover:text-[#FF6600]/60 transition-colors">Clique para detalhes →</p>
                </div>
                <div className="p-7 rounded-2xl border border-white/[0.06] bg-[#0d0d0d]">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-6">Insights do Pipeline</p>
                  <div className="space-y-2">
                    {insights.slice(0,4).map(insight=>{
                      const Icon=insight.icon; const isOpen=openInsight===insight.id;
                      return(<div key={insight.id} onClick={()=>setOpenInsight(isOpen?null:insight.id)}
                          className={cn("rounded-xl border cursor-pointer transition-all duration-200 overflow-hidden",insight.level==="critical"?"border-rose-500/25 bg-rose-500/[0.05] hover:border-rose-500/40":insight.level==="warning"?"border-amber-500/20 bg-amber-500/[0.04] hover:border-amber-500/35":"border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12]")}>
                          <div className="flex items-center justify-between p-3">
                            <div className="flex items-center gap-2 min-w-0"><Icon size={11} className={cn("shrink-0",insight.level==="critical"?"text-rose-400":insight.level==="warning"?"text-amber-400":"text-white/40")}/><span className="text-[11px] font-bold text-white truncate">{insight.title}</span></div>
                            <div className="flex items-center gap-2 shrink-0 ml-2"><span className={cn("text-[10px] font-black",insight.level==="critical"?"text-rose-400":insight.level==="warning"?"text-amber-400":"text-emerald-400")}>{insight.metric}</span>{isOpen?<ChevronUp size={11} className="text-white/30"/>:<ChevronDown size={11} className="text-white/30"/>}</div>
                          </div>
                          <AnimatePresence>{isOpen&&(<motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.2}} className="overflow-hidden border-t border-white/[0.05]"><div className="p-3 space-y-2"><p className="text-[11px] text-white/50 leading-relaxed">{insight.description}</p><div className="flex items-start gap-1.5 pt-1"><Zap size={10} className="text-[#FF6600] shrink-0 mt-0.5"/><p className="text-[11px] font-bold text-[#FF6600] leading-relaxed">{insight.action}</p></div></div></motion.div>)}</AnimatePresence>
                        </div>);
                    })}
                  </div>
                </div>
                <div className="p-7 rounded-2xl border border-white/[0.06] bg-[#0d0d0d]">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-6">Próximas Ações</p>
                  <div className="space-y-3">
                    {actions.map((a,i)=>(
                      <motion.div key={a.id} initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} transition={{delay:0.1+i*0.08}}
                        onClick={()=>openPopup(a.title,<div className="space-y-4"><p className="text-white/55 leading-relaxed">{a.description}</p><div className="border-t border-white/[0.06] pt-4"><p className="text-[9px] font-black uppercase tracking-widest text-[#FF6600] mb-2">Por que fazer isso?</p><p className="text-white/50 text-[13px] leading-relaxed italic">{a.why}</p></div></div>)}
                        className="flex items-start gap-3 p-3.5 rounded-xl border border-white/[0.05] bg-white/[0.02] cursor-pointer hover:border-[#FF6600]/20 hover:bg-[#FF6600]/[0.02] transition-all group">
                        <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 mt-0.5 uppercase tracking-wider",a.priority==="P1"?"bg-rose-500/15 text-rose-400":a.priority==="P2"?"bg-amber-500/15 text-amber-400":"bg-white/[0.06] text-white/25")}>{a.priority}</span>
                        <div><p className="text-[12px] font-bold text-white group-hover:text-[#FF6600] transition-colors">{a.title}</p><p className="text-[11px] text-white/30 mt-0.5 leading-relaxed line-clamp-2">{a.description}</p></div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* 06 — COPILOTO DE ABORDAGEM */}
            <section>
              <SectionLabel number="06" title="Copiloto de Abordagem" sub="Motor autônomo — analisa cada contrato e gera estratégia de abordagem"/>
              <div className="rounded-2xl border border-[#FF6600]/15 bg-[#0d0d0d] overflow-hidden">
                <div className="flex items-center justify-between px-7 py-5 border-b border-white/[0.05]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#FF6600]/15 border border-[#FF6600]/25 flex items-center justify-center">
                      <Brain size={16} className="text-[#FF6600]"/>
                    </div>
                    <div>
                      <p className="text-[13px] font-black text-white">Copiloto de Abordagem</p>
                      <p className="text-[10px] text-white/30 mt-0.5">Analisa padrões, detecta sinais e gera 5 abordagens por oportunidade</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
                    <span className="text-[9px] text-emerald-400 font-black uppercase tracking-widest">Ativo</span>
                  </div>
                </div>
                <div className="p-7">
                  <CopilotSection openPopup={openPopup}/>
                </div>
              </div>
            </section>

            {/* 07 — HOT LEADS */}
            {hotLeads.length>0&&(
              <section>
                <SectionLabel number="07" title="Oportunidades Prioritárias" sub="Rankeadas por urgência — clique para estratégia de abordagem"/>
                <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d0d] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px]">
                      <thead><tr className="border-b border-white/[0.05]">
                        {[{label:"Cliente",tip:"Nome do cliente"},{label:"Proposta",tip:"Título da proposta"},{label:"Valor",tip:"Valor total"},{label:"Dias",tip:"Dias sem resposta"},{label:"Urgência",tip:"Valor × tempo"}].map(h=>(
                          <th key={h.label} className="text-left px-6 py-4"><span className="text-[9px] font-black uppercase tracking-[0.25em] text-white/20 flex items-center gap-1">{h.label}<InfoBadge text={h.tip}/></span></th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {hotLeads.map((lead,i)=>{
                          const uc=lead.age>=14?{c:"#ef4444",l:"Crítico"}:lead.age>=7?{c:"#f97316",l:"Alto"}:lead.age>=3?{c:"#f59e0b",l:"Médio"}:{c:"#22c55e",l:"Novo"};
                          return(<motion.tr key={lead.id} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.05*i}}
                            className="border-b border-white/[0.04] hover:bg-white/[0.015] transition-colors cursor-pointer"
                            onClick={()=>openPopup(`${sanitizeText(lead.clientName)} — Abordagem`,<div className="space-y-3">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]"><p className="text-[9px] text-white/30 uppercase tracking-widest font-bold mb-1">Valor</p><p className="text-sm font-black text-white">{fmtK(lead.value)}</p></div>
                                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]"><p className="text-[9px] text-white/30 uppercase tracking-widest font-bold mb-1">Dias em aberto</p><p className="text-sm font-black text-white">{lead.age}d</p></div>
                              </div>
                              <div className="p-3 rounded-lg bg-[#FF6600]/[0.06] border border-[#FF6600]/20">
                                <p className="text-[9px] font-black uppercase tracking-widest text-[#FF6600] mb-1">Recomendação</p>
                                <p className="text-[12px] text-white/55 leading-relaxed">{lead.age>=14?`"Oi ${sanitizeText(lead.clientName,25)}, ainda faz sentido avançarmos? Posso reservar sua vaga até [data]."`:lead.age>=7?"Follow-up objetivo — pergunte se há dúvida ou objeção específica.":"Aguarde mais 1–2 dias antes do primeiro follow-up."}</p>
                              </div>
                              <p className="text-[11px] text-white/30 leading-relaxed">💡 Use o <strong className="text-white/50">Copiloto de Abordagem</strong> acima para gerar 5 mensagens personalizadas para este cliente.</p>
                            </div>)}>
                            <td className="px-6 py-4"><p className="text-[13px] font-bold text-white">{sanitizeText(lead.clientName)}</p></td>
                            <td className="px-6 py-4"><p className="text-[12px] text-white/35 truncate max-w-[160px]">{sanitizeText(lead.title)}</p></td>
                            <td className="px-6 py-4"><p className="text-[13px] font-black text-white tabular-nums">{fmtK(lead.value)}</p></td>
                            <td className="px-6 py-4"><p className="text-[12px] text-white/40 tabular-nums">{lead.age}d</p></td>
                            <td className="px-6 py-4"><span className="text-[9px] font-black px-3 py-1 rounded uppercase tracking-wider" style={{color:uc.c,background:`${uc.c}15`,border:`1px solid ${uc.c}25`}}>{uc.l}</span></td>
                          </motion.tr>);
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {/* 08 — PREVISÃO */}
            <section>
              <SectionLabel number="08" title="Previsão de Receita" sub="3 cenários baseados nos seus últimos 3 meses reais"/>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.05] rounded-2xl overflow-hidden border border-white/[0.05] mb-4">
                {[
                  {label:"Conservador",value:forecast.conservative,color:"#ef4444",desc:"Se fechar 30% menos que a média.",pDesc:"Cenário pessimista em 70% da média. Piso de planejamento."},
                  {label:"Realista",   value:forecast.base,         color:"#f59e0b",desc:"Média exata dos últimos 3 meses.",pDesc:"Cenário mais provável se nada mudar no ritmo atual."},
                  {label:"Otimista",   value:forecast.optimistic,   color:"#22c55e",desc:"Mantendo tendência de crescimento.",pDesc:"Projeta tendência recente. Exige mais volume e manutenção da conversão."},
                ].map((s,i)=>(
                  <motion.div key={s.label} initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{delay:0.1+i*0.08}}
                    onClick={()=>openPopup(`Previsão ${s.label}`,<div className="space-y-3"><p className="text-3xl font-black" style={{color:s.color}}>{fmtK(s.value)}</p><p className="text-[13px] text-white/50 leading-relaxed">{s.pDesc}</p><div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.05] mt-2"><p className="text-[9px] font-black uppercase tracking-widest text-white/25 mb-2">Base de cálculo</p><div className="flex gap-4">{forecast.months.map((m,idx)=><div key={idx}><p className="text-[9px] text-white/25 uppercase tracking-widest">Mês {idx+1}</p><p className="text-sm font-black text-white tabular-nums">{fmtK(m)}</p></div>)}</div></div></div>)}
                    className="p-7 bg-[#0d0d0d] cursor-pointer group hover:bg-[#111] transition-colors">
                    <p className="text-[9px] font-black uppercase tracking-[0.35em] text-white/25 mb-4">{s.label}</p>
                    <p className="text-4xl font-black mb-3 tabular-nums" style={{color:s.color}}>{fmtK(s.value)}</p>
                    <p className="text-[11px] text-white/25 leading-relaxed mb-4">{s.desc}</p>
                    <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                      <motion.div initial={{width:0}} animate={{width:`${Math.min(100,(s.value/(forecast.optimistic||1))*100)}%`}} transition={{duration:1,ease:[0.23,1,0.32,1],delay:0.3+i*0.08}} className="h-full rounded-full" style={{backgroundColor:s.color}}/>
                    </div>
                    <p className="text-[9px] text-[#FF6600]/30 font-black uppercase tracking-widest mt-4 group-hover:text-[#FF6600]/60 transition-colors">Ver detalhes →</p>
                  </motion.div>
                ))}
              </div>
              <div className="flex items-start gap-2.5 p-4 rounded-xl border border-white/[0.05] bg-white/[0.01]">
                <Info size={11} className="text-white/15 shrink-0 mt-0.5"/>
                <p className="text-[11px] text-white/20 leading-relaxed">Histórico: {forecast.months.map((m,i)=>`Mês ${i+1}: ${fmtK(m)}`).join(" · ")}. Projeção é uma estimativa — o resultado real depende do esforço de prospecção e fechamento.</p>
              </div>
            </section>

            {/* 09 — RANKING */}
            {clientRanking.length>0&&(
              <section>
                <SectionLabel number="09" title="Ranking de Clientes" sub="Os que mais geraram receita — clique para detalhes"/>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  <div className="lg:col-span-3 rounded-2xl border border-white/[0.06] bg-[#0d0d0d] overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[380px]">
                        <thead><tr className="border-b border-white/[0.05]">
                          {[{label:"#",tip:"Ranking"},{label:"Cliente",tip:"Nome"},{label:"Receita",tip:"Total fechado"},{label:"Propostas",tip:"Total enviadas"},{label:"Conversão",tip:"% fechadas"}].map(h=>(
                            <th key={h.label} className="text-left px-5 py-4"><span className="text-[9px] font-black uppercase tracking-[0.25em] text-white/20 flex items-center gap-1">{h.label}<InfoBadge text={h.tip}/></span></th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {clientRanking.map((c,i)=>(
                            <motion.tr key={c.name} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.04*i}}
                              onClick={()=>openPopup(`Cliente — ${sanitizeText(c.name)}`,<div className="space-y-3"><div className="grid grid-cols-2 gap-2">{[{k:"Receita",v:fmtK(c.total)},{k:"Enviadas",v:String(c.count)},{k:"Fechadas",v:String(c.won)},{k:"Conversão",v:`${c.convRate.toFixed(0)}%`}].map(r=><div key={r.k} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]"><p className="text-[9px] text-white/30 uppercase tracking-widest font-bold mb-1">{r.k}</p><p className="text-base font-black text-white">{r.v}</p></div>)}</div></div>)}
                              className="border-b border-white/[0.04] hover:bg-white/[0.015] transition-colors cursor-pointer">
                              <td className="px-5 py-4"><span className="text-[13px] font-black text-white/20">{i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}</span></td>
                              <td className="px-5 py-4"><p className="text-[13px] font-bold text-white">{sanitizeText(c.name)}</p></td>
                              <td className="px-5 py-4"><p className="text-[13px] font-black text-[#FF6600] tabular-nums">{fmtK(c.total)}</p></td>
                              <td className="px-5 py-4"><p className="text-[12px] text-white/40">{c.count} proposta{c.count!==1?"s":""}</p></td>
                              <td className="px-5 py-4"><div className="flex items-center gap-2"><div className="w-12 h-1.5 bg-white/[0.05] rounded-full overflow-hidden"><div className="h-full rounded-full bg-[#FF6600]" style={{width:`${c.convRate}%`}}/></div><span className="text-[11px] font-bold text-white/40 tabular-nums">{c.convRate.toFixed(0)}%</span></div></td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="lg:col-span-2 p-7 rounded-2xl border border-white/[0.06] bg-[#0d0d0d]">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-6">Receita por cliente</p>
                    <div className="h-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={clientRanking.map(c=>({name:sanitizeText(c.name,12),value:c.total}))} layout="vertical" margin={{top:4,right:4,bottom:0,left:0}}>
                          <CartesianGrid strokeDasharray="2 8" stroke="rgba(255,255,255,0.04)" horizontal={false}/>
                          <XAxis type="number" tick={{fill:"rgba(255,255,255,0.18)",fontSize:9}} tickLine={false} axisLine={false} tickFormatter={(v:number)=>v>=1000?`${(v/1000).toFixed(0)}k`:String(v)}/>
                          <YAxis type="category" dataKey="name" tick={{fill:"rgba(255,255,255,0.35)",fontSize:10,fontWeight:700}} tickLine={false} axisLine={false} width={72}/>
                          <RechartsTooltip contentStyle={TT_STYLE} formatter={(v:number)=>safeFmtK(v)}/>
                          <Bar dataKey="value" name="Receita" fill="#FF6600" radius={[0,3,3,0]}/>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </section>
            )}

          </div>
        </main>
        <Footer/>
      </div>
    </div>
  );
}