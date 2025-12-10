import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { CreditCard, Banknote, Receipt, CheckCircle2, Download, Copy, Check } from "lucide-react";
import { FEATURES } from "@/lib/featureFlags";
import { DEFAULT_BRAND_COLOR, getContrastColor } from "@/lib/brandColors";

// Copyable text component for E-Transfer details
function CopyableField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = value;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <p className="flex items-center gap-2">
      {label && <span className="text-muted-foreground">{label}: </span>}
      <button
        onClick={handleCopy}
        className="group inline-flex items-center gap-1.5 hover:text-[#2CA01C] transition-colors cursor-pointer"
        title={`Click to copy ${label.toLowerCase()}`}
      >
        <span className={`font-medium ${mono ? 'font-mono' : ''}`}>
          {value}
        </span>
        {copied ? (
          <span className="inline-flex items-center gap-1 text-xs text-[#2CA01C]">
            <Check className="h-3 w-3" />
            Copied
          </span>
        ) : (
          <Copy className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
        )}
      </button>
    </p>
  );
}

interface PublicInvoiceData {
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    issueDate: string;
    dueDate: string;
    subtotal: string;
    taxAmount: string;
    discountType?: string | null;
    discountValue?: string | null;
    discountAmount?: string | null;
    total: string;
    amountPaid?: string;
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
    logoUrl: string | null;
    brandColor: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    taxNumber: string | null;
    etransferEmail: string | null;
    etransferInstructions: string | null;
  };
  client: {
    name: string;
    companyName: string | null;
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
            <h2 className="text-xl font-semibold font-heading mb-2">Invoice Not Found</h2>
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
  const isPartiallyPaid = invoice.status === "partially_paid";
  const amountPaid = parseFloat(invoice.amountPaid || "0");
  const total = parseFloat(invoice.total);
  const remainingBalance = total - amountPaid;
  
  // Brand color for customization
  const brandColor = business.brandColor || DEFAULT_BRAND_COLOR;
  const brandTextColor = getContrastColor(brandColor);
  
  const hasStripe = FEATURES.STRIPE_ENABLED && (invoice.paymentMethod === "stripe" || invoice.paymentMethod === "both") && stripePaymentLink;
  const hasEtransfer = (invoice.paymentMethod === "etransfer" || invoice.paymentMethod === "both") && business.etransferEmail;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {business.logoUrl ? (
              <img 
                src={business.logoUrl} 
                alt={business.businessName} 
                className="h-[22px] w-auto object-contain max-w-[210px]"
              />
            ) : (
              <div className="p-2 rounded-lg bg-primary">
                <Receipt className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" asChild data-testid="button-download-pdf">
            <a href={`/api/public/invoices/${params.token}/pdf`} download>
              <Download className="h-4 w-4 mr-2" />
              PDF
            </a>
          </Button>
        </div>
      </header>

      <main className="p-6 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Payment Actions */}
          {!isPaid && (hasStripe || hasEtransfer) && (
            <Card 
              className="bg-opacity-5"
              style={{ 
                borderColor: `${brandColor}33`,
                backgroundColor: `${brandColor}0D`
              }}
            >
              <CardContent className="p-6">
                <div className="mb-6">
                  <p className="font-semibold text-lg">Pay Your Invoice</p>
                  {isPartiallyPaid ? (
                    <>
                      <p 
                        className="text-3xl font-bold" 
                        style={{ color: brandColor }}
                        data-testid="text-amount-due"
                      >
                        {formatCurrency(remainingBalance)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Balance remaining (${formatCurrency(amountPaid)} of {formatCurrency(total)} paid)
                      </p>
                    </>
                  ) : (
                    <>
                      <p 
                        className="text-3xl font-bold" 
                        style={{ color: brandColor }}
                        data-testid="text-amount-due"
                      >
                        {formatCurrency(invoice.total)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Due by {formatDate(invoice.dueDate)}
                      </p>
                    </>
                  )}
                </div>

                <div className="space-y-4">
                  {/* E-Transfer Section */}
                  {hasEtransfer && (
                    <div className="p-4 rounded-lg bg-background border">
                      <p className="font-medium mb-3 flex items-center gap-2">
                        <Banknote className="h-4 w-4" />
                        E-Transfer Details
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-muted-foreground">Send to:</span>
                          <CopyableField 
                            label="" 
                            value={business.etransferEmail!} 
                          />
                        </div>
                        <CopyableField 
                          label="Amount" 
                          value={formatCurrency(isPartiallyPaid ? remainingBalance : parseFloat(invoice.total))} 
                        />
                        <CopyableField 
                          label="Reference" 
                          value={`INV-${invoice.invoiceNumber}`} 
                          mono 
                        />
                        {business.etransferInstructions && (
                          <p className="text-muted-foreground mt-2 pt-2 border-t">
                            {business.etransferInstructions}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Credit Card Section */}
                  {hasStripe && (
                    <div className="p-4 rounded-lg bg-background border">
                      <p className="font-medium mb-3 flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Credit Card
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Pay securely with your credit or debit card via Stripe.
                      </p>
                      <Button 
                        size="lg" 
                        className="w-full hover:opacity-90" 
                        style={{ 
                          backgroundColor: brandColor,
                          color: brandTextColor
                        }}
                        asChild 
                        data-testid="button-pay-stripe"
                      >
                        <a href={stripePaymentLink!}>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Pay by Credit Card
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {isPaid && (
            <Card className="border-[#2CA01C]/20 bg-[#2CA01C]/5">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-[#2CA01C]/20">
                    <CheckCircle2 className="h-6 w-6 text-[#2CA01C]" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg text-[#2CA01C]">
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
                  {business.logoUrl && (
                    <img 
                      src={business.logoUrl} 
                      alt={business.businessName} 
                      className="h-[22px] w-auto object-contain mb-4 max-w-[140px] md:max-w-[210px] md:h-8"
                    />
                  )}
                  <h2 className="text-2xl font-bold font-heading mb-1" data-testid="text-business-name">
                    {business.businessName}
                  </h2>
                  {business.email && <p className="text-muted-foreground text-sm">{business.email}</p>}
                  {business.phone && <p className="text-muted-foreground text-sm">{business.phone}</p>}
                  {business.address && <p className="text-muted-foreground text-sm whitespace-pre-line">{business.address}</p>}
                  {business.taxNumber && <p className="text-muted-foreground text-sm mt-2">Tax #: {business.taxNumber}</p>}
                </div>
                <div className="text-left md:text-right">
                  <p 
                    className="text-3xl font-bold mb-2"
                    style={{ color: brandColor }}
                  >
                    INVOICE
                  </p>
                  <p className="text-muted-foreground" data-testid="text-invoice-number">
                    #{invoice.invoiceNumber}
                  </p>
                </div>
              </div>

              {/* Bill To & Dates */}
              <div className="grid md:grid-cols-2 gap-8 mb-12">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Bill To</p>
                  {client ? (
                    <>
                      {client.companyName && (
                        <p className="font-semibold" data-testid="text-client-company">
                          {client.companyName}
                        </p>
                      )}
                      <p className={client.companyName ? "text-muted-foreground text-sm" : "font-semibold"} data-testid="text-client-name">
                        {client.name}
                      </p>
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
                    <p className="font-medium" data-testid="text-issue-date">{formatDate(invoice.issueDate)}</p>
                    <p className="text-muted-foreground">Due Date:</p>
                    <p className="font-medium" data-testid="text-due-date">{formatDate(invoice.dueDate)}</p>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="mb-8">
                {/* Desktop header - hidden on mobile */}
                <div 
                  className="hidden md:grid grid-cols-12 gap-4 py-3 border-b-2 text-xs font-semibold uppercase tracking-wider"
                  style={{ borderColor: brandColor, color: brandColor }}
                >
                  <div className="col-span-6">Description</div>
                  <div className="col-span-2 text-right">Qty</div>
                  <div className="col-span-2 text-right">Rate</div>
                  <div className="col-span-2 text-right">Amount</div>
                </div>
                
                {/* Mobile header */}
                <div 
                  className="md:hidden py-3 border-b-2 text-xs font-semibold uppercase tracking-wider"
                  style={{ borderColor: brandColor, color: brandColor }}
                >
                  Items
                </div>
                
                {invoice.items.map((item, index) => (
                  <>
                    {/* Desktop row */}
                    <div key={`desktop-${item.id}`} className="hidden md:grid grid-cols-12 gap-4 py-4 border-b border-muted" data-testid={`row-item-${index}`}>
                      <div className="col-span-6">{item.description}</div>
                      <div className="col-span-2 text-right text-muted-foreground">{item.quantity}</div>
                      <div className="col-span-2 text-right text-muted-foreground">{formatCurrency(item.rate)}</div>
                      <div className="col-span-2 text-right font-medium">{formatCurrency(item.lineTotal)}</div>
                    </div>
                    
                    {/* Mobile row - stacked layout */}
                    <div key={`mobile-${item.id}`} className="md:hidden py-4 border-b border-muted space-y-2" data-testid={`row-item-mobile-${index}`}>
                      <div className="font-medium">{item.description}</div>
                      <div className="flex justify-between text-sm">
                        <div className="flex gap-4">
                          <span className="text-muted-foreground">
                            <span className="text-xs uppercase tracking-wider">Qty:</span> {item.quantity}
                          </span>
                          <span className="text-muted-foreground">
                            <span className="text-xs uppercase tracking-wider">Rate:</span> {formatCurrency(item.rate)}
                          </span>
                        </div>
                        <span className="font-medium">{formatCurrency(item.lineTotal)}</span>
                      </div>
                    </div>
                  </>
                ))}
              </div>

              {/* Totals with Tax Line */}
              <div className="flex justify-end mb-8">
                <div className="w-full max-w-xs space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span data-testid="text-subtotal">{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span data-testid="text-tax">{formatCurrency(invoice.taxAmount)}</span>
                  </div>
                  {parseFloat(invoice.discountAmount || "0") > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Discount {invoice.discountType === "percent" 
                          ? `(${parseFloat(invoice.discountValue || "0")}%)` 
                          : ""}
                      </span>
                      <span className="text-[#2CA01C]" data-testid="text-discount">-{formatCurrency(invoice.discountAmount)}</span>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between text-xl font-bold">
                    <span>Total</span>
                    <span style={{ color: brandColor }} data-testid="text-total">{formatCurrency(invoice.total)}</span>
                  </div>
                  {/* Show payment status for partially paid invoices */}
                  {amountPaid > 0 && (
                    <>
                      <div className="flex justify-between text-sm text-[#2CA01C]">
                        <span>Amount Paid</span>
                        <span>-{formatCurrency(amountPaid)}</span>
                      </div>
                      {!isPaid && (
                        <div className="flex justify-between text-lg font-bold">
                          <span>Balance Due</span>
                          <span className="text-amber-600">{formatCurrency(remainingBalance)}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Notes */}
              {invoice.notes && (
                <div className="pt-8 border-t">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line" data-testid="text-notes">
                    {invoice.notes}
                  </p>
                </div>
              )}

              {/* Paid Stamp */}
              {isPaid && (
                <div className="mt-8 flex justify-center">
                  <div 
                    className="border-4 font-bold text-2xl px-8 py-2 rounded-md rotate-[-5deg] opacity-80"
                    style={{ borderColor: brandColor, color: brandColor }}
                  >
                    PAID
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sent by Ollie Invoice */}
          {import.meta.env.VITE_OLLIE_INVOICE_LOGO_URL && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <span>Sent by</span>
              <a href="https://ollieinvoice.com" target="_blank" rel="noopener noreferrer">
                <img 
                  src={import.meta.env.VITE_OLLIE_INVOICE_LOGO_URL} 
                  alt="Ollie Invoice" 
                  className="h-4 w-auto object-contain"
                  onError={(e) => {
                    // Hide the entire footer if logo fails to load
                    e.currentTarget.parentElement?.parentElement?.remove();
                  }}
                />
              </a>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
