import { useState, useRef } from "react";
import { useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { ReceivePaymentModal } from "./ReceivePaymentModal";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { MoreHorizontal, Eye, Send, Trash2, DollarSign, RefreshCw, Pencil, CalendarClock, ChevronRight } from "lucide-react";
import type { InvoiceWithRelations } from "@shared/schema";

interface InvoiceTableProps {
  invoices: InvoiceWithRelations[];
  onSend?: (id: string) => void;
  onResend?: (id: string) => void;
  onDelete?: (id: string) => void;
  isLoading?: boolean;
  isRecurringView?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
}

// Helper to format recurring frequency
function formatRecurringFrequency(invoice: InvoiceWithRelations): string {
  if (!invoice.isRecurring || !invoice.recurringFrequency) return "-";
  
  const every = invoice.recurringEvery || 1;
  const freq = invoice.recurringFrequency;
  
  if (every === 1) {
    switch (freq) {
      case "daily": return "Daily";
      case "weekly": return "Weekly";
      case "monthly": return "Monthly";
      case "yearly": return "Yearly";
      default: return freq;
    }
  }
  
  switch (freq) {
    case "daily": return `Every ${every} days`;
    case "weekly": return `Every ${every} weeks`;
    case "monthly": return `Every ${every} months`;
    case "yearly": return `Every ${every} years`;
    default: return `Every ${every} ${freq}`;
  }
}

// Mobile card component for invoice rows
function MobileInvoiceCard({ 
  invoice, 
  onClick,
  isRecurring = false,
}: { 
  invoice: InvoiceWithRelations; 
  onClick: () => void;
  isRecurring?: boolean;
}) {
  // Track touch to distinguish scroll from tap
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    
    const touch = e.changedTouches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    const deltaTime = Date.now() - touchStartRef.current.time;
    
    // Only trigger click if it's a quick tap with minimal movement
    if (deltaX < 10 && deltaY < 10 && deltaTime < 300) {
      onClick();
    }
    
    touchStartRef.current = null;
  };

  return (
    <div
      className="p-4 border-b last:border-b-0 active:bg-muted/50 transition-colors cursor-pointer"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={(e) => {
        // For non-touch devices
        if (!('ontouchstart' in window)) {
          onClick();
        }
      }}
      data-testid={`row-invoice-${invoice.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">#{invoice.invoiceNumber}</span>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <div className="text-sm text-muted-foreground truncate">
            {invoice.client?.name || "No client"}
          </div>
          {isRecurring && (
            <div className="text-xs text-muted-foreground mt-1">
              {formatRecurringFrequency(invoice)}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="font-semibold">{formatCurrency(invoice.total)}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {isRecurring 
              ? (invoice.nextRecurringDate ? `Next: ${formatDate(invoice.nextRecurringDate)}` : "Not scheduled")
              : `Due ${formatDate(invoice.dueDate)}`
            }
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 self-center" />
      </div>
    </div>
  );
}

export function InvoiceTable({ 
  invoices, 
  onSend, 
  onResend, 
  onDelete, 
  isLoading, 
  isRecurringView,
  selectedIds = new Set(),
  onSelectionChange,
}: InvoiceTableProps) {
  const [, navigate] = useLocation();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithRelations | null>(null);

  const handleReceivePayment = (invoice: InvoiceWithRelations) => {
    setSelectedInvoice(invoice);
    setPaymentModalOpen(true);
  };

  const handleNavigate = (invoiceId: string) => {
    navigate(`/invoices/${invoiceId}`);
  };

  const handleToggleAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange(new Set(invoices.map(inv => inv.id)));
    } else {
      onSelectionChange(new Set());
    }
  };

  const handleToggleOne = (invoiceId: string, checked: boolean) => {
    if (!onSelectionChange) return;
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(invoiceId);
    } else {
      newSelected.delete(invoiceId);
    }
    onSelectionChange(newSelected);
  };

  const allSelected = invoices.length > 0 && selectedIds.size === invoices.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < invoices.length;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  // Render recurring templates view
  if (isRecurringView) {
    return (
      <>
        {/* Mobile card layout */}
        <div className="md:hidden rounded-lg border bg-background overflow-hidden">
          {invoices.map((invoice) => (
            <MobileInvoiceCard
              key={invoice.id}
              invoice={invoice}
              onClick={() => handleNavigate(invoice.id)}
              isRecurring
            />
          ))}
        </div>

        {/* Desktop table layout */}
        <div className="hidden md:block rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Template</TableHead>
                <TableHead className="font-semibold">Client</TableHead>
                <TableHead className="font-semibold hidden lg:table-cell">Frequency</TableHead>
                <TableHead className="font-semibold hidden lg:table-cell">Next Invoice</TableHead>
                <TableHead className="font-semibold">Amount</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow 
                  key={invoice.id} 
                  className="hover-elevate cursor-pointer"
                  onClick={() => handleNavigate(invoice.id)}
                  data-testid={`row-invoice-${invoice.id}`}
                >
                  <TableCell className="font-medium">
                    #{invoice.invoiceNumber}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {invoice.client?.name || "No client"}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden lg:table-cell">
                    {formatRecurringFrequency(invoice)}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden lg:table-cell">
                    {invoice.nextRecurringDate ? formatDate(invoice.nextRecurringDate) : "Not scheduled"}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(invoice.total)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" data-testid={`button-invoice-menu-${invoice.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/invoices/${invoice.id}`); }}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Template
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/invoices/${invoice.id}/edit`); }}>
                          <CalendarClock className="h-4 w-4 mr-2" />
                          Edit Recurring
                        </DropdownMenuItem>
                        {onDelete && (
                          <DropdownMenuItem 
                            onClick={(e) => { e.stopPropagation(); onDelete(invoice.id); }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </>
    );
  }

  // Render standard invoices view
  return (
    <>
      {/* Mobile card layout */}
      <div className="md:hidden rounded-lg border bg-background overflow-hidden">
        {invoices.map((invoice) => (
          <MobileInvoiceCard
            key={invoice.id}
            invoice={invoice}
            onClick={() => handleNavigate(invoice.id)}
          />
        ))}
      </div>

      {/* Desktop table layout */}
      <div className="hidden md:block rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {onSelectionChange && selectedIds.size > 0 ? (
                // Bulk Actions Header (replaces column headers when items selected)
                <>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(checked) => handleToggleAll(checked === true)}
                      aria-label="Deselect all invoices"
                    />
                  </TableHead>
                  <TableHead colSpan={6}>
                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        onClick={() => {
                          // We'll wire this up in next step
                          console.log('Send Reminder to:', Array.from(selectedIds));
                        }}
                        variant="outline"
                        className="h-8 border-foreground/20"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Send Reminder
                      </Button>
                      <span className="text-sm font-medium text-muted-foreground">
                        {selectedIds.size} selected
                      </span>
                    </div>
                  </TableHead>
                </>
              ) : (
                // Normal Column Headers
                <>
                  {onSelectionChange && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={(checked) => handleToggleAll(checked === true)}
                        aria-label="Select all invoices"
                      />
                    </TableHead>
                  )}
                  <TableHead className="font-semibold">Invoice</TableHead>
                  <TableHead className="font-semibold">Client</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Date</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Due</TableHead>
                  <TableHead className="font-semibold">Amount</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice, index) => (
              <TableRow 
                key={invoice.id} 
                className={`hover-elevate cursor-pointer ${selectedIds.has(invoice.id) ? 'bg-muted/50' : ''}`}
                onClick={() => handleNavigate(invoice.id)}
                data-testid={`row-invoice-${invoice.id}`}
              >
                {onSelectionChange && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(invoice.id)}
                      onCheckedChange={(checked) => handleToggleOne(invoice.id, checked === true)}
                      aria-label={`Select invoice ${invoice.invoiceNumber}`}
                    />
                  </TableCell>
                )}
                <TableCell className="font-medium">
                  #{invoice.invoiceNumber}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {invoice.client?.name || "No client"}
                </TableCell>
                <TableCell className="text-muted-foreground hidden lg:table-cell">
                  {formatDate(invoice.issueDate)}
                </TableCell>
                <TableCell className="text-muted-foreground hidden lg:table-cell">
                  {formatDate(invoice.dueDate)}
                </TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(invoice.total)}
                </TableCell>
                <TableCell>
                  <InvoiceStatusBadge status={invoice.status} />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" data-testid={`button-invoice-menu-${invoice.id}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/invoices/${invoice.id}`); }}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      {invoice.status === "draft" && (
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/invoices/${invoice.id}/edit`); }}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {invoice.status === "draft" && onSend && (
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSend(invoice.id); }}>
                          <Send className="h-4 w-4 mr-2" />
                          Send
                        </DropdownMenuItem>
                      )}
                      {(invoice.status === "sent" || invoice.status === "overdue") && onResend && (
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onResend(invoice.id); }} data-testid={`button-resend-invoice-${invoice.id}`}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Resend Invoice
                        </DropdownMenuItem>
                      )}
                      {invoice.status !== "paid" && (
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleReceivePayment(invoice); }}>
                          <DollarSign className="h-4 w-4 mr-2" />
                          Receive Payment
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); onDelete(invoice.id); }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ReceivePaymentModal
        invoice={selectedInvoice}
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
      />
    </>
  );
}
