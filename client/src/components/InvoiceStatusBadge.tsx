import { Badge } from "@/components/ui/badge";
import { getStatusColor } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface InvoiceStatusBadgeProps {
  status: string;
  className?: string;
}

export function InvoiceStatusBadge({ status, className }: InvoiceStatusBadgeProps) {
  const statusLabels: Record<string, string> = {
    draft: "Draft",
    sent: "Sent",
    paid: "Paid",
    partially_paid: "Partially Paid",
    overdue: "Overdue",
  };

  return (
    <Badge 
      variant="secondary" 
      className={cn(getStatusColor(status), "font-medium text-xs", className)}
      data-testid={`badge-status-${status}`}
    >
      {statusLabels[status] || status}
    </Badge>
  );
}
