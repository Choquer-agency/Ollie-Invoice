import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAdminAuth, adminFetch } from '@/hooks/useAdminAuth';
import AdminLayout from './AdminLayout';
import { Card } from '@/components/admin/Card';
import { 
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

      const [metricsRes, usersRes, invoicesRes, volumeRes, subsRes] = await Promise.all([
        adminFetch('/api/admin/metrics'),
        adminFetch(`/api/admin/charts/users?${params.toString()}`),
        adminFetch(`/api/admin/charts/invoices?${params.toString()}`),
        adminFetch(`/api/admin/charts/volume?${params.toString()}`),
        adminFetch('/api/admin/charts/subscriptions'),
      ]);

      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (usersRes.ok) setUsersChart(await usersRes.json());
      if (invoicesRes.ok) setInvoicesChart(await invoicesRes.json());
      if (volumeRes.ok) setVolumeChart(await volumeRes.json());
      if (subsRes.ok) setSubscriptionData(await subsRes.json());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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

        <Card title={`Invoice Volume (${dateRange === 'Custom' ? 'Custom Range' : dateRange})`} className="h-[350px]">
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

