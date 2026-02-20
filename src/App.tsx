import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { preventClickjacking } from "./lib/security";
import AuthGuard from "./components/AuthGuard";
import NotFound from "./pages/not-found";
import Home from "./pages/home";
import Vision from "./pages/vision";
import System from "./pages/system";
import Login from "./pages/login";
import Register from "./pages/register";
import NovaProposta from "./pages/nova-proposta";
import Templates from "./pages/templates";
import Propostas from "./pages/propostas";
import pagepayment from "./pages/checkout";
import ContratoPublico from "./pages/contrato-publico";
import PlanCheckout from "./pages/plan-checkout";
import PremiumDashboard from "./pages/premium-dashboard";
import ContratoView from "./pages/contrato-view";

// New integrated pages
import PaymentSettings from "./pages/app/PaymentSettings";
import ProposalsList from "./pages/app/ProposalsList";
import ProposalDetails from "./pages/app/ProposalDetails";
import PublicContract from "./pages/public/PublicContract";
import PaymentFeedback from "./pages/public/PaymentFeedback";

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
      {/* Public landing pages */}
      <Route path="/" component={Home} />
      <Route path="/vision" component={Vision} />
      <Route path="/system" component={System} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      {/* Original private pages (existing) */}
      <Route path="/propostas">
        <PrivateRoute component={Propostas} />
      </Route>
      <Route path="/propostas/nova">
        <PrivateRoute component={NovaProposta} />
      </Route>
      <Route path="/templates">
        <PrivateRoute component={Templates} />
      </Route>
      <Route path="/contrato/:id">
        <PrivateRoute component={ContratoView} />
      </Route>
      <Route path="/checkout" component={pagepayment} />
      <Route path="/checkout/plano/:id" component={PlanCheckout} />
      <Route path="/dashboard/premium">
        <PrivateRoute component={PremiumDashboard} />
      </Route>

      {/* New app routes (private) */}
      <Route path="/app/settings/payments">
        <PrivateRoute component={PaymentSettings} />
      </Route>
      <Route path="/app/proposals">
        <PrivateRoute component={ProposalsList} />
      </Route>
      <Route path="/app/proposals/:id">
        <PrivateRoute component={ProposalDetails} />
      </Route>

      {/* Public contract & payment */}
      <Route path="/p/contract/:token" component={PublicContract} />
      <Route path="/p/feedback" component={PaymentFeedback} />
      <Route path="/c/:token" component={ContratoPublico} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Security: prevent clickjacking on app load
  useEffect(() => {
    preventClickjacking();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
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
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
