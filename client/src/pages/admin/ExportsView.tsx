import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useEffect } from 'react';
import { useAdminAuth, adminFetch } from '@/hooks/useAdminAuth';
import AdminLayout from './AdminLayout';
import { Card } from '@/components/admin/Card';
import { Button } from '@/components/admin/Button';
import { Download, Users, FileText, CreditCard } from 'lucide-react';

interface ExportOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  fields: string[];
}

const exportOptions: ExportOption[] = [
  {
    id: 'users',
    label: 'All Users Data',
    description: 'Full dump of user table including metadata and subscription info.',
    icon: <Users className="w-5 h-5 text-blue-500" />,
    fields: ['Email', 'Name', 'Business Name', 'Created At', 'Status', 'Invoice Count', 'Last Active', 'Subscription']
  },
  {
    id: 'invoices',
    label: 'Invoices Register',
    description: 'Detailed export of all invoices sent via platform.',
    icon: <FileText className="w-5 h-5 text-green-500" />,
    fields: ['Invoice ID', 'User Email', 'Client Name', 'Amount', 'Status', 'Issue Date', 'Paid Date']
  },
  {
    id: 'subscriptions',
    label: 'Pro Subscriptions',
    description: 'Export of all Pro subscription users.',
    icon: <CreditCard className="w-5 h-5 text-purple-500" />,
    fields: ['User Email', 'Business Name', 'Plan', 'Created At', 'Status']
  }
];

export default function ExportsView() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAdminAuth();
  
  const [selectedExport, setSelectedExport] = useState<string>('users');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/admin/login');
    }
  }, [isAuthenticated, isLoading, setLocation]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await adminFetch(`/api/admin/exports/${selectedExport}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedExport}-export-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        console.error('Export failed');
      }
    } catch (error) {
      console.error('Error exporting:', error);
    }
    setIsExporting(false);
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2CA01C]" />
      </div>
    );
  }

  const currentOption = exportOptions.find(o => o.id === selectedExport);

  return (
    <AdminLayout currentView="exports">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Exports</h1>
          <p className="text-gray-500 mt-1">Export platform data as CSV files</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Selection Cards */}
          {exportOptions.map((opt) => (
            <div 
              key={opt.id}
              onClick={() => setSelectedExport(opt.id)}
              className={`cursor-pointer rounded-xl border p-6 transition-all ${
                selectedExport === opt.id 
                  ? 'bg-white border-[#2CA01C] shadow-md ring-1 ring-[#2CA01C]' 
                  : 'bg-white border-gray-200 hover:border-[#2CA01C]/50 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-gray-50 rounded-lg">{opt.icon}</div>
                {selectedExport === opt.id && <div className="h-2 w-2 rounded-full bg-[#2CA01C]" />}
              </div>
              <h3 className="font-semibold text-gray-900">{opt.label}</h3>
              <p className="text-sm text-gray-500 mt-2">{opt.description}</p>
            </div>
          ))}
        </div>

        {/* Configuration Area */}
        <Card title="Export Configuration" className="min-h-[300px]">
          {currentOption && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Included Fields</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {currentOption.fields.map(field => (
                    <label key={field} className="flex items-center space-x-2 text-sm text-gray-700">
                      <input 
                        type="checkbox" 
                        defaultChecked 
                        disabled
                        className="rounded border-gray-300 text-[#2CA01C] focus:ring-[#2CA01C]" 
                      />
                      <span>{field}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <Button onClick={handleExport} disabled={isExporting} icon={Download}>
                  {isExporting ? 'Generating CSV...' : `Download ${currentOption.label} CSV`}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}

