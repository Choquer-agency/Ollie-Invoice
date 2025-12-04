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
import { formatCurrency, formatDate } from "@/lib/formatters";
import { MoreHorizontal, Eye, Send, Download, Trash2, CheckCircle, RefreshCw } from "lucide-react";
import type { InvoiceWithRelations } from "@shared/schema";

interface InvoiceTableProps {
  invoices: InvoiceWithRelations[];
  onSend?: (id: string) => void;
  onResend?: (id: string) => void;
  onMarkPaid?: (id: string) => void;
  onDelete?: (id: string) => void;
  isLoading?: boolean;
}

export function InvoiceTable({ invoices, onSend, onResend, onMarkPaid, onDelete, isLoading }: InvoiceTableProps) {
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
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
                    {invoice.status !== "paid" && onMarkPaid && (
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMarkPaid(invoice.id); }}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark as Paid
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
  );
}
