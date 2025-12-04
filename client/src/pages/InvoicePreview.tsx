import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { InvoiceStatusBadge } from "@/components/InvoiceStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { 
  ArrowLeft, 
  Send, 
  Download, 
  Copy, 
  CheckCircle, 
  Pencil, 
  CreditCard,
  Mail,
  ExternalLink
} from "lucide-react";
import type { InvoiceWithRelations, Business } from "@shared/schema";

export default function InvoicePreview() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: invoice, isLoading } = useQuery<InvoiceWithRelations>({
    queryKey: ["/api/invoices", params.id],
  });

  const { data: business } = useQuery<Business | null>({
    queryKey: ["/api/business"],
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/invoices/${params.id}/send`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", params.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice sent successfully" });
    },
    onError: () => {
      toast({ title: "Failed to send invoice", variant: "destructive" });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/invoices/${params.id}/mark-paid`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", params.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Invoice marked as paid" });
    },
    onError: () => {
      toast({ title: "Failed to mark invoice as paid", variant: "destructive" });
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
      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold" data-testid="text-invoice-number">
                  Invoice #{invoice.invoiceNumber}
                </h1>
                <InvoiceStatusBadge status={invoice.status} />
              </div>
              <p className="text-muted-foreground text-sm">
                Created on {formatDate(invoice.createdAt!)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {invoice.status === "draft" && (
              <>
                <Button variant="outline" onClick={() => navigate(`/invoices/${invoice.id}/edit`)} data-testid="button-edit">
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending} data-testid="button-send">
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
              </>
            )}
            {invoice.status !== "paid" && invoice.status !== "draft" && (
              <Button variant="outline" onClick={() => markPaidMutation.mutate()} disabled={markPaidMutation.isPending} data-testid="button-mark-paid">
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark as Paid
              </Button>
            )}
            <Button variant="outline" onClick={copyShareLink} data-testid="button-copy-link">
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
            <Button variant="outline" asChild data-testid="button-download-pdf">
              <a href={`/api/invoices/${params.id}/pdf`} download>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </a>
            </Button>
          </div>
        </div>

        {/* Invoice Document */}
        <Card className="overflow-hidden">
          <CardContent className="p-8 md:p-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between gap-8 mb-12">
              <div>
                <h2 className="text-2xl font-bold mb-1">{business?.businessName || "Your Business"}</h2>
                {business?.email && <p className="text-muted-foreground text-sm">{business.email}</p>}
                {business?.phone && <p className="text-muted-foreground text-sm">{business.phone}</p>}
                {business?.address && <p className="text-muted-foreground text-sm whitespace-pre-line">{business.address}</p>}
                {business?.taxNumber && <p className="text-muted-foreground text-sm mt-2">Tax #: {business.taxNumber}</p>}
              </div>
              <div className="text-left md:text-right">
                <p className="text-3xl font-bold text-primary mb-2">INVOICE</p>
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
            <div className="mb-8">
              <div className="grid grid-cols-12 gap-4 py-3 border-b-2 border-foreground/20 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
                <Separator className="my-2" />
                <div className="flex justify-between text-xl font-bold">
                  <span>Total</span>
                  <span data-testid="text-invoice-total">{formatCurrency(invoice.total)}</span>
                </div>
              </div>
            </div>

            {/* Payment Section */}
            {invoice.status !== "paid" && (
              <div className="bg-muted/50 rounded-lg p-6 space-y-4">
                <p className="font-semibold">Payment Options</p>
                <div className="flex flex-col sm:flex-row gap-4">
                  {(invoice.paymentMethod === "stripe" || invoice.paymentMethod === "both") && (
                    <Button className="flex-1" asChild>
                      <a href={`/pay/${invoice.shareToken}`} target="_blank" rel="noopener noreferrer">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Pay with Card
                        <ExternalLink className="h-3 w-3 ml-2" />
                      </a>
                    </Button>
                  )}
                  {(invoice.paymentMethod === "etransfer" || invoice.paymentMethod === "both") && business?.etransferEmail && (
                    <div className="flex-1 p-4 bg-background rounded-lg border">
                      <p className="text-sm font-medium mb-1">E-Transfer to:</p>
                      <p className="text-sm text-muted-foreground">{business.etransferEmail}</p>
                      {business.etransferInstructions && (
                        <p className="text-xs text-muted-foreground mt-2">{business.etransferInstructions}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {invoice.notes && (
              <div className="mt-8 pt-8 border-t">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes</p>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{invoice.notes}</p>
              </div>
            )}

            {/* Paid Stamp */}
            {invoice.status === "paid" && (
              <div className="mt-8 flex justify-center">
                <div className="border-4 border-emerald-500 text-emerald-500 font-bold text-2xl px-8 py-2 rounded-md rotate-[-5deg] opacity-80">
                  PAID
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
