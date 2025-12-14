import React from 'react';

export interface RevenueDataPoint {
  month: string;
  paid: number;
  unpaid: number;
}

interface RevenueChartProps {
  data: RevenueDataPoint[];
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
  // Calculate max value for scaling - add 10% padding above highest value
  const dataMax = Math.max(...data.map(d => d.paid + d.unpaid), 1);
  const maxValue = dataMax * 1.1; // 10% above the highest data point
  
  return (
    <div className="w-full h-[300px] flex items-end gap-2 px-4 pb-4">
      {data.map((point, index) => {
        const totalHeight = ((point.paid + point.unpaid) / maxValue) * 100;
        const paidHeight = (point.paid / maxValue) * 100;
        const unpaidHeight = (point.unpaid / maxValue) * 100;
        
        return (
          <div key={index} className="flex-1 flex flex-col items-center gap-2">
            {/* Bar */}
            <div 
              className="w-full relative rounded-t-md overflow-hidden bg-slate-100 dark:bg-slate-800"
              style={{ height: `${totalHeight}%`, minHeight: '4px' }}
            >
              {/* Paid portion */}
              {point.paid > 0 && (
                <div 
                  className="absolute bottom-0 w-full bg-[#2CA01C] rounded-t-md transition-all duration-300 hover:brightness-110"
                  style={{ height: `${(paidHeight / totalHeight) * 100}%` }}
                  title={`Paid: $${point.paid.toLocaleString()}`}
                />
              )}
              {/* Unpaid portion */}
              {point.unpaid > 0 && (
                <div 
                  className="absolute top-0 w-full bg-amber-400 dark:bg-amber-500 transition-all duration-300 hover:brightness-110"
                  style={{ height: `${(unpaidHeight / totalHeight) * 100}%` }}
                  title={`Unpaid: $${point.unpaid.toLocaleString()}`}
                />
              )}
            </div>
            
            {/* Label */}
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              {point.month}
            </span>
          </div>
        );
      })}
    </div>
  );
};

