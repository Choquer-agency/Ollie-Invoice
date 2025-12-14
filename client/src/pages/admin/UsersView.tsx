import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useAdminAuth, adminFetch } from '@/hooks/useAdminAuth';
import AdminLayout from './AdminLayout';
import { Card } from '@/components/admin/Card';
import { Input } from '@/components/admin/Input';
import { Button } from '@/components/admin/Button';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Drawer } from '@/components/admin/Drawer';
import { Search, Filter, Download, User as UserIcon, Calendar, DollarSign, Building, Activity } from 'lucide-react';

interface AdminUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: string | null;
  lastActive: string | null;
  businessName: string | null;
  subscriptionTier: string | null;
  invoicesSent: number;
  totalInvoiceValue: number;
  status: 'active' | 'inactive';
}

interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export default function UsersView() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAdminAuth();
  
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/admin/login');
    }
  }, [isAuthenticated, isLoading, setLocation]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers();
    }
  }, [isAuthenticated]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await adminFetch('/api/admin/users');
      if (response.ok) {
        setUsers(await response.json());
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
    setLoading(false);
  };

  const handleExport = async () => {
    try {
      const response = await adminFetch('/api/admin/exports/users');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting users:', error);
    }
  };

  const fetchUserActivity = async (userId: string) => {
    setLoadingActivity(true);
    try {
      const response = await adminFetch(`/api/admin/users/${userId}/activity?limit=50`);
      if (response.ok) {
        const logs = await response.json();
        setActivityLogs(logs);
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      setActivityLogs([]);
    }
    setLoadingActivity(false);
  };

  const handleUserClick = (user: AdminUser) => {
    setSelectedUser(user);
    fetchUserActivity(user.id);
  };

  const formatActionLabel = (action: string) => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getActionIcon = (action: string) => {
    if (action === 'login') return '🔐';
    if (action.includes('invoice')) return '📄';
    if (action.includes('client')) return '👤';
    if (action.includes('payment')) return '💰';
    if (action.includes('business')) return '🏢';
    return '📋';
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => 
      (user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (user.email?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (user.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
    );
  }, [users, searchTerm]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2CA01C]" />
      </div>
    );
  }

  return (
    <AdminLayout currentView="users">
      <Card className="h-full flex flex-col">
        {/* Header Controls */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="w-full sm:w-96">
            <Input 
              placeholder="Search users by name, email, or business..." 
              icon={Search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" icon={Download} onClick={handleExport}>Export</Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-900 font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Joined</th>
                <th className="px-6 py-3">Business</th>
                <th className="px-6 py-3 text-right">Invoices</th>
                <th className="px-6 py-3">Plan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-28" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-8 ml-auto" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-12" /></td>
                  </tr>
                ))
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr 
                    key={user.id} 
                    onClick={() => handleUserClick(user)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">
                          {user.firstName || user.lastName 
                            ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                            : 'No name'}
                        </span>
                        <span className="text-xs text-gray-400">{user.email || 'No email'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={user.status} />
                    </td>
                    <td className="px-6 py-4">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {user.businessName || <span className="text-gray-300 italic">None</span>}
                    </td>
                    <td className="px-6 py-4 text-right font-medium">{user.invoicesSent}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={user.subscriptionTier === 'pro' ? 'active' : 'inactive'} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    {searchTerm ? `No users found matching "${searchTerm}"` : 'No users found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <span>Showing {filteredUsers.length} of {users.length} users</span>
        </div>
      </Card>

      {/* User Detail Drawer */}
      <Drawer 
        isOpen={!!selectedUser} 
        onClose={() => setSelectedUser(null)} 
        title="User Details"
      >
        {selectedUser && (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 bg-[#2CA01C]/10 rounded-full flex items-center justify-center text-[#2CA01C] text-2xl font-bold">
                {(selectedUser.firstName || selectedUser.email || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedUser.firstName || selectedUser.lastName 
                    ? `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim()
                    : 'No name'}
                </h3>
                <p className="text-gray-500">{selectedUser.email || 'No email'}</p>
                <div className="mt-2">
                  <StatusBadge status={selectedUser.status} />
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-100 pt-6 space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Overview</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Total Invoices</p>
                  <p className="font-semibold text-gray-900 text-lg flex items-center">
                    <Building className="w-4 h-4 mr-1 text-gray-400" />
                    {selectedUser.invoicesSent}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Invoice Value</p>
                  <p className="font-semibold text-gray-900 text-lg flex items-center">
                    <DollarSign className="w-4 h-4 mr-1 text-gray-400" />
                    ${selectedUser.totalInvoiceValue.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600 flex items-center text-sm">
                    <Calendar className="w-4 h-4 mr-2" /> Joined
                  </span>
                  <span className="font-medium text-sm">
                    {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600 flex items-center text-sm">
                    <UserIcon className="w-4 h-4 mr-2" /> Last Active
                  </span>
                  <span className="font-medium text-sm">
                    {selectedUser.lastActive ? new Date(selectedUser.lastActive).toLocaleDateString() : '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600 flex items-center text-sm">
                    <Building className="w-4 h-4 mr-2" /> Business
                  </span>
                  <span className="font-medium text-sm">
                    {selectedUser.businessName || '-'}
                  </span>
                </div>
              </div>
            </div>

            {selectedUser.subscriptionTier === 'pro' ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h5 className="text-green-800 font-semibold text-sm">Pro Subscription</h5>
                <p className="text-green-700 text-xs mt-1">User has an active Pro subscription</p>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h5 className="text-gray-800 font-semibold text-sm">Free Tier</h5>
                <p className="text-gray-600 text-xs mt-1">User is on the free tier</p>
              </div>
            )}

            {/* Activity Log Section */}
            <div className="border-t border-gray-100 pt-6">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4 flex items-center">
                <Activity className="w-4 h-4 mr-2" />
                Recent Activity
              </h4>
              
              {loadingActivity ? (
                <div className="space-y-3">
                  {Array(5).fill(0).map((_, i) => (
                    <div key={i} className="animate-pulse bg-gray-100 h-16 rounded-lg" />
                  ))}
                </div>
              ) : activityLogs.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {activityLogs.map((log) => (
                    <div 
                      key={log.id} 
                      className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{getActionIcon(log.action)}</span>
                            <span className="font-medium text-sm text-gray-900">
                              {formatActionLabel(log.action)}
                            </span>
                          </div>
                          {log.metadata && (
                            <div className="text-xs text-gray-600 space-y-1 mt-2">
                              {log.metadata.invoiceNumber && (
                                <div>Invoice: #{log.metadata.invoiceNumber}</div>
                              )}
                              {log.metadata.clientName && (
                                <div>Client: {log.metadata.clientName}</div>
                              )}
                              {log.metadata.clientEmail && (
                                <div>Email: {log.metadata.clientEmail}</div>
                              )}
                              {log.metadata.amount && (
                                <div>Amount: ${log.metadata.amount}</div>
                              )}
                              {log.metadata.total && (
                                <div>Total: ${log.metadata.total}</div>
                              )}
                              {log.metadata.email && (
                                <div>Email: {log.metadata.email}</div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs text-gray-500">
                            {new Date(log.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Activity className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No activity recorded yet</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </AdminLayout>
  );
}

