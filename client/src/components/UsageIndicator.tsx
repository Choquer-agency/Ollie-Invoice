import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { FileText, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface UsageData {
  tier: 'free' | 'pro';
  count: number;
  limit: number;
  canSend: boolean;
  resetDate: string | null;
}

export function UsageIndicator() {
  const { data: usage, isLoading } = useQuery<UsageData>({
    queryKey: ["/api/subscription/usage"],
  });

  // Don't show for pro users or while loading
  if (isLoading || !usage || usage.tier === 'pro') {
    return null;
  }

  const { count, limit, resetDate } = usage;
  const percentage = Math.min((count / limit) * 100, 100);
  const remaining = Math.max(limit - count, 0);
  const isNearLimit = remaining <= 1;
  const isAtLimit = remaining === 0;

  // Calculate days until reset
  let daysUntilReset = 0;
  if (resetDate) {
    const reset = new Date(resetDate);
    const now = new Date();
    daysUntilReset = Math.ceil((reset.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  return (
    <div className={`rounded-xl border p-4 ${isAtLimit ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900' : isNearLimit ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900' : 'bg-card'}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isAtLimit ? 'bg-red-100 dark:bg-red-900/30' : isNearLimit ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-muted'}`}>
            <FileText className={`h-4 w-4 ${isAtLimit ? 'text-red-600 dark:text-red-400' : isNearLimit ? 'text-yellow-600 dark:text-yellow-400' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <p className="text-sm font-medium">Monthly Invoices</p>
            <p className="text-xs text-muted-foreground">
              {daysUntilReset > 0 ? `Resets in ${daysUntilReset} day${daysUntilReset !== 1 ? 's' : ''}` : 'Resets soon'}
            </p>
          </div>
        </div>
        <span className={`text-sm font-semibold ${isAtLimit ? 'text-red-600 dark:text-red-400' : isNearLimit ? 'text-yellow-600 dark:text-yellow-400' : 'text-foreground'}`}>
          {count}/{limit}
        </span>
      </div>
      
      <Progress 
        value={percentage} 
        className={`h-2 ${isAtLimit ? '[&>div]:bg-red-500' : isNearLimit ? '[&>div]:bg-yellow-500' : ''}`}
      />
      
      {isAtLimit ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-red-600 dark:text-red-400 font-medium">
            You've reached your monthly limit
          </p>
          <Button size="sm" className="w-full gap-2" asChild>
            <Link href="/settings?tab=billing">
              <Sparkles className="h-3.5 w-3.5" />
              Upgrade to Pro
            </Link>
          </Button>
        </div>
      ) : isNearLimit ? (
        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
          {remaining} invoice{remaining !== 1 ? 's' : ''} remaining this month
        </p>
      ) : (
        <p className="text-xs text-muted-foreground mt-2">
          {remaining} invoice{remaining !== 1 ? 's' : ''} remaining this month
        </p>
      )}
    </div>
  );
}


