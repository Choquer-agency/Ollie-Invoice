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
    <div className="w-full h-[300px] relative">
      <div className="absolute inset-0 flex items-end gap-2 px-4 pb-4">
        {data.map((point, index) => {
          const total = point.paid + point.unpaid;
          const paidPercentage = total > 0 ? (point.paid / total) * 100 : 0;
          const unpaidPercentage = total > 0 ? (point.unpaid / total) * 100 : 0;
          
          // Calculate height as percentage of container (with max scaling)
          const barHeight = (total / maxValue) * 100;
          
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              {/* Bar */}
              <div 
                className="w-full relative rounded-t-md overflow-hidden bg-slate-100 dark:bg-slate-800 transition-all duration-300"
                style={{ 
                  height: `${barHeight}%`,
                  minHeight: total > 0 ? '8px' : '2px'
                }}
              >
                {/* Paid portion (bottom) */}
                {point.paid > 0 && (
                  <div 
                    className="absolute bottom-0 w-full bg-[#2CA01C] transition-all duration-300 hover:brightness-110 cursor-pointer"
                    style={{ height: `${paidPercentage}%` }}
                    title={`Paid: $${point.paid.toLocaleString()}`}
                  />
                )}
                {/* Unpaid portion (top) */}
                {point.unpaid > 0 && (
                  <div 
                    className="absolute top-0 w-full bg-amber-400 dark:bg-amber-500 transition-all duration-300 hover:brightness-110 cursor-pointer"
                    style={{ height: `${unpaidPercentage}%` }}
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
    </div>
  );
};

