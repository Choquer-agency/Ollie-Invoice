import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useAdminAuth, adminFetch } from '@/hooks/useAdminAuth';
import AdminLayout from './AdminLayout';
import { Card } from '@/components/admin/Card';
import { Input } from '@/components/admin/Input';
import { Button } from '@/components/admin/Button';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Search, Download } from 'lucide-react';

interface AdminInvoice {
  id: string;
  invoiceNumber: string;
  userEmail: string;
  clientName: string;
  sentDate: string;
  status: string;
  amount: number;
}

export default function InvoicesView() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAdminAuth();
  
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/admin/login');
    }
  }, [isAuthenticated, isLoading, setLocation]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchInvoices();
    }
  }, [isAuthenticated]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await adminFetch('/api/admin/invoices');
      if (response.ok) {
        setInvoices(await response.json());
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
    setLoading(false);
  };

  const handleExport = async () => {
    try {
      const response = await adminFetch('/api/admin/exports/invoices');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoices-export-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting invoices:', error);
    }
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      const matchesSearch = 
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.userEmail.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'All' || invoice.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, statusFilter]);

  const totalValue = useMemo(() => {
    return filteredInvoices.reduce((acc, curr) => acc + curr.amount, 0);
  }, [filteredInvoices]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2CA01C]" />
      </div>
    );
  }

  const statuses = ['All', 'draft', 'sent', 'paid', 'partially_paid', 'overdue'];

  return (
    <AdminLayout currentView="invoices">
      <Card className="h-full flex flex-col">
        {/* Filters */}
        <div className="p-4 border-b border-gray-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex-1 flex flex-col sm:flex-row gap-2">
            <div className="w-full sm:w-64">
              <Input 
                placeholder="Search ID, Client, Email..." 
                icon={Search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="block w-full sm:w-40 rounded-lg border-gray-200 bg-white text-sm shadow-sm focus:border-[#2CA01C] focus:ring-[#2CA01C] py-2 pl-3 pr-8"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {statuses.map(s => (
                <option key={s} value={s}>
                  {s === 'All' ? 'All Statuses' : s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              Total Value: <span className="font-bold text-gray-900">${totalValue.toLocaleString()}</span>
            </div>
            <Button variant="secondary" icon={Download} onClick={handleExport}>Export</Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-900 font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-3">Invoice ID</th>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Client</th>
                <th className="px-6 py-3">Sent Date</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-28" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredInvoices.length > 0 ? (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-medium text-gray-900">
                      #{invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 text-gray-500">{invoice.userEmail}</td>
                    <td className="px-6 py-4">{invoice.clientName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{invoice.sentDate}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={invoice.status} />
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      ${invoice.amount.toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    {searchTerm || statusFilter !== 'All' 
                      ? 'No invoices found matching your filters' 
                      : 'No invoices found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <span>Showing {filteredInvoices.length} of {invoices.length} invoices</span>
        </div>
      </Card>
    </AdminLayout>
  );
}

