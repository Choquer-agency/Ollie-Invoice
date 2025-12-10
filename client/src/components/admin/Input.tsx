import React from 'react';
import { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon;
  label?: string;
}

export const Input: React.FC<InputProps> = ({ 
  icon: Icon, 
  label,
  className = '', 
  ...props 
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
        )}
        <input
          className={`block w-full rounded-lg border border-gray-200 bg-white py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#2CA01C] focus:ring-1 focus:ring-[#2CA01C] ${
            Icon ? 'pl-10 pr-4' : 'px-4'
          } ${className}`}
          {...props}
        />
      </div>
    </div>
  );
};

