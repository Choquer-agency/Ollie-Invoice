import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Invoices from "@/pages/Invoices";
import CreateInvoice from "@/pages/CreateInvoice";
import InvoicePreview from "@/pages/InvoicePreview";
import Clients from "@/pages/Clients";
import Settings from "@/pages/Settings";
import PublicInvoice from "@/pages/PublicInvoice";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <img 
          src="https://fdqnjninitbyeescipyh.supabase.co/storage/v1/object/public/Logos/private/uploads/Ollie%20Invoice.svg" 
          alt="Ollie Invoice" 
          className="h-8 w-auto opacity-50 dark:invert animate-pulse"
        />
      </div>
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show minimal loading screen while checking auth
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Unauthenticated users see landing page, login page, and public invoice page
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/pay/:token" component={PublicInvoice} />
        <Route path="/login" component={Login} />
        <Route path="/" component={Landing} />
        <Route component={Landing} />
      </Switch>
    );
  }

  // Authenticated routes
  return (
    <Switch>
      <Route path="/pay/:token" component={PublicInvoice} />
      <Route path="/login" component={Login} />
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/invoices" component={Invoices} />
      <Route path="/invoices/new" component={CreateInvoice} />
      <Route path="/invoices/:id/edit" component={CreateInvoice} />
      <Route path="/invoices/:id" component={InvoicePreview} />
      <Route path="/clients" component={Clients} />
      <Route path="/settings" component={Settings} />
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
