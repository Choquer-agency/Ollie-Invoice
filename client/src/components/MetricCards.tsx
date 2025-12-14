import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Timer, Banknote, Repeat, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

export interface KeyMetric {
  label: string;
  value: string;
  trend?: string;
  trendLabel?: string;
  positive?: boolean;
}

interface MetricCardsProps {
  metrics: KeyMetric[];
}

const getIcon = (label: string) => {
  if (label.includes('Days')) return <Timer size={18} />;
  if (label.includes('Recurring')) return <Repeat size={18} />;
  if (label.includes('Revenue') || label.includes('Month')) return <TrendingUp size={18} />;
  return <Banknote size={18} />;
};

export const MetricCards: React.FC<MetricCardsProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {metric.label}
              </span>
              <div className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg">
                {getIcon(metric.label)}
              </div>
            </div>
            
            <div className="mt-4">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {metric.value}
              </div>
              {metric.trend && (
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                    metric.positive 
                      ? 'text-[#2CA01C] bg-[#2CA01C]/10' 
                      : 'text-rose-700 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400'
                  }`}>
                    {metric.trend}
                  </span>
                  {metric.trendLabel && (
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {metric.trendLabel}
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

