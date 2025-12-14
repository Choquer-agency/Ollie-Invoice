import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

export interface AgingBucket {
  range: string;
  amount: number;
  count: number;
  status: 'current' | 'warning' | 'danger' | 'critical';
}

interface AgingCardsProps {
  data: AgingBucket[];
}

const getStatusColor = (status: AgingBucket['status']) => {
  switch (status) {
    case 'current': return 'text-[#2CA01C] bg-[#2CA01C]/10 border-[#2CA01C]/20';
    case 'warning': return 'text-amber-600 bg-amber-50 border-amber-100';
    case 'danger': return 'text-orange-600 bg-orange-50 border-orange-100';
    case 'critical': return 'text-rose-600 bg-rose-50 border-rose-100';
    default: return 'text-slate-600 bg-slate-50';
  }
};

const getIcon = (status: AgingBucket['status']) => {
  switch (status) {
    case 'current': return <CheckCircle2 size={16} />;
    case 'warning': return <Clock size={16} />;
    default: return <AlertCircle size={16} />;
  }
};

const getTopBarColor = (status: AgingBucket['status']) => {
  switch (status) {
    case 'current': return 'bg-[#2CA01C]';
    case 'warning': return 'bg-amber-500';
    case 'danger': return 'bg-orange-500';
    case 'critical': return 'bg-rose-500';
    default: return 'bg-slate-500';
  }
};

export const AgingCards: React.FC<AgingCardsProps> = ({ data }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {data.map((bucket, index) => (
        <Card key={index} className="overflow-hidden border-t-4 border-t-transparent">
          <div className={`h-1 w-full ${getTopBarColor(bucket.status)}`}></div>
          
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {bucket.range}
              </span>
              <div className={`p-1.5 rounded-full border ${getStatusColor(bucket.status)}`}>
                {getIcon(bucket.status)}
              </div>
            </div>
            
            <div className="mt-2">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(bucket.amount)}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {bucket.count} {bucket.count === 1 ? 'invoice' : 'invoices'}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

