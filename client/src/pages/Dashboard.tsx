import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { InvoiceTable } from "@/components/InvoiceTable";
import { EmptyState } from "@/components/EmptyState";
import { AnimatedSearch } from "@/components/AnimatedSearch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { CreateInvoiceButton } from "@/components/CreateInvoiceButton";
import { useState, useMemo } from "react";
import type { DashboardStats, InvoiceWithRelations } from "@shared/schema";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [filter, setFilter] = useState<"all" | "paid" | "partially_paid" | "overdue">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery<InvoiceWithRelations[]>({
    queryKey: ["/api/invoices"],
  });

  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/invoices/${id}/send`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Invoice sent successfully" });
    },
    onError: () => {
      toast({ title: "Failed to send invoice", variant: "destructive" });
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/invoices/${id}/resend`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice resent successfully" });
    },
    onError: () => {
      toast({ title: "Failed to resend invoice", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/invoices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Invoice deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete invoice", variant: "destructive" });
    },
  });

  // Sophisticated search function that searches across all invoice fields
  const searchInvoice = useMemo(() => {
    return (invoice: InvoiceWithRelations, query: string): boolean => {
      if (!query.trim()) return true;
      
      const searchTerms = query.toLowerCase().trim().split(/\s+/);

      // Search across all invoice fields
      const searchableFields = [
        // Invoice number (with and without #)
        invoice.invoiceNumber,
        `#${invoice.invoiceNumber}`,
        
        // Client information
        invoice.client?.name,
        invoice.client?.companyName,
        invoice.client?.email,
        
        // Dates in various formats
        formatDate(invoice.issueDate),
        formatDate(invoice.dueDate),
        new Date(invoice.issueDate).toLocaleDateString(),
        new Date(invoice.dueDate).toLocaleDateString(),
        
        // Amount (formatted and raw)
        formatCurrency(invoice.total),
        invoice.total?.toString(),
        invoice.subtotal?.toString(),
        
        // Status
        invoice.status,
        
        // Notes
        invoice.notes,
        
        // Item descriptions - search within all line items
        ...invoice.items.map(item => item.description),
        
        // Item rates/amounts
        ...invoice.items.map(item => formatCurrency(item.rate)),
        ...invoice.items.map(item => item.rate?.toString()),
      ];

      // Check if all search terms match at least one field
      return searchTerms.every(term => 
        searchableFields.some(field => 
          field?.toLowerCase().includes(term)
        )
      );
    };
  }, []);

  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    
    return invoices.filter((invoice) => {
      // First apply status filter
      const matchesStatus = filter === "all" || invoice.status === filter;
      if (!matchesStatus) return false;
      
      // Then apply search filter
      return searchInvoice(invoice, searchQuery);
    });
  }, [invoices, filter, searchQuery, searchInvoice]);

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-heading" data-testid="text-dashboard-title">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here's your invoice overview.</p>
          </div>
          <CreateInvoiceButton />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statsLoading ? (
            <>
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </>
          ) : (
            <>
              <StatCard 
                title="Paid (Last 30 Days)" 
                value={stats?.totalPaid || 0} 
                type="paid" 
              />
              <StatCard 
                title="Unpaid" 
                value={stats?.totalUnpaid || 0} 
                type="unpaid" 
              />
              <StatCard 
                title="Overdue" 
                value={stats?.totalOverdue || 0} 
                type="overdue" 
              />
            </>
          )}
        </div>

        {/* Invoices Section */}
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <h2 className="text-lg font-semibold font-heading whitespace-nowrap">Recent Invoices</h2>
              <AnimatedSearch 
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by invoice #, client, item..."
              />
            </div>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="flex-shrink-0">
              <TabsList>
                <TabsTrigger value="all" data-testid="tab-filter-all">All</TabsTrigger>
                <TabsTrigger value="paid" data-testid="tab-filter-paid">Paid</TabsTrigger>
                <TabsTrigger value="partially_paid" data-testid="tab-filter-partial">Partial</TabsTrigger>
                <TabsTrigger value="overdue" data-testid="tab-filter-overdue">Overdue</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {invoicesLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : filteredInvoices.length === 0 ? (
            searchQuery ? (
              // No search results
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-in fade-in duration-300">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <svg 
                    className="w-6 h-6 text-muted-foreground" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={1.5} 
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                    />
                  </svg>
                </div>
                <h3 className="text-base font-medium mb-1">No matching invoices</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  No invoices match "{searchQuery}". Try searching by invoice number, client name, date, or item description.
                </p>
                <button 
                  onClick={() => setSearchQuery("")}
                  className="mt-4 text-sm text-primary hover:underline"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <EmptyState 
                type="invoices" 
                onAction={() => navigate("/invoices/new")} 
              />
            )
          ) : (
            <InvoiceTable
              invoices={filteredInvoices}
              onSend={(id) => sendMutation.mutate(id)}
              onResend={(id) => resendMutation.mutate(id)}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
