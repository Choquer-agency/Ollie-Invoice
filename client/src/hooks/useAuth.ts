import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { User } from "@shared/schema";

// Check if we have a cached auth state for faster initial render
const AUTH_CACHE_KEY = "ollie_auth_state";
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

export function useAuth() {
  // Use cached state to reduce flash on page load
  const cachedAuth = getCachedAuthState();
  const [supabaseUser, setSupabaseUser] = useState<any>(cachedAuth ? {} : null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setIsLoadingAuth(false);
      setCachedAuthState(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseUser(session?.user ?? null);
      setCachedAuthState(!!session?.user);
      setIsLoadingAuth(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null);
      setCachedAuthState(!!session?.user);
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

  return {
    user,
    isLoading: isLoadingAuth || isLoadingUser,
    isAuthenticated: !!supabaseUser && !!user,
    supabaseUser,
  };
}
