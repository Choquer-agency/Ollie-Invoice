import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/formatters";
import { DollarSign, Loader2 } from "lucide-react";
import type { InvoiceWithRelations } from "@shared/schema";
import { trackPaymentReceived } from "@/lib/analytics";

interface ReceivePaymentModalProps {
  invoice: InvoiceWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReceivePaymentModal({ invoice, open, onOpenChange }: ReceivePaymentModalProps) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  // Calculate totals
  const total = invoice ? parseFloat(invoice.total as string) || 0 : 0;
  const amountPaid = invoice ? parseFloat(invoice.amountPaid as string) || 0 : 0;
  const remainingBalance = total - amountPaid;

  // Reset form when modal opens
  useEffect(() => {
    if (open && invoice) {
      setAmount(remainingBalance.toFixed(2));
      setNotes("");
      setError("");
    }
  }, [open, invoice, remainingBalance]);

  const recordPaymentMutation = useMutation({
    mutationFn: async ({ invoiceId, amount, notes }: { invoiceId: string; amount: string; notes?: string }) => {
      const response = await apiRequest("POST", `/api/invoices/${invoiceId}/payments`, {
        amount: parseFloat(amount),
        paymentMethod: "manual",
        notes,
      });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoice?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      // Track payment received
      if (invoice) {
        trackPaymentReceived({
          amount: parseFloat(variables.amount),
          paymentMethod: 'etransfer', // Manual payments are typically e-transfer
          invoiceNumber: invoice.invoiceNumber,
        });
      }
      
      toast({ title: "Payment recorded successfully" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      const message = error?.message || "Failed to record payment";
      toast({ title: message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const paymentAmount = parseFloat(amount);
    
    // Validate amount
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      setError("Please enter a valid payment amount");
      return;
    }
    
    if (paymentAmount > remainingBalance + 0.01) { // Small tolerance for rounding
      setError(`Amount cannot exceed remaining balance of ${formatCurrency(remainingBalance)}`);
      return;
    }

    if (!invoice) return;

    recordPaymentMutation.mutate({
      invoiceId: invoice.id,
      amount: paymentAmount.toFixed(2),
      notes: notes.trim() || undefined,
    });
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Receive Payment</DialogTitle>
          <DialogDescription>
            Record a payment for Invoice #{invoice.invoiceNumber}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Summary Section */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Invoice Total</span>
              <span className="font-medium">{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount Paid</span>
              <span className="font-medium text-[#2CA01C]">{formatCurrency(amountPaid)}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="font-medium">Remaining Balance</span>
              <span className="font-bold text-lg">{formatCurrency(remainingBalance)}</span>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount Received</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={remainingBalance}
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError("");
                }}
                className="pl-9"
                placeholder="0.00"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          {/* Notes Input */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Cash, E-transfer, Check #123"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={recordPaymentMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={recordPaymentMutation.isPending || !amount}
            >
              {recordPaymentMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Recording...
                </>
              ) : (
                "Confirm Payment"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

