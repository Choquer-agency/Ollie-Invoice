import { useState } from "react";
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
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { ReceivePaymentModal } from "./ReceivePaymentModal";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { MoreHorizontal, Eye, Send, Trash2, DollarSign, RefreshCw, Pencil, CalendarClock } from "lucide-react";
import type { InvoiceWithRelations } from "@shared/schema";

interface InvoiceTableProps {
  invoices: InvoiceWithRelations[];
  onSend?: (id: string) => void;
  onResend?: (id: string) => void;
  onDelete?: (id: string) => void;
  isLoading?: boolean;
  isRecurringView?: boolean;
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

export function InvoiceTable({ invoices, onSend, onResend, onDelete, isLoading, isRecurringView }: InvoiceTableProps) {
  const [, navigate] = useLocation();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithRelations | null>(null);

  const handleReceivePayment = (invoice: InvoiceWithRelations) => {
    setSelectedInvoice(invoice);
    setPaymentModalOpen(true);
  };

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
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Template</TableHead>
              <TableHead className="font-semibold">Client</TableHead>
              <TableHead className="font-semibold">Frequency</TableHead>
              <TableHead className="font-semibold">Next Invoice</TableHead>
              <TableHead className="font-semibold">Amount</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow 
                key={invoice.id} 
                className="hover-elevate cursor-pointer"
                onClick={() => navigate(`/invoices/${invoice.id}`)}
                data-testid={`row-invoice-${invoice.id}`}
              >
                <TableCell className="font-medium">
                  #{invoice.invoiceNumber}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {invoice.client?.name || "No client"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatRecurringFrequency(invoice)}
                </TableCell>
                <TableCell className="text-muted-foreground">
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
    );
  }

  // Render standard invoices view
  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-semibold">Invoice</TableHead>
            <TableHead className="font-semibold">Client</TableHead>
            <TableHead className="font-semibold">Date</TableHead>
            <TableHead className="font-semibold">Due</TableHead>
            <TableHead className="font-semibold">Amount</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow 
              key={invoice.id} 
              className="hover-elevate cursor-pointer"
              onClick={() => navigate(`/invoices/${invoice.id}`)}
              data-testid={`row-invoice-${invoice.id}`}
            >
              <TableCell className="font-medium">
                #{invoice.invoiceNumber}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {invoice.client?.name || "No client"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(invoice.issueDate)}
              </TableCell>
              <TableCell className="text-muted-foreground">
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

      <ReceivePaymentModal
        invoice={selectedInvoice}
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
      />
    </div>
  );
}
