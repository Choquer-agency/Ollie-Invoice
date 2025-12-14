import React from 'react';

export interface ClientRevenue {
  id: string;
  name: string;
  invoiceCount: number;
  revenue: number;
}

interface ClientListProps {
  clients: ClientRevenue[];
}

export const ClientList: React.FC<ClientListProps> = ({ clients }) => {
  // Find max revenue for progress bar calculation
  const maxRevenue = Math.max(...clients.map(c => c.revenue), 1); // Use 1 as minimum to avoid division by zero
  
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-12 text-xs font-semibold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="col-span-6">Client</div>
        <div className="col-span-3 text-right">Invoices</div>
        <div className="col-span-3 text-right">Revenue</div>
      </div>
      <div className="space-y-6">
        {clients.map((client, index) => (
          <div key={client.id} className="group relative">
            <div className="grid grid-cols-12 items-center z-10 relative">
              <div className="col-span-6 flex items-center gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold">
                  {index + 1}
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {client.name}
                </span>
              </div>
              <div className="col-span-3 text-right text-sm text-slate-500 dark:text-slate-400">
                {client.invoiceCount}
              </div>
              <div className="col-span-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">
                ${client.revenue.toLocaleString()}
              </div>
            </div>
            
            {/* Subtle Progress Bar Background */}
            <div className="absolute bottom-[-8px] left-0 h-1 rounded-full bg-slate-50 dark:bg-slate-900 w-full overflow-hidden">
              <div 
                className="h-full bg-[#2CA01C]/20 rounded-full transition-all duration-500" 
                style={{ width: `${(client.revenue / maxRevenue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

