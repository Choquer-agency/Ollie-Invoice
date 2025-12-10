import React from 'react';

type StatusType = 'active' | 'inactive' | 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'succeeded' | 'failed' | 'pending';

interface StatusBadgeProps {
  status: StatusType | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const statusStyles: Record<string, string> = {
    active: 'bg-green-50 text-green-700 border-green-200',
    inactive: 'bg-gray-50 text-gray-600 border-gray-200',
    draft: 'bg-gray-50 text-gray-600 border-gray-200',
    sent: 'bg-blue-50 text-blue-700 border-blue-200',
    paid: 'bg-green-50 text-green-700 border-green-200',
    partially_paid: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    overdue: 'bg-red-50 text-red-700 border-red-200',
    succeeded: 'bg-green-50 text-green-700 border-green-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  };
  
  const normalizedStatus = status.toLowerCase().replace(/ /g, '_');
  const styles = statusStyles[normalizedStatus] || statusStyles.inactive;
  const displayText = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles}`}>
      {displayText}
    </span>
  );
};

