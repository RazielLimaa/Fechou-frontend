import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { preventClickjacking } from "./lib/security";
import { SessionProvider } from "./context/session-context";
import AuthGuard from "./components/AuthGuard";
import NotFound from "./pages/not-found";
import Home from "./pages/home";
import Vision from "./pages/vision";
import System from "./pages/system";
import Login from "./pages/login";
import Register from "./pages/register";
import Templates from "./pages/templates";
import Propostas from "./pages/propostas";
import PagePayment from "./pages/checkout";
import ContratoPublico from "./pages/contrato-publico";
import PlanCheckout from "./pages/plan-checkout";
import PremiumDashboard from "./pages/premium-dashboard";
import ContratoView from "./pages/contrato-view";
import ProposalPdf from "./pages/ProposalPdf";

import PaymentSettings from "./pages/app/PaymentSettings";
import PublicContract from "./pages/public/PublicContract";
import PaymentFeedback from "./pages/public/PaymentFeedback";

import ContratosPage from "./pages/contratos/index";
import NovoContratoPage from "./pages/contratos/novo";
import EditorContratoPage from "./pages/contratos/editor";


import perfil from "./pages/profile";
import profilePublic from "./pages/profilePublic";

function PrivateRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <AuthGuard>
      <Component />
    </AuthGuard>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/vision" component={Vision} />
      <Route path="/system" component={System} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      <Route path="/propostas">
        <PrivateRoute component={Propostas} />
      </Route>
      <Route path="/propostas/:id/pdf">
        <PrivateRoute component={ProposalPdf} />
      </Route>
      <Route path="/templates">
        <PrivateRoute component={Templates} />
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


      <Route path="/profile" component={perfil} />  
      <Route path="/u/:slug" component={profilePublic} />
      
      <Route component={NotFound} />
    </Switch>
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
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
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
        </SessionProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
