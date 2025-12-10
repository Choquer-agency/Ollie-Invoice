import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { InvoiceStatusBadge } from "@/components/InvoiceStatusBadge";
import { ReceivePaymentModal } from "@/components/ReceivePaymentModal";
import { SendInvoiceButton } from "@/components/SendInvoiceButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { 
  ArrowLeft, 
  Download, 
  Copy, 
  DollarSign, 
  Pencil, 
  Files,
  Clock,
  ChevronDown,
  MoreHorizontal,
  Crown
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { InvoiceWithRelations, Business } from "@shared/schema";
import { DEFAULT_BRAND_COLOR } from "@/lib/brandColors";

export default function InvoicePreview() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  const { data: invoice, isLoading } = useQuery<InvoiceWithRelations>({
    queryKey: ["/api/invoices", params.id],
  });

  const { data: business } = useQuery<Business | null>({
    queryKey: ["/api/business"],
  });

  interface UsageData {
    tier: 'free' | 'pro';
    count: number;
    limit: number;
    canSend: boolean;
    resetDate: string | null;
  }

  const { data: subscriptionUsage } = useQuery<UsageData>({
    queryKey: ["/api/subscription/usage"],
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/invoices/${params.id}/send`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", params.id] });
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

  const copyShareLink = () => {
    if (invoice?.shareToken) {
      const url = `${window.location.origin}/pay/${invoice.shareToken}`;
      navigator.clipboard.writeText(url);
      toast({ title: "Payment link copied to clipboard" });
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[800px]" />
        </div>
      </AppLayout>
    );
  }

  if (!invoice) {
    return (
      <AppLayout>
        <div className="p-6 md:p-8 max-w-4xl mx-auto">
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground">Invoice not found</p>
              <Button variant="outline" onClick={() => navigate("/dashboard")} className="mt-4">
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8 max-w-4xl mx-auto space-y-6 pb-32">
        {/* Header */}
        <div className="space-y-4">
          {/* Top row: Back button, Invoice number, Status badge */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/invoices")} data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold font-heading" data-testid="text-invoice-number">
                  Invoice #{invoice.invoiceNumber}
                </h1>
                <InvoiceStatusBadge status={invoice.status} className="text-sm" />
              </div>
              <p className="text-muted-foreground text-sm">
                Created on {formatDate(invoice.createdAt!)}
              </p>
            </div>
          </div>
          
          {/* Action buttons - Desktop view */}
          <div className="hidden sm:flex flex-col items-end gap-2 pl-14">
            <div className="flex items-center gap-2 flex-wrap">
              {invoice.status === "draft" && (
                <>
                  <Button variant="outline" onClick={() => navigate(`/invoices/${invoice.id}/edit`)} data-testid="button-edit">
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <SendInvoiceButton 
                    onClick={() => sendMutation.mutateAsync()} 
                    disabled={sendMutation.isPending || (subscriptionUsage && !subscriptionUsage.canSend && subscriptionUsage.tier !== 'pro')}
                  />
                </>
              )}
            {invoice.status !== "paid" && invoice.status !== "draft" && (
              <Button variant="outline" onClick={() => setPaymentModalOpen(true)} data-testid="button-receive-payment">
                <DollarSign className="h-4 w-4 mr-2" />
                Receive Payment
              </Button>
            )}
              <Button variant="outline" onClick={copyShareLink} data-testid="button-copy-link">
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
              <Button variant="outline" asChild data-testid="button-download-pdf">
                <a href={`/api/public/invoices/${invoice.shareToken}/pdf`} download={`invoice-${invoice.invoiceNumber}.pdf`}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </a>
              </Button>
              <Button variant="outline" onClick={() => navigate(`/invoices/new?duplicate=${invoice.id}`)} data-testid="button-duplicate-invoice">
                <Files className="h-4 w-4 mr-2" />
                Duplicate
              </Button>
            </div>
            {invoice.status === "draft" && subscriptionUsage && !subscriptionUsage.canSend && subscriptionUsage.tier !== 'pro' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  {subscriptionUsage.count}/{subscriptionUsage.limit} free used
                </span>
                <Link href="/settings#subscription">
                  <Badge variant="secondary" className="text-xs gap-1 cursor-pointer hover:bg-muted transition-colors">
                    <Crown className="h-3 w-3" />
                    Upgrade to Pro
                  </Badge>
                </Link>
              </div>
            )}
          </div>

          {/* Action buttons - Mobile view with collapsible */}
          <div className="sm:hidden space-y-3">
            {/* Primary action always visible */}
            <div className="flex items-center gap-2">
              {invoice.status === "draft" ? (
                <>
                  <Button variant="outline" className="h-11" onClick={() => navigate(`/invoices/${invoice.id}/edit`)} data-testid="button-edit-mobile">
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <SendInvoiceButton 
                    onClick={() => sendMutation.mutateAsync()} 
                    disabled={sendMutation.isPending}
                  />
                </>
              ) : invoice.status !== "paid" ? (
                <Button variant="outline" className="h-11" onClick={() => setPaymentModalOpen(true)}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Receive Payment
                </Button>
              ) : null}
            </div>

            {/* Collapsible secondary actions */}
            <Collapsible open={actionsOpen} onOpenChange={setActionsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full h-11 justify-between text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <MoreHorizontal className="h-4 w-4" />
                    More Actions
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${actionsOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                <Button variant="outline" className="w-full h-11 justify-start" onClick={copyShareLink}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
                <Button variant="outline" className="w-full h-11 justify-start" asChild>
                  <a href={`/api/public/invoices/${invoice.shareToken}/pdf`} download={`invoice-${invoice.invoiceNumber}.pdf`}>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </a>
                </Button>
                <Button variant="outline" className="w-full h-11 justify-start" onClick={() => navigate(`/invoices/new?duplicate=${invoice.id}`)}>
                  <Files className="h-4 w-4 mr-2" />
                  Duplicate
                </Button>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        {/* Invoice Document */}
        <Card className="overflow-hidden">
          <CardContent className="p-8 md:p-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between gap-8 mb-12">
              <div>
                {business?.logoUrl && (
                  <img 
                    src={business.logoUrl} 
                    alt={business.businessName} 
                    className="h-12 w-auto object-contain mb-3 max-w-[300px] max-h-[32px]"
                  />
                )}
                <h2 className="text-2xl font-bold font-heading mb-1">{business?.businessName || "Your Business"}</h2>
                {business?.email && <p className="text-muted-foreground text-sm">{business.email}</p>}
                {business?.phone && <p className="text-muted-foreground text-sm">{business.phone}</p>}
                {business?.address && <p className="text-muted-foreground text-sm whitespace-pre-line">{business.address}</p>}
                {business?.taxNumber && <p className="text-muted-foreground text-sm mt-2">Tax #: {business.taxNumber}</p>}
              </div>
              <div className="text-left md:text-right">
                <p 
                  className="text-3xl font-bold mb-2"
                  style={{ color: (business as any)?.brandColor || DEFAULT_BRAND_COLOR }}
                >
                  INVOICE
                </p>
                <p className="text-muted-foreground">#{invoice.invoiceNumber}</p>
              </div>
            </div>

            {/* Bill To & Dates */}
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Bill To</p>
                {invoice.client ? (
                  <>
                    <p className="font-semibold">{invoice.client.name}</p>
                    {invoice.client.email && <p className="text-muted-foreground text-sm">{invoice.client.email}</p>}
                    {invoice.client.phone && <p className="text-muted-foreground text-sm">{invoice.client.phone}</p>}
                    {invoice.client.address && <p className="text-muted-foreground text-sm whitespace-pre-line">{invoice.client.address}</p>}
                  </>
                ) : (
                  <p className="text-muted-foreground">No client selected</p>
                )}
              </div>
              <div className="md:text-right">
                <div className="grid grid-cols-2 gap-2 text-sm md:inline-grid">
                  <p className="text-muted-foreground">Issue Date:</p>
                  <p className="font-medium">{formatDate(invoice.issueDate)}</p>
                  <p className="text-muted-foreground">Due Date:</p>
                  <p className="font-medium">{formatDate(invoice.dueDate)}</p>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="mb-8 overflow-x-auto">
              {/* Desktop table layout */}
              <div className="hidden sm:block">
                <div 
                  className="grid grid-cols-12 gap-4 py-3 border-b-2 text-xs font-semibold uppercase tracking-wider"
                  style={{ 
                    borderColor: (business as any)?.brandColor || DEFAULT_BRAND_COLOR, 
                    color: (business as any)?.brandColor || DEFAULT_BRAND_COLOR 
                  }}
                >
                  <div className="col-span-6">Description</div>
                  <div className="col-span-2 text-right">Qty</div>
                  <div className="col-span-2 text-right">Rate</div>
                  <div className="col-span-2 text-right">Amount</div>
                </div>
                {invoice.items?.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-12 gap-4 py-4 border-b border-muted" data-testid={`row-item-${index}`}>
                    <div className="col-span-6">{item.description}</div>
                    <div className="col-span-2 text-right text-muted-foreground">{item.quantity}</div>
                    <div className="col-span-2 text-right text-muted-foreground">{formatCurrency(item.rate)}</div>
                    <div className="col-span-2 text-right font-medium">{formatCurrency(item.lineTotal)}</div>
                  </div>
                ))}
              </div>

              {/* Mobile card layout */}
              <div className="sm:hidden space-y-4">
                <div className="grid grid-cols-4 gap-2 py-2 border-b-2 border-foreground/20 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-2">Description</div>
                  <div className="text-center">Qty</div>
                  <div className="text-right">Amount</div>
                </div>
                {invoice.items?.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-4 gap-2 py-3 border-b border-muted text-sm" data-testid={`row-item-mobile-${index}`}>
                    <div className="col-span-2">
                      <p className="font-medium">{item.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">@ {formatCurrency(item.rate)}</p>
                    </div>
                    <div className="text-center text-muted-foreground self-center">{item.quantity}</div>
                    <div className="text-right font-medium self-center">{formatCurrency(item.lineTotal)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-12">
              <div className="w-full max-w-xs space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>
                {parseFloat(invoice.taxAmount as string) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatCurrency(invoice.taxAmount)}</span>
                  </div>
                )}
                {parseFloat((invoice as any).discountAmount as string || "0") > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Discount {(invoice as any).discountType === "percent" 
                        ? `(${parseFloat((invoice as any).discountValue || "0")}%)` 
                        : ""}
                    </span>
                    <span className="text-[#2CA01C]">-{formatCurrency((invoice as any).discountAmount)}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between text-xl font-bold">
                  <span>Total</span>
                  <span 
                    style={{ color: (business as any)?.brandColor || DEFAULT_BRAND_COLOR }}
                    data-testid="text-invoice-total"
                  >
                    {formatCurrency(invoice.total)}
                  </span>
                </div>
                {/* Show payment status for partially paid invoices */}
                {parseFloat(invoice.amountPaid as string) > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-[#2CA01C]">
                      <span>Amount Paid</span>
                      <span>-{formatCurrency(invoice.amountPaid)}</span>
                    </div>
                    {invoice.status !== "paid" && (
                      <div className="flex justify-between text-lg font-bold">
                        <span>Balance Due</span>
                        <span className="text-amber-600">
                          {formatCurrency(parseFloat(invoice.total as string) - parseFloat(invoice.amountPaid as string))}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="mt-8 pt-8 border-t">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes</p>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{invoice.notes}</p>
              </div>
            )}

            {/* Payment History */}
            {invoice.payments && invoice.payments.length > 0 && (
              <div className="mt-8 pt-8 border-t">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Payment History</p>
                <div className="space-y-3">
                  {invoice.payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[#2CA01C]/10 flex items-center justify-center">
                          <DollarSign className="h-4 w-4 text-[#2CA01C]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {formatCurrency(payment.amount)}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDate(payment.createdAt!)}
                            {payment.notes && (
                              <span className="text-muted-foreground">• {payment.notes}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-[#2CA01C] bg-[#2CA01C]/10 px-2 py-1 rounded">
                        {payment.status === "completed" ? "Received" : payment.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Paid Stamp */}
            {invoice.status === "paid" && (
              <div className="mt-8 flex justify-center">
                <div 
                  className="border-4 font-bold text-2xl px-8 py-2 rounded-md rotate-[-5deg] opacity-80"
                  style={{ 
                    borderColor: (business as any)?.brandColor || DEFAULT_BRAND_COLOR,
                    color: (business as any)?.brandColor || DEFAULT_BRAND_COLOR
                  }}
                >
                  PAID
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <ReceivePaymentModal
          invoice={invoice}
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
        />
      </div>
    </AppLayout>
  );
}
