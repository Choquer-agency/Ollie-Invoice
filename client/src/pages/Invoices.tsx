import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { InvoiceTable } from "@/components/InvoiceTable";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Search } from "lucide-react";
import type { InvoiceWithRelations } from "@shared/schema";

export default function Invoices() {
  const [, navigate] = useLocation();
  const [filter, setFilter] = useState<"all" | "paid" | "sent" | "overdue" | "draft">("all");
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const { data: invoices, isLoading } = useQuery<InvoiceWithRelations[]>({
    queryKey: ["/api/invoices"],
  });

  const markPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/invoices/${id}/mark-paid`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Invoice marked as paid" });
    },
    onError: () => {
      toast({ title: "Failed to mark invoice as paid", variant: "destructive" });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/invoices/${id}/send`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice sent successfully" });
    },
    onError: () => {
      toast({ title: "Failed to send invoice", variant: "destructive" });
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

  const filteredInvoices = invoices?.filter((invoice) => {
    const matchesFilter = filter === "all" || invoice.status === filter;
    const matchesSearch = search === "" || 
      invoice.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      invoice.client?.name.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  }) || [];

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-invoices-title">Invoices</h1>
            <p className="text-muted-foreground">Manage all your invoices</p>
          </div>
          <Button onClick={() => navigate("/invoices/new")} data-testid="button-create-invoice">
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search-invoices"
            />
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList>
              <TabsTrigger value="all" data-testid="tab-filter-all">All</TabsTrigger>
              <TabsTrigger value="paid" data-testid="tab-filter-paid">Paid</TabsTrigger>
              <TabsTrigger value="sent" data-testid="tab-filter-sent">Sent</TabsTrigger>
              <TabsTrigger value="overdue" data-testid="tab-filter-overdue">Overdue</TabsTrigger>
              <TabsTrigger value="draft" data-testid="tab-filter-draft">Draft</TabsTrigger>
            </TabsList>
          </Tabs>
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
          <InvoiceTable
            invoices={filteredInvoices}
            onSend={(id) => sendMutation.mutate(id)}
            onMarkPaid={(id) => markPaidMutation.mutate(id)}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        )}
      </div>
    </AppLayout>
  );
}
