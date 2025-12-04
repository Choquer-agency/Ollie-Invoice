import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Invoices from "@/pages/Invoices";
import CreateInvoice from "@/pages/CreateInvoice";
import InvoicePreview from "@/pages/InvoicePreview";
import Clients from "@/pages/Clients";
import Settings from "@/pages/Settings";
import PublicInvoice from "@/pages/PublicInvoice";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Public routes that don't require auth
  return (
    <Switch>
      {/* Public invoice payment page */}
      <Route path="/pay/:token" component={PublicInvoice} />
      
      {/* Landing page for unauthenticated users */}
      {(isLoading || !isAuthenticated) ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          {/* Authenticated routes */}
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/invoices" component={Invoices} />
          <Route path="/invoices/new" component={CreateInvoice} />
          <Route path="/invoices/:id" component={InvoicePreview} />
          <Route path="/invoices/:id/edit" component={CreateInvoice} />
          <Route path="/clients" component={Clients} />
          <Route path="/settings" component={Settings} />
        </>
      )}
      
      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
