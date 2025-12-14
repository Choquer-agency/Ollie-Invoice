import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { InvoiceTable } from "@/components/InvoiceTable";
import { BulkActionBar } from "@/components/BulkActionBar";
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

  // Batch mutations
  const batchSendMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return await apiRequest<{ sent: number; failed: number; errors: any[] }>(
        "POST", 
        "/api/invoices/batch/send", 
        { ids }
      );
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/usage"] });
      
      if (result.failed > 0) {
        toast({ 
          title: `Sent ${result.sent} invoices, ${result.failed} failed`,
          description: "Some invoices could not be sent. Please try again.",
          variant: "destructive"
        });
      } else {
        toast({ 
          title: `Successfully sent ${result.sent} ${result.sent === 1 ? 'invoice' : 'invoices'}`,
        });
      }
      setSelectedIds(new Set());
    },
    onError: (error: any) => {
      if (error?.error === "INVOICE_LIMIT_REACHED") {
        toast({ 
          title: "Monthly invoice limit reached", 
          description: error.message || "Upgrade to Pro for unlimited invoices.",
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Failed to send invoices", 
          description: error.message,
          variant: "destructive" 
        });
      }
    },
  });

  const batchResendMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return await apiRequest<{ sent: number; skipped: number; failed: number; errors: any[] }>(
        "POST", 
        "/api/invoices/batch/resend", 
        { ids }
      );
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      
      const messages: string[] = [];
      if (result.sent > 0) messages.push(`Sent ${result.sent} reminders`);
      if (result.skipped > 0) messages.push(`${result.skipped} skipped`);
      if (result.failed > 0) messages.push(`${result.failed} failed`);
      
      toast({ 
        title: messages.join(', '),
        variant: result.failed > 0 ? "destructive" : "default"
      });
      setSelectedIds(new Set());
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to send reminders", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleBatchExport = async (ids: string[]) => {
    try {
      const response = await fetch('/api/invoices/batch/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to export invoices');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const today = new Date().toISOString().split('T')[0];
      a.download = `invoices-batch-${today}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({ title: `Exported ${ids.length} ${ids.length === 1 ? 'invoice' : 'invoices'}` });
      setSelectedIds(new Set());
    } catch (error) {
      toast({ 
        title: "Failed to export invoices", 
        variant: "destructive" 
      });
    }
  };

  // Clear selection when filter or search changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [filter, search]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + A: Select all visible
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && filteredInvoices.length > 0) {
        e.preventDefault();
        setSelectedIds(new Set(filteredInvoices.map(inv => inv.id)));
      }
      
      // Escape: Clear selection
      if (e.key === 'Escape' && selectedIds.size > 0) {
        setSelectedIds(new Set());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredInvoices, selectedIds.size]);

  // Get selected invoices
  const selectedInvoices = useMemo(() => {
    return filteredInvoices.filter(inv => selectedIds.has(inv.id));
  }, [filteredInvoices, selectedIds]);

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
            />
            
            {filter !== "recurring" && (
              <BulkActionBar
                selectedInvoices={selectedInvoices}
                onSendDrafts={() => batchSendMutation.mutate(Array.from(selectedIds))}
                onSendReminders={() => batchResendMutation.mutate(Array.from(selectedIds))}
                onExportPDF={() => handleBatchExport(Array.from(selectedIds))}
                onClearSelection={() => setSelectedIds(new Set())}
                isLoading={batchSendMutation.isPending || batchResendMutation.isPending}
              />
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
