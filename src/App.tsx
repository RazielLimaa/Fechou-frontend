import { Suspense, lazy, useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { preventClickjacking } from "./lib/security";
import { SessionProvider } from "./context/session-context";
import AuthGuard from "./components/AuthGuard";
import StepUpDialogProvider from "./components/security/StepUpDialogProvider";
import NotFound from "./pages/not-found";
import Lenis from "lenis";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslation } from "react-i18next";

const Home = lazy(() => import("./pages/home"));
const Vision = lazy(() => import("./pages/vision"));
const System = lazy(() => import("./pages/system"));
const Login = lazy(() => import("./pages/login"));
const Register = lazy(() => import("./pages/register"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const PrivacyPage = lazy(() => import("./pages/privacy"));
const TermsPage = lazy(() => import("./pages/terms"));
const SecurityPage = lazy(() => import("./pages/security"));
const SignatureProtectionPage = lazy(() => import("./pages/signature-protection"));
const Propostas = lazy(() => import("./pages/propostas"));
const PagePayment = lazy(() => import("./pages/checkout"));
const ContratoPublico = lazy(() => import("./pages/contrato-publico"));
const PlanCheckout = lazy(() => import("./pages/plan-checkout"));
const PagamentoConfirmacao = lazy(() => import("./pages/pagamento-confirmacao"));
const PremiumDashboard = lazy(() => import("./pages/premium-dashboard"));
const ContratoView = lazy(() => import("./pages/contrato-view"));
const ProposalPdf = lazy(() => import("./pages/ProposalPdf"));
const PaymentSettings = lazy(() => import("./pages/app/PaymentSettings"));
const PublicContract = lazy(() => import("./pages/public/PublicContract"));
const PaymentFeedback = lazy(() => import("./pages/public/PaymentFeedback"));
const ContratosPage = lazy(() => import("./pages/contratos/index"));
const NovoContratoPage = lazy(() => import("./pages/contratos/novo"));
const EditorContratoPage = lazy(() => import("./pages/contratos/editor"));
const Profile = lazy(() => import("./pages/profile"));
const ProfilePublic = lazy(() => import("./pages/profilePublic"));

function PrivateRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <AuthGuard>
      <Component />
    </AuthGuard>
  );
}

function AppRouteFallback() {
  const { t } = useTranslation();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#09090b",
        color: "rgba(255,255,255,0.6)",
        fontFamily: "'DM Sans', 'Inter', sans-serif",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        fontSize: 11,
      }}
    >
      {t("common.loading")}
    </div>
  );
}

function SmoothScrollController() {
  const [location] = useLocation();
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotion.matches) return;

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.15,
      anchors: { duration: 1 },
      prevent: (node) =>
        Boolean(
          node.closest(
            '[data-lenis-prevent], [data-radix-scroll-area-viewport], [role="dialog"], input, textarea, select',
          ),
        ),
    });

    lenisRef.current = lenis;

    const updateScrollTrigger = () => ScrollTrigger.update();
    lenis.on("scroll", updateScrollTrigger);

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };

    frame = requestAnimationFrame(raf);
    ScrollTrigger.refresh();

    return () => {
      cancelAnimationFrame(frame);
      lenis.off("scroll", updateScrollTrigger);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  useEffect(() => {
    lenisRef.current?.scrollTo(0, { immediate: true });
    ScrollTrigger.refresh();
  }, [location]);

  return null;
}

function Router() {
  return (
    <Suspense fallback={<AppRouteFallback />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/vision" component={Vision} />
        <Route path="/system" component={System} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />
        <Route path="/reset-password" component={ResetPasswordPage} />
        <Route path="/privacidade" component={PrivacyPage} />
        <Route path="/termos" component={TermsPage} />
        <Route path="/seguranca" component={SecurityPage} />
        <Route path="/assinaturas-e-dados-contratuais" component={SignatureProtectionPage} />

        <Route path="/propostas">
          <PrivateRoute component={Propostas} />
        </Route>
        <Route path="/propostas/:id/pdf">
          <PrivateRoute component={ProposalPdf} />
        </Route>
        <Route path="/contrato/:id">
          <PrivateRoute component={ContratoView} />
        </Route>

        <Route path="/contratos">
          <PrivateRoute component={ContratosPage} />
        </Route>
        <Route path="/contratos/novo">
          <PrivateRoute component={NovoContratoPage} />
        </Route>
        <Route path="/contratos/:id/editor">
          <PrivateRoute component={EditorContratoPage} />
        </Route>

        <Route path="/checkout" component={PagePayment} />
        <Route path="/checkout/plano/:id" component={PlanCheckout} />
        <Route path="/pagamento/confirmacao" component={PagamentoConfirmacao} />
        <Route path="/dashboard/premium">
          <PrivateRoute component={PremiumDashboard} />
        </Route>

        <Route path="/app/settings/payments">
          <PrivateRoute component={PaymentSettings} />
        </Route>
        <Route path="/p/contract/:token" component={PublicContract} />
        <Route path="/c/:token" component={PublicContract} />
        <Route path="/p/feedback" component={PaymentFeedback} />
        <Route path="/legacy-c/:token" component={ContratoPublico} />

        <Route path="/profile" component={Profile} />
        <Route path="/u/:slug" component={ProfilePublic} />

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  useEffect(() => {
    try {
      preventClickjacking();
    } catch {}
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SessionProvider>
          <StepUpDialogProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <SmoothScrollController />
              <Toaster
                theme="dark"
                position="top-right"
                toastOptions={{
                  style: {
                    background: "hsl(240 10% 6%)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    color: "hsl(0 0% 98%)",
                  },
                }}
              />
              <Router />
            </WouterRouter>
          </StepUpDialogProvider>
        </SessionProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
