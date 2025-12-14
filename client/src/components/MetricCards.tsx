import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, FileText, Repeat, TrendingUp, AlertCircle } from 'lucide-react';

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
  if (label.includes('Recurring')) return <Repeat className="w-5 h-5" />;
  if (label.includes('Revenue') || label.includes('Month')) return <TrendingUp className="w-5 h-5" />;
  if (label.includes('Total Invoices')) return <FileText className="w-5 h-5" />;
  if (label.includes('Overdue')) return <AlertCircle className="w-5 h-5" />;
  return <DollarSign className="w-5 h-5" />;
};

export const MetricCards: React.FC<MetricCardsProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {metrics.map((metric, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {metric.label}
              </span>
              <div className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg flex-shrink-0">
                {getIcon(metric.label)}
              </div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {metric.value}
              </div>
              {(metric.trend || metric.trendLabel) && (
                <div className="flex items-center gap-2 mt-2">
                  {metric.trend && (
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                      metric.positive 
                        ? 'text-[#2CA01C] bg-[#2CA01C]/10' 
                        : metric.label.includes('Overdue')
                        ? 'text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-400'
                        : 'text-slate-600 bg-slate-50 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {metric.trend}
                    </span>
                  )}
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

