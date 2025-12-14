import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Send, RefreshCw, FileDown, X } from "lucide-react";
import type { InvoiceWithRelations } from "@shared/schema";

interface BulkActionBarProps {
  selectedInvoices: InvoiceWithRelations[];
  onSendDrafts: () => void;
  onSendReminders: () => void;
  onExportPDF: () => void;
  onClearSelection: () => void;
  isLoading?: boolean;
}

export function BulkActionBar({
  selectedInvoices,
  onSendDrafts,
  onSendReminders,
  onExportPDF,
  onClearSelection,
  isLoading = false,
}: BulkActionBarProps) {
  const draftCount = selectedInvoices.filter(inv => inv.status === 'draft').length;
  const overdueCount = selectedInvoices.filter(inv => inv.status === 'overdue').length;
  const selectedCount = selectedInvoices.length;

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 duration-300">
      <Card className="shadow-lg border-2 px-6 py-4">
        <div className="flex items-center gap-6">
          {/* Selection count */}
          <div className="text-sm font-medium">
            {selectedCount} {selectedCount === 1 ? 'invoice' : 'invoices'} selected
          </div>

          <div className="h-6 w-px bg-border" />

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {draftCount > 0 && (
              <Button
                size="sm"
                onClick={onSendDrafts}
                disabled={isLoading}
                className="bg-[#2CA01C] hover:bg-[#2CA01C]/90"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Drafts ({draftCount})
              </Button>
            )}

            {overdueCount > 0 && (
              <Button
                size="sm"
                onClick={onSendReminders}
                disabled={isLoading}
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Send Reminders ({overdueCount})
              </Button>
            )}

            <Button
              size="sm"
              onClick={onExportPDF}
              disabled={isLoading}
              variant="outline"
            >
              <FileDown className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>

          <div className="h-6 w-px bg-border" />

          {/* Clear selection */}
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearSelection}
            disabled={isLoading}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Clear selection</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}

