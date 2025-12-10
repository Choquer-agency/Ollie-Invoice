import { useState, useEffect, useCallback } from 'react';

interface AdminAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  email: string | null;
}

// Store token in memory for security (not localStorage)
let adminToken: string | null = null;

export function useAdminAuth() {
  const [state, setState] = useState<AdminAuthState>({
    isAuthenticated: false,
    isLoading: true,
    email: null,
  });

  // Verify session on mount
  useEffect(() => {
    verifySession();
  }, []);

  const verifySession = useCallback(async () => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`;
      }

      const response = await fetch('/api/admin/me', {
        method: 'GET',
        credentials: 'include', // Include cookies
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        setState({
          isAuthenticated: true,
          isLoading: false,
          email: data.email,
        });
      } else {
        setState({
          isAuthenticated: false,
          isLoading: false,
          email: null,
        });
        adminToken = null;
      }
    } catch {
      setState({
        isAuthenticated: false,
        isLoading: false,
        email: null,
      });
      adminToken = null;
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        adminToken = data.token;
        setState({
          isAuthenticated: true,
          isLoading: false,
          email: email,
        });
        return { success: true };
      } else {
        return { success: false, error: data.message || 'Login failed' };
      }
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore errors
    }
    
    adminToken = null;
    setState({
      isAuthenticated: false,
      isLoading: false,
      email: null,
    });
  }, []);

  // Helper function to get auth headers for API calls
  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (adminToken) {
      headers['Authorization'] = `Bearer ${adminToken}`;
    }
    
    return headers;
  }, []);

  return {
    ...state,
    login,
    logout,
    getAuthHeaders,
    verifySession,
  };
}

// Utility function for making authenticated admin API calls
export async function adminFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  
  if (adminToken) {
    headers.set('Authorization', `Bearer ${adminToken}`);
  }

  return fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });
}

