import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { identifyUser, resetUser } from "@/lib/analytics";
import type { User } from "@shared/schema";

// Check if we have a cached auth state for faster initial render
const AUTH_CACHE_KEY = "ollie_auth_state";
const PENDING_SIGNUP_KEY = "ollie_pending_signup";

function getCachedAuthState(): boolean {
  try {
    return localStorage.getItem(AUTH_CACHE_KEY) === "authenticated";
  } catch {
    return false;
  }
}

function setCachedAuthState(isAuthenticated: boolean) {
  try {
    if (isAuthenticated) {
      localStorage.setItem(AUTH_CACHE_KEY, "authenticated");
    } else {
      localStorage.removeItem(AUTH_CACHE_KEY);
    }
  } catch {
    // Ignore localStorage errors
  }
}

// Complete signup for users who verified their email
async function completePendingSignup(token: string, userId: string) {
  const pendingData = localStorage.getItem(PENDING_SIGNUP_KEY);
  if (!pendingData) return;

  try {
    const data = JSON.parse(pendingData);
    
    const response = await fetch('/api/auth/signup-complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        // Support both old (firstName) and new (fullName) formats
        fullName: data.fullName || data.firstName,
        businessData: {
          businessName: data.company,
          email: data.email,
        },
      }),
    });

    if (response.ok) {
      // Clear pending signup and set welcome flag
      localStorage.removeItem(PENDING_SIGNUP_KEY);
      localStorage.setItem(`ollie_welcomed_${userId}`, 'true');
      localStorage.setItem('ollie_show_welcome', 'true');
    }
  } catch (error) {
    // Silently fail - user can still use the app
  }
}

export function useAuth() {
  // Use cached state to reduce flash on page load
  const cachedAuth = getCachedAuthState();
  const [supabaseUser, setSupabaseUser] = useState<any>(cachedAuth ? {} : null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const completedSignupRef = useRef(false);

  useEffect(() => {
    if (!supabase) {
      setIsLoadingAuth(false);
      setCachedAuthState(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSupabaseUser(session?.user ?? null);
      setCachedAuthState(!!session?.user);
      
      // Complete pending signup if exists
      if (session?.access_token && session?.user && !completedSignupRef.current) {
        completedSignupRef.current = true;
        await completePendingSignup(session.access_token, session.user.id);
      }
      
      setIsLoadingAuth(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSupabaseUser(session?.user ?? null);
      setCachedAuthState(!!session?.user);
      
      // Complete pending signup on sign in
      if (_event === 'SIGNED_IN' && session?.access_token && session?.user && !completedSignupRef.current) {
        completedSignupRef.current = true;
        await completePendingSignup(session.access_token, session.user.id);
        
        // Log the login activity (fire and forget, don't block UI)
        fetch('/api/auth/log-login', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }).catch(() => {
          // Silently fail - activity logging shouldn't block authentication
        });
      }
      
      setIsLoadingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch user from our database
  const { data: user, isLoading: isLoadingUser } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
    enabled: !!supabaseUser,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  // Identify user in PostHog when authenticated
  const identifiedRef = useRef(false);
  useEffect(() => {
    if (user && !identifiedRef.current) {
      identifiedRef.current = true;
      identifyUser(user.id, {
        email: user.email || undefined,
        name: user.name || undefined,
        plan: 'free', // Will be updated when we fetch subscription status
        signupDate: user.createdAt ? new Date(user.createdAt).toISOString() : undefined,
      });
    }
    
    // Reset PostHog on logout
    if (!supabaseUser && identifiedRef.current) {
      identifiedRef.current = false;
      resetUser();
    }
  }, [user, supabaseUser]);

  return {
    user,
    isLoading: isLoadingAuth || isLoadingUser,
    isAuthenticated: !!supabaseUser && !!user,
    supabaseUser,
  };
}
