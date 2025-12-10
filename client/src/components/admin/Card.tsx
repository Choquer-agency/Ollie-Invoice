import React from 'react';

interface CardProps {
  title?: string;
  className?: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ title, className = '', children }) => {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
      )}
      <div className={`flex-1 min-h-0 ${title ? 'p-6' : ''}`}>{children}</div>
    </div>
  );
};

