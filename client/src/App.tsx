import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Pricing from "@/pages/Pricing";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Invoices from "@/pages/Invoices";
import CreateInvoice from "@/pages/CreateInvoice";
import InvoicePreview from "@/pages/InvoicePreview";
import Clients from "@/pages/Clients";
import Settings from "@/pages/Settings";
import PublicInvoice from "@/pages/PublicInvoice";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminSetup from "@/pages/AdminSetup";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex items-center justify-center">
        <div className="relative flex items-center justify-center">
          {/* Left square - light green with 5px bottom-left radius, 100px on other corners */}
          <div 
            className="w-6 h-6 absolute animate-pulse-left"
            style={{ 
              backgroundColor: '#9EE591',
              borderRadius: '100px 100px 100px 5px'
            }}
          />
          {/* Right square - bright green with 100px radius on all corners */}
          <div 
            className="w-6 h-6 absolute animate-pulse-right"
            style={{ 
              backgroundColor: '#00D639',
              borderRadius: '100px',
              mixBlendMode: 'multiply'
            }}
          />
        </div>
      </div>
      <style>{`
        @keyframes pulse-left {
          0%, 100% { transform: translateX(-4px); }
          50% { transform: translateX(4px); }
        }
        @keyframes pulse-right {
          0%, 100% { transform: translateX(4px); }
          50% { transform: translateX(-4px); }
        }
        .animate-pulse-left {
          animation: pulse-left 1s cubic-bezier(0.52, 0.01, 0.16, 1) infinite;
        }
        .animate-pulse-right {
          animation: pulse-right 1s cubic-bezier(0.52, 0.01, 0.16, 1) infinite;
        }
      `}</style>
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show minimal loading screen while checking auth
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Unauthenticated users see landing page, login page, pricing page, and public invoice page
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/pay/:token" component={PublicInvoice} />
        <Route path="/login" component={Login} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
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
      <Route path="/pricing" component={Pricing} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/invoices" component={Invoices} />
      <Route path="/invoices/new" component={CreateInvoice} />
      <Route path="/invoices/:id/edit" component={CreateInvoice} />
      <Route path="/invoices/:id" component={InvoicePreview} />
      <Route path="/clients" component={Clients} />
      <Route path="/settings" component={Settings} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/setup" component={AdminSetup} />
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
