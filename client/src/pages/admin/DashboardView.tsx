import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAdminAuth, adminFetch } from '@/hooks/useAdminAuth';
import AdminLayout from './AdminLayout';
import { Card } from '@/components/admin/Card';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  CreditCard, 
  XCircle,
  Users,
  FileText,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';

const COLORS = ['#2ca01c', '#1d6313', '#d7f8db'];

interface Metrics {
  totalUsers: number;
  totalInvoices: number;
  totalInvoiceVolume: number;
  paidInvoiceVolume: number;
  activeSubscriptions: number;
  mrr: number;
  newUsersThisMonth: number;
  invoicesSentThisMonth: number;
}

interface ChartData {
  name: string;
  value: number;
}

interface Payment {
  id: string;
  amount: number;
  customerEmail: string;
  status: string;
  created: string;
}

export default function DashboardView() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAdminAuth();
  
  const [dateRange, setDateRange] = useState('This Year');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [usersChart, setUsersChart] = useState<ChartData[]>([]);
  const [invoicesChart, setInvoicesChart] = useState<ChartData[]>([]);
  const [volumeChart, setVolumeChart] = useState<ChartData[]>([]);
  const [subscriptionData, setSubscriptionData] = useState<ChartData[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/admin/login');
    }
  }, [isAuthenticated, isLoading, setLocation]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, dateRange, customStart, customEnd]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('range', dateRange);
      if (dateRange === 'Custom' && customStart) params.set('customStart', customStart);
      if (dateRange === 'Custom' && customEnd) params.set('customEnd', customEnd);

      console.log('[Admin] Fetching dashboard data with params:', params.toString());

      const [metricsRes, usersRes, invoicesRes, volumeRes, subsRes, paymentsRes] = await Promise.all([
        adminFetch('/api/admin/metrics'),
        adminFetch(`/api/admin/charts/users?${params.toString()}`),
        adminFetch(`/api/admin/charts/invoices?${params.toString()}`),
        adminFetch(`/api/admin/charts/volume?${params.toString()}`),
        adminFetch('/api/admin/charts/subscriptions'),
        adminFetch('/api/admin/payments?limit=5'),
      ]);

      console.log('[Admin] Response statuses:', {
        metrics: metricsRes.status,
        users: usersRes.status,
        invoices: invoicesRes.status,
        volume: volumeRes.status,
        subs: subsRes.status,
        payments: paymentsRes.status,
      });

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        console.log('[Admin] Metrics:', data);
        setMetrics(data);
      }
      if (usersRes.ok) {
        const data = await usersRes.json();
        console.log('[Admin] Users chart:', data);
        setUsersChart(data);
      }
      if (invoicesRes.ok) {
        const data = await invoicesRes.json();
        console.log('[Admin] Invoices chart:', data);
        setInvoicesChart(data);
      }
      if (volumeRes.ok) {
        const data = await volumeRes.json();
        console.log('[Admin] Volume chart:', data);
        setVolumeChart(data);
      }
      if (subsRes.ok) {
        const data = await subsRes.json();
        console.log('[Admin] Subscriptions:', data);
        setSubscriptionData(data);
      }
      if (paymentsRes.ok) {
        const data = await paymentsRes.json();
        console.log('[Admin] Payments:', data);
        setPayments(data);
      }
    } catch (error) {
      console.error('[Admin] Error fetching dashboard data:', error);
    }
    setLoading(false);
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2CA01C]" />
      </div>
    );
  }

  const kpiMetrics = metrics ? [
    { 
      label: 'Total Users', 
      value: metrics.totalUsers.toLocaleString(), 
      helperText: metrics.newUsersThisMonth > 0 ? `+${metrics.newUsersThisMonth} this month` : 'All time'
    },
    { 
      label: 'Total Invoices', 
      value: metrics.totalInvoices.toLocaleString(), 
      helperText: metrics.invoicesSentThisMonth > 0 ? `+${metrics.invoicesSentThisMonth} this month` : 'All time'
    },
    { 
      label: 'MRR', 
      value: `$${metrics.mrr.toLocaleString()}`, 
      helperText: `${metrics.activeSubscriptions} Pro subscription${metrics.activeSubscriptions !== 1 ? 's' : ''}`
    },
    { 
      label: 'Invoice Volume', 
      value: `$${Math.round(metrics.totalInvoiceVolume).toLocaleString()}`, 
      helperText: `$${Math.round(metrics.paidInvoiceVolume).toLocaleString()} collected`
    },
  ] : [];

  return (
    <AdminLayout 
      currentView="dashboard"
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      customStart={customStart}
      customEnd={customEnd}
      onCustomStartChange={setCustomStart}
      onCustomEndChange={setCustomEnd}
    >
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                <div className="h-8 bg-gray-200 rounded w-32" />
              </div>
            ))
          ) : (
            kpiMetrics.map((metric, index) => {
              const icons = [Users, FileText, DollarSign, TrendingUp];
              const Icon = icons[index];
              return (
                <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-500">{metric.label}</p>
                      <p className="mt-1 text-2xl font-bold text-gray-900">{metric.value}</p>
                    </div>
                    <div className="p-2 bg-[#2CA01C]/10 rounded-lg">
                      <Icon className="w-5 h-5 text-[#2CA01C]" />
                    </div>
                  </div>
                  {metric.helperText && (
                    <p className="mt-2 text-xs text-gray-400">{metric.helperText}</p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title={`New Users (${dateRange === 'Custom' ? 'Custom Range' : dateRange})`} className="h-[350px]">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2CA01C]" />
              </div>
            ) : usersChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={usersChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line name="Users" type="monotone" dataKey="value" stroke="#2ca01c" strokeWidth={3} dot={{ fill: '#2ca01c', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">No data available</div>
            )}
          </Card>

          <Card title={`Invoices Sent (${dateRange === 'Custom' ? 'Custom Range' : dateRange})`} className="h-[350px]">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2CA01C]" />
              </div>
            ) : invoicesChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={invoicesChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line name="Invoices" type="step" dataKey="value" stroke="#1d6313" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">No data available</div>
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card title={`Invoice Volume (${dateRange === 'Custom' ? 'Custom Range' : dateRange})`} className="lg:col-span-2 h-[350px]">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2CA01C]" />
              </div>
            ) : volumeChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val >= 1000 ? (val/1000) + 'k' : val}`} />
                  <Tooltip 
                    cursor={{ fill: '#f9fafb' }} 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Volume']}
                  />
                  <Bar name="Volume" dataKey="value" fill="#2ca01c" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">No data available</div>
            )}
          </Card>

          {/* Recent Payments Feed */}
          <Card title="Recent Payments" className="h-[350px]">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2CA01C]" />
              </div>
            ) : (
              <div className="overflow-y-auto pr-2 h-full">
                <div className="space-y-4">
                  {payments.length > 0 ? payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${payment.status === 'completed' ? 'bg-green-100' : 'bg-red-100'}`}>
                          {payment.status === 'completed' ? (
                            <CreditCard className="w-4 h-4 text-green-700" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-700" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">${payment.amount.toFixed(2)}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[120px]">{payment.customerEmail}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${payment.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          {payment.status}
                        </span>
                        <p className="text-xs text-gray-400 mt-1">{payment.created}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center text-gray-400 py-8">No recent payments</div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card title="Subscription Plan Breakdown" className="h-[300px]">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2CA01C]" />
              </div>
            ) : subscriptionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={subscriptionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {subscriptionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">No data available</div>
            )}
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

