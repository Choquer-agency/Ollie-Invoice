import { Badge } from "@/components/ui/badge";
import { getStatusColor } from "@/lib/formatters";

interface InvoiceStatusBadgeProps {
  status: string;
}

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  const statusLabels: Record<string, string> = {
    draft: "Draft",
    sent: "Sent",
    paid: "Paid",
    overdue: "Overdue",
  };

  return (
    <Badge 
      variant="secondary" 
      className={`${getStatusColor(status)} font-medium text-xs`}
      data-testid={`badge-status-${status}`}
    >
      {statusLabels[status] || status}
    </Badge>
  );
}
