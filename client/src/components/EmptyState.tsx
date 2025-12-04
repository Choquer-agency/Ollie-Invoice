import { FileText, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  type: "invoices" | "clients";
  onAction?: () => void;
}

export function EmptyState({ type, onAction }: EmptyStateProps) {
  const content = {
    invoices: {
      icon: FileText,
      title: "No invoices yet",
      description: "Create your first invoice and start getting paid faster.",
      actionLabel: "Create Invoice",
    },
    clients: {
      icon: Users,
      title: "No clients yet",
      description: "Add your first client to start sending invoices.",
      actionLabel: "Add Client",
    },
  };

  const { icon: Icon, title, description, actionLabel } = content[type];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center" data-testid={`empty-state-${type}`}>
      <div className="p-4 rounded-full bg-muted mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm mb-6 max-w-sm">{description}</p>
      {onAction && (
        <Button onClick={onAction} data-testid={`button-${type}-empty-action`}>
          <Plus className="h-4 w-4 mr-2" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
