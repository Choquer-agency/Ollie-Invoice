import React, { useState } from 'react';

export interface RevenueDataPoint {
  month: string;
  paid: number;
  unpaid: number;
}

interface RevenueChartProps {
  data: RevenueDataPoint[];
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  // Calculate max value for scaling - add 10% padding above highest value
  const dataMax = Math.max(...data.map(d => d.paid + d.unpaid), 1);
  const maxValue = dataMax * 1.1; // 10% above the highest data point
  
  const handleMouseEnter = (index: number, event: React.MouseEvent) => {
    setHoveredBar(index);
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
  };

  const handleMouseLeave = () => {
    setHoveredBar(null);
    setTooltipPosition(null);
  };

  return (
    <div className="w-full h-[300px] relative">
      {/* Tooltip */}
      {hoveredBar !== null && tooltipPosition && (
        <div 
          className="fixed z-50 bg-slate-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg pointer-events-none"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="font-semibold mb-1">{data[hoveredBar].month}</div>
          <div className="flex items-center gap-2 text-[#2CA01C]">
            <div className="w-2 h-2 rounded-sm bg-[#2CA01C]"></div>
            <span>Paid: ${data[hoveredBar].paid.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 text-amber-400">
            <div className="w-2 h-2 rounded-sm bg-amber-400"></div>
            <span>Unpaid: ${data[hoveredBar].unpaid.toLocaleString()}</span>
          </div>
          <div className="mt-1 pt-1 border-t border-slate-700 font-semibold">
            Total: ${(data[hoveredBar].paid + data[hoveredBar].unpaid).toLocaleString()}
          </div>
        </div>
      )}

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
                className="w-full relative rounded-t-md overflow-hidden bg-slate-100 dark:bg-slate-800 transition-all duration-300 cursor-pointer"
                style={{ 
                  height: `${barHeight}%`,
                  minHeight: total > 0 ? '8px' : '2px'
                }}
                onMouseEnter={(e) => handleMouseEnter(index, e)}
                onMouseLeave={handleMouseLeave}
              >
                {/* Paid portion (bottom) */}
                {point.paid > 0 && (
                  <div 
                    className="absolute bottom-0 w-full bg-[#2CA01C] transition-all duration-300 hover:brightness-110"
                    style={{ height: `${paidPercentage}%` }}
                  />
                )}
                {/* Unpaid portion (top) */}
                {point.unpaid > 0 && (
                  <div 
                    className="absolute top-0 w-full bg-amber-400 dark:bg-amber-500 transition-all duration-300 hover:brightness-110"
                    style={{ height: `${unpaidPercentage}%` }}
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

