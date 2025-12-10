import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Download, 
  LogOut,
  Menu,
  X,
  Calendar
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  currentView: 'dashboard' | 'users' | 'invoices' | 'exports';
  dateRange?: string;
  onDateRangeChange?: (range: string) => void;
  customStart?: string;
  customEnd?: string;
  onCustomStartChange?: (date: string) => void;
  onCustomEndChange?: (date: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
  { id: 'users', label: 'Users', icon: Users, path: '/admin/users' },
  { id: 'invoices', label: 'Invoices', icon: FileText, path: '/admin/invoices' },
  { id: 'exports', label: 'Exports', icon: Download, path: '/admin/exports' },
];

export default function AdminLayout({ 
  children, 
  currentView,
  dateRange = 'This Year',
  onDateRangeChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
}: AdminLayoutProps) {
  const [, setLocation] = useLocation();
  const { logout } = useAdminAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setLocation('/admin/login');
  };

  const today = new Date().toISOString().split('T')[0];
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <img 
          src="https://fdqnjninitbyeescipyh.supabase.co/storage/v1/object/public/Logos/private/uploads/Ollie%20Circles.svg" 
          alt="Ollie"
          className="h-8 w-auto"
        />
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === currentView;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setLocation(item.path);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-[#2CA01C]/10 text-[#2CA01C]'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors mt-2"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      )}

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 min-h-screen">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-start">
              <img 
                src="https://fdqnjninitbyeescipyh.supabase.co/storage/v1/object/public/Logos/private/uploads/Ollie%20Circles.svg" 
                alt="Ollie"
                className="h-10 w-auto"
              />
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === currentView;
              return (
                <button
                  key={item.id}
                  onClick={() => setLocation(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-[#2CA01C]/10 text-[#2CA01C]'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8">
          {/* Date Filter Header - Only show on dashboard */}
          {currentView === 'dashboard' && onDateRangeChange && (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div className="flex items-center space-x-2 text-gray-700 min-w-fit">
                <Calendar className="w-5 h-5 text-[#2CA01C]" />
                <span className="font-medium">Date Range:</span>
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto md:justify-end">
                {dateRange === 'Custom' && (
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-gray-50 rounded-lg p-1 border border-gray-200 w-full sm:w-auto">
                    <input 
                      type="date" 
                      value={customStart || lastWeek}
                      onChange={(e) => onCustomStartChange?.(e.target.value)}
                      className="bg-transparent text-sm border-none focus:ring-0 text-gray-600 w-full sm:w-32"
                    />
                    <span className="text-gray-400 text-xs hidden sm:inline">to</span>
                    <input 
                      type="date" 
                      value={customEnd || today}
                      onChange={(e) => onCustomEndChange?.(e.target.value)}
                      className="bg-transparent text-sm border-none focus:ring-0 text-gray-600 w-full sm:w-32"
                    />
                  </div>
                )}
                <div className="relative w-full sm:w-auto">
                  <select 
                    value={dateRange} 
                    onChange={(e) => onDateRangeChange(e.target.value)}
                    className="block w-full sm:w-48 rounded-lg border-gray-200 bg-gray-50 text-sm py-2 pl-3 pr-8 focus:border-[#2CA01C] focus:ring-[#2CA01C] shadow-sm font-medium text-gray-700 cursor-pointer"
                  >
                    <option>This Year</option>
                    <option>Last 14 Days</option>
                    <option>This Month</option>
                    <option>Last Month</option>
                    <option>This Quarter</option>
                    <option>Last Quarter</option>
                    <option>All Time</option>
                    <option>Custom</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {children}
        </main>
      </div>
    </div>
  );
}

