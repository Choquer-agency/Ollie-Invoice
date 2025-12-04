import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { CreditCard, Mail, Receipt, CheckCircle2 } from "lucide-react";

interface PublicInvoiceData {
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    issueDate: string;
    dueDate: string;
    subtotal: string;
    taxAmount: string;
    total: string;
    notes: string | null;
    paymentMethod: string;
    items: Array<{
      id: string;
      description: string;
      quantity: string;
      rate: string;
      lineTotal: string;
    }>;
  };
  business: {
    businessName: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    taxNumber: string | null;
    etransferEmail: string | null;
    etransferInstructions: string | null;
  };
  client: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  } | null;
  stripePaymentLink: string | null;
}

export default function PublicInvoice() {
  const params = useParams<{ token: string }>();

  const { data, isLoading, error } = useQuery<PublicInvoiceData>({
    queryKey: ["/api/public/invoices", params.token],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[600px]" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="py-16 text-center">
            <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Invoice Not Found</h2>
            <p className="text-muted-foreground">
              This invoice link may have expired or is invalid.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { invoice, business, client, stripePaymentLink } = data;
  const isPaid = invoice.status === "paid";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary">
              <Receipt className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold">Invoice</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="p-6 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Payment Actions */}
          {!isPaid && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-lg">Amount Due</p>
                    <p className="text-3xl font-bold text-primary">{formatCurrency(invoice.total)}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Due by {formatDate(invoice.dueDate)}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    {(invoice.paymentMethod === "stripe" || invoice.paymentMethod === "both") && stripePaymentLink && (
                      <Button size="lg" className="w-full sm:w-auto" asChild>
                        <a href={stripePaymentLink} data-testid="button-pay-now">
                          <CreditCard className="h-4 w-4 mr-2" />
                          Pay Now
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
                
                {(invoice.paymentMethod === "etransfer" || invoice.paymentMethod === "both") && business.etransferEmail && (
                  <div className="mt-4 pt-4 border-t border-primary/10">
                    <p className="text-sm font-medium mb-1">Or pay by E-Transfer:</p>
                    <p className="text-sm text-muted-foreground">Send to: {business.etransferEmail}</p>
                    {business.etransferInstructions && (
                      <p className="text-xs text-muted-foreground mt-1">{business.etransferInstructions}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {isPaid && (
            <Card className="border-emerald-500/20 bg-emerald-500/5">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-emerald-500/20">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg text-emerald-700 dark:text-emerald-400">
                      Payment Received
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Thank you for your payment of {formatCurrency(invoice.total)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Invoice Document */}
          <Card>
            <CardContent className="p-8 md:p-12">
              {/* Header */}
              <div className="flex flex-col md:flex-row justify-between gap-8 mb-12">
                <div>
                  <h2 className="text-2xl font-bold mb-1">{business.businessName}</h2>
                  {business.email && <p className="text-muted-foreground text-sm">{business.email}</p>}
                  {business.phone && <p className="text-muted-foreground text-sm">{business.phone}</p>}
                  {business.address && <p className="text-muted-foreground text-sm whitespace-pre-line">{business.address}</p>}
                  {business.taxNumber && <p className="text-muted-foreground text-sm mt-2">Tax #: {business.taxNumber}</p>}
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
                  {client ? (
                    <>
                      <p className="font-semibold">{client.name}</p>
                      {client.email && <p className="text-muted-foreground text-sm">{client.email}</p>}
                      {client.phone && <p className="text-muted-foreground text-sm">{client.phone}</p>}
                      {client.address && <p className="text-muted-foreground text-sm whitespace-pre-line">{client.address}</p>}
                    </>
                  ) : (
                    <p className="text-muted-foreground">-</p>
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

              {/* Line Items */}
              <div className="mb-8">
                <div className="grid grid-cols-12 gap-4 py-3 border-b-2 border-foreground/20 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-6">Description</div>
                  <div className="col-span-2 text-right">Qty</div>
                  <div className="col-span-2 text-right">Rate</div>
                  <div className="col-span-2 text-right">Amount</div>
                </div>
                {invoice.items.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-4 py-4 border-b border-muted">
                    <div className="col-span-6">{item.description}</div>
                    <div className="col-span-2 text-right text-muted-foreground">{item.quantity}</div>
                    <div className="col-span-2 text-right text-muted-foreground">{formatCurrency(item.rate)}</div>
                    <div className="col-span-2 text-right font-medium">{formatCurrency(item.lineTotal)}</div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="flex justify-end mb-8">
                <div className="w-full max-w-xs space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  {parseFloat(invoice.taxAmount) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span>{formatCurrency(invoice.taxAmount)}</span>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between text-xl font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(invoice.total)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {invoice.notes && (
                <div className="pt-8 border-t">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{invoice.notes}</p>
                </div>
              )}

              {/* Paid Stamp */}
              {isPaid && (
                <div className="mt-8 flex justify-center">
                  <div className="border-4 border-emerald-500 text-emerald-500 font-bold text-2xl px-8 py-2 rounded-md rotate-[-5deg] opacity-80">
                    PAID
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
