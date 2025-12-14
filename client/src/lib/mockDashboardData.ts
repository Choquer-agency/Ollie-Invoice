// Example data structure for testing the new dashboard components
// You can use this in your development console to preview the components

export const MOCK_DASHBOARD_DATA = {
  // Aging buckets - showing outstanding invoices by age
  agingData: [
    {
      range: '0-30 Days',
      amount: 12500,
      count: 8,
      status: 'current' as const,
    },
    {
      range: '31-60 Days',
      amount: 5200,
      count: 3,
      status: 'warning' as const,
    },
    {
      range: '61-90 Days',
      amount: 2100,
      count: 2,
      status: 'danger' as const,
    },
    {
      range: '90+ Days',
      amount: 800,
      count: 1,
      status: 'critical' as const,
    },
  ],

  // Top clients by revenue
  topClients: [
    {
      id: '1',
      name: 'Acme Corporation',
      invoiceCount: 24,
      revenue: 48500,
    },
    {
      id: '2',
      name: 'TechStart Inc',
      invoiceCount: 18,
      revenue: 36200,
    },
    {
      id: '3',
      name: 'Global Solutions Ltd',
      invoiceCount: 15,
      revenue: 28900,
    },
    {
      id: '4',
      name: 'Bright Ideas Co',
      invoiceCount: 12,
      revenue: 22100,
    },
    {
      id: '5',
      name: 'Metro Services',
      invoiceCount: 10,
      revenue: 18500,
    },
  ],

  // Monthly revenue data (last 12 months)
  revenueChart: [
    { month: 'Jan', paid: 15200, unpaid: 3500 },
    { month: 'Feb', paid: 18500, unpaid: 2800 },
    { month: 'Mar', paid: 22100, unpaid: 4200 },
    { month: 'Apr', paid: 19800, unpaid: 5100 },
    { month: 'May', paid: 25400, unpaid: 3200 },
    { month: 'Jun', paid: 28900, unpaid: 4800 },
    { month: 'Jul', paid: 31200, unpaid: 2500 },
    { month: 'Aug', paid: 27600, unpaid: 6200 },
    { month: 'Sep', paid: 24500, unpaid: 4900 },
    { month: 'Oct', paid: 29800, unpaid: 3600 },
    { month: 'Nov', paid: 33500, unpaid: 5400 },
    { month: 'Dec', paid: 36200, unpaid: 7100 },
  ],

  // Key business metrics
  keyMetrics: [
    {
      label: 'Avg Days to Payment',
      value: '14 days',
      trend: '↓ 12%',
      trendLabel: 'vs last month',
      positive: true,
    },
    {
      label: 'Revenue This Month',
      value: '$36,200',
      trend: '+18%',
      trendLabel: 'vs last month',
      positive: true,
    },
    {
      label: 'Total Invoices',
      value: '127',
      trend: '89 paid',
      trendLabel: '',
      positive: true,
    },
    {
      label: 'Recurring Invoices',
      value: '12',
      trend: '+2',
      trendLabel: 'this month',
      positive: true,
    },
  ],
};

