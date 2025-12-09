import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/StatCard";
import { InvoiceTable } from "@/components/InvoiceTable";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/formatters";
import { DollarSign, FileText, AlertCircle, Crown, Building2, Users } from "lucide-react";
import type { DashboardStats, Business } from "@shared/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();

  // Check admin status
  const { data: adminStatus, isLoading: isLoadingAdmin } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/status"],
    queryFn: () => apiRequest("GET", "/api/admin/status"),
  });

  // Get Ollie business
  const { data: ollieBusiness, isLoading: isLoadingBusiness } = useQuery<Business>({
    queryKey: ["/api/admin/ollie-business"],
    queryFn: () => apiRequest("GET", "/api/admin/ollie-business"),
    enabled: adminStatus?.isAdmin === true,
  });

  // Get dashboard stats
  const { data: stats, isLoading: isLoadingStats } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard/stats"],
    queryFn: () => apiRequest("GET", "/api/admin/dashboard/stats"),
    enabled: adminStatus?.isAdmin === true && !!ollieBusiness,
  });

  // Get clients
  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ["/api/admin/clients"],
    queryFn: () => apiRequest("GET", "/api/admin/clients"),
    enabled: adminStatus?.isAdmin === true && !!ollieBusiness,
  });

  if (isLoadingAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!adminStatus?.isAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Alert variant="destructive" className="max-w-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You do not have permission to access the admin dashboard.
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  const isLoading = isLoadingBusiness || isLoadingStats || isLoadingClients;

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Crown className="h-8 w-8 text-[#2CA01C]" />
              <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            </div>
            <p className="text-muted-foreground mt-1">
              Manage Ollie Invoice's own invoices and clients
            </p>
          </div>
          {!ollieBusiness && !isLoadingBusiness && (
            <Button onClick={() => setLocation("/admin/setup")}>
              <Building2 className="mr-2 h-4 w-4" />
              Setup Ollie Business
            </Button>
          )}
        </div>

        {!ollieBusiness && !isLoadingBusiness ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Setup Required</AlertTitle>
            <AlertDescription>
              You need to set up the Ollie Invoice business profile first. This business will be used to invoice customers when they subscribe.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Business Info */}
            {ollieBusiness && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {ollieBusiness.businessName}
                  </CardTitle>
                  <CardDescription>
                    {ollieBusiness.email && <span className="mr-4">{ollieBusiness.email}</span>}
                    {ollieBusiness.phone && <span>{ollieBusiness.phone}</span>}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {isLoading ? (
                <>
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                </>
              ) : stats ? (
                <>
                  <StatCard
                    title="Total Revenue"
                    value={formatCurrency(stats.totalPaid, ollieBusiness?.currency)}
                    icon={DollarSign}
                    description="Total paid invoices"
                  />
                  <StatCard
                    title="Outstanding"
                    value={formatCurrency(stats.totalUnpaid, ollieBusiness?.currency)}
                    icon={FileText}
                    description="Unpaid invoices"
                    variant="warning"
                  />
                  <StatCard
                    title="Overdue"
                    value={formatCurrency(stats.totalOverdue, ollieBusiness?.currency)}
                    icon={AlertCircle}
                    description="Past due invoices"
                    variant="destructive"
                  />
                  <StatCard
                    title="Active Clients"
                    value={clients.length.toString()}
                    icon={Users}
                    description="Total subscribers"
                  />
                </>
              ) : null}
            </div>

            {/* Recent Invoices */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Invoices</CardTitle>
                <CardDescription>
                  Subscription invoices generated for Ollie Invoice customers
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : stats && stats.recentInvoices.length > 0 ? (
                  <InvoiceTable
                    invoices={stats.recentInvoices}
                    currency={ollieBusiness?.currency || "USD"}
                    onViewInvoice={(id) => setLocation(`/invoices/${id}`)}
                  />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No invoices yet</p>
                    <p className="text-sm">
                      Invoices will be automatically generated when customers subscribe
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}

