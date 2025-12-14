import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
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
import type { InvoiceWithRelations } from "@shared/schema";

export default function Invoices() {
  const [, navigate] = useLocation();
  const [filter, setFilter] = useState<"all" | "paid" | "partially_paid" | "overdue" | "draft" | "recurring">("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const { data: invoices, isLoading } = useQuery<InvoiceWithRelations[]>({
    queryKey: ["/api/invoices"],
  });

  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/invoices/${id}/send`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/usage"] });
      toast({ title: "Invoice sent successfully" });
    },
    onError: (error: any) => {
      if (error?.error === "INVOICE_LIMIT_REACHED") {
        toast({ 
          title: "Monthly invoice limit reached", 
          description: "Upgrade to Pro for unlimited invoices.",
          variant: "destructive" 
        });
      } else {
        toast({ title: "Failed to send invoice", variant: "destructive" });
      }
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

  // Batch resend mutation
  const batchResendMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      console.log('[Batch Resend Client] Sending IDs:', ids);
      return await apiRequest<{ sent: number; receipts: number; skipped: number; failed: number; errors: any[] }>(
        "POST", 
        "/api/invoices/batch/resend", 
        { ids }
      );
    },
    onSuccess: (result) => {
      console.log('[Batch Resend Client] Success result:', result);
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      
      // Build message
      const messages: string[] = [];
      if (result.sent > 0) {
        messages.push(`✓ Sent ${result.sent} reminder${result.sent !== 1 ? 's' : ''}`);
      }
      if (result.receipts > 0) {
        messages.push(`✓ Sent ${result.receipts} receipt${result.receipts !== 1 ? 's' : ''}`);
      }
      if (result.skipped > 0) {
        messages.push(`${result.skipped} skipped (draft or no email)`);
      }
      if (result.failed > 0) {
        messages.push(`${result.failed} failed`);
        // Log errors for debugging
        if (result.errors && result.errors.length > 0) {
          console.error('[Batch Resend Client] Errors:', result.errors);
        }
      }
      
      const totalSent = result.sent + result.receipts;
      toast({ 
        title: totalSent > 0 ? "Emails sent!" : "No emails sent",
        description: messages.join(' • '),
        variant: totalSent > 0 ? "default" : "destructive"
      });
      
      // Clear selection
      setSelectedIds(new Set());
    },
    onError: (error: any) => {
      console.error('[Batch Resend Client] Error:', error);
      const errorMessage = error?.message || error?.toString() || "Unknown error";
      toast({ 
        title: "Failed to send emails", 
        description: errorMessage,
        variant: "destructive" 
      });
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
      // First apply status/type filter
      let matchesFilter = false;
      if (filter === "all") {
        matchesFilter = true;
      } else if (filter === "recurring") {
        matchesFilter = invoice.isRecurring === true;
      } else {
        matchesFilter = invoice.status === filter;
      }
      if (!matchesFilter) return false;
      
      // Then apply search filter
      return searchInvoice(invoice, search);
    });
  }, [invoices, filter, search, searchInvoice]);

  return (
    <AppLayout>
      <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8 max-w-7xl mx-auto space-y-6 md:space-y-8 pb-32">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-heading" data-testid="text-invoices-title">Invoices</h1>
            <p className="text-muted-foreground">Manage all your invoices</p>
          </div>
          <CreateInvoiceButton />
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Mobile: Two-row grid layout */}
          <div className="md:hidden w-full">
            <div className="grid grid-cols-4 gap-1 bg-muted p-1 rounded-md">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-2 text-sm font-medium rounded-sm transition-all ${filter === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
                data-testid="tab-filter-all"
              >
                All
              </button>
              <button
                onClick={() => setFilter("paid")}
                className={`px-3 py-2 text-sm font-medium rounded-sm transition-all ${filter === "paid" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
                data-testid="tab-filter-paid"
              >
                Paid
              </button>
              <button
                onClick={() => setFilter("partially_paid")}
                className={`px-3 py-2 text-sm font-medium rounded-sm transition-all ${filter === "partially_paid" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
                data-testid="tab-filter-partial"
              >
                Partial
              </button>
              <button
                onClick={() => setFilter("overdue")}
                className={`px-3 py-2 text-sm font-medium rounded-sm transition-all ${filter === "overdue" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
                data-testid="tab-filter-overdue"
              >
                Overdue
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1 bg-muted p-1 rounded-md mt-1">
              <button
                onClick={() => setFilter("draft")}
                className={`px-3 py-2 text-sm font-medium rounded-sm transition-all ${filter === "draft" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
                data-testid="tab-filter-draft"
              >
                Draft
              </button>
              <button
                onClick={() => setFilter("recurring")}
                className={`px-3 py-2 text-sm font-medium rounded-sm transition-all ${filter === "recurring" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
                data-testid="tab-filter-recurring"
              >
                Recurring
              </button>
            </div>
          </div>

          {/* Desktop: Standard tabs */}
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="hidden md:block">
            <TabsList>
              <TabsTrigger value="all" data-testid="tab-filter-all">All</TabsTrigger>
              <TabsTrigger value="paid" data-testid="tab-filter-paid">Paid</TabsTrigger>
              <TabsTrigger value="partially_paid" data-testid="tab-filter-partial">Partial</TabsTrigger>
              <TabsTrigger value="overdue" data-testid="tab-filter-overdue">Overdue</TabsTrigger>
              <TabsTrigger value="draft" data-testid="tab-filter-draft">Draft</TabsTrigger>
              <TabsTrigger value="recurring" data-testid="tab-filter-recurring">Recurring</TabsTrigger>
            </TabsList>
          </Tabs>
          <AnimatedSearch
            value={search}
            onChange={setSearch}
            placeholder="Search invoices..."
          />
        </div>

        {/* Invoices */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : filteredInvoices.length === 0 ? (
          <EmptyState type="invoices" onAction={() => navigate("/invoices/new")} />
        ) : (
          <>
            <InvoiceTable
              invoices={filteredInvoices}
              onSend={(id) => sendMutation.mutate(id)}
              onResend={(id) => resendMutation.mutate(id)}
              onDelete={(id) => deleteMutation.mutate(id)}
              isRecurringView={filter === "recurring"}
              selectedIds={filter === "recurring" ? undefined : selectedIds}
              onSelectionChange={filter === "recurring" ? undefined : setSelectedIds}
              onBatchResend={(ids) => batchResendMutation.mutate(ids)}
            />
          </>
        )}
      </div>
    </AppLayout>
  );
}
