import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { TrendingUp, TrendingDown, Clock, CheckCircle2, AlertCircle } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number;
  currency?: string;
  type: "paid" | "unpaid" | "overdue";
}

export function StatCard({ title, value, currency = "USD", type }: StatCardProps) {
  const getIcon = () => {
    switch (type) {
      case "paid":
        return <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />;
      case "unpaid":
        return <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      case "overdue":
        return <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
    }
  };

  const getValueColor = () => {
    switch (type) {
      case "paid":
        return "text-emerald-600 dark:text-emerald-400";
      case "unpaid":
        return "text-blue-600 dark:text-blue-400";
      case "overdue":
        return "text-red-600 dark:text-red-400";
    }
  };

  return (
    <Card data-testid={`stat-card-${type}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground whitespace-nowrap">{title}</p>
            <p className={`text-2xl font-bold tracking-tight ${getValueColor()}`}>
              {formatCurrency(value, currency)}
            </p>
          </div>
          <div className="p-3 rounded-full bg-muted/50 flex-shrink-0">
            {getIcon()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
