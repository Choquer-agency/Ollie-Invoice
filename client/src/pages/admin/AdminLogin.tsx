import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Input } from '@/components/admin/Input';
import { Button } from '@/components/admin/Button';
import { Mail, Lock, AlertCircle } from 'lucide-react';

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading, login } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      setLocation('/admin');
    }
  }, [isAuthenticated, isLoading, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = await login(email, password);

    if (result.success) {
      setLocation('/admin');
    } else {
      setError(result.error || 'Login failed');
    }

    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2CA01C]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2">
              <div className="relative flex items-center justify-center">
                <div 
                  className="w-8 h-8 absolute"
                  style={{ 
                    backgroundColor: '#9EE591',
                    borderRadius: '100px 100px 100px 5px',
                    transform: 'translateX(-4px)'
                  }}
                />
                <div 
                  className="w-8 h-8 absolute"
                  style={{ 
                    backgroundColor: '#00D639',
                    borderRadius: '100px',
                    transform: 'translateX(4px)',
                    mixBlendMode: 'multiply'
                  }}
                />
              </div>
              <span className="ml-12 text-2xl font-bold text-gray-900">Admin</span>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
            Admin Login
          </h1>
          <p className="text-center text-gray-500 mb-8">
            Enter your credentials to access the admin dashboard
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              type="email"
              placeholder="admin@ollieinvoice.com"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />

            <Input
              type="password"
              placeholder="Password"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-gray-400">
          This is a restricted area. Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  );
}

