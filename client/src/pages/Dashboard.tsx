import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { InvoiceTable } from "@/components/InvoiceTable";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, FileText } from "lucide-react";
import { useState } from "react";
import type { DashboardStats, InvoiceWithRelations } from "@shared/schema";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [filter, setFilter] = useState<"all" | "paid" | "sent" | "overdue" | "draft">("all");
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery<InvoiceWithRelations[]>({
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

  const filteredInvoices = invoices?.filter((invoice) => {
    if (filter === "all") return true;
    return invoice.status === filter;
  }) || [];

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here's your invoice overview.</p>
          </div>
          <Button onClick={() => navigate("/invoices/new")} data-testid="button-create-invoice">
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Recent Invoices</h2>
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

          {invoicesLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : filteredInvoices.length === 0 ? (
            <EmptyState 
              type="invoices" 
              onAction={() => navigate("/invoices/new")} 
            />
          ) : (
            <InvoiceTable
              invoices={filteredInvoices}
              onSend={(id) => sendMutation.mutate(id)}
              onResend={(id) => resendMutation.mutate(id)}
              onMarkPaid={(id) => markPaidMutation.mutate(id)}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
