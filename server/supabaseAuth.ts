import type { Express, RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";
import { storage } from "./storage";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set - authentication will not work');
}

// Server-side Supabase client with service role key (bypasses RLS)
export const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Extract JWT token from request
function getTokenFromRequest(req: any): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  // Also check cookies for session tokens
  if (req.cookies) {
    return req.cookies['sb-access-token'] || req.cookies['sb-refresh-token'] || null;
  }
  return null;
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);

  // Auth callback route - Supabase handles this via redirects
  app.get("/api/auth/callback", async (req, res) => {
    const { code } = req.query;
    if (code) {
      // Supabase handles the OAuth callback
      // The frontend will handle the token exchange
      res.redirect(`/?code=${code}`);
    } else {
      res.redirect('/');
    }
  });

  // Logout route
  app.post("/api/auth/logout", async (req, res) => {
    res.clearCookie('sb-access-token');
    res.json({ success: true });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!supabaseAdmin) {
    // If Supabase is not configured, allow access for local development
    console.warn('Supabase not configured - allowing unauthenticated access');
    if (!req.user) {
      (req as any).user = {
        id: 'local-dev-user',
        email: 'dev@localhost',
      };
    }
    return next();
  }

  try {
    const token = getTokenFromRequest(req);
    
    if (!token) {
      return res.status(401).json({ message: "Unauthorized - No token provided" });
    }

    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ message: "Unauthorized - Invalid token" });
    }

    // Upsert user in our database - this returns the EXISTING user if found by email
    // which is critical for maintaining data continuity across different auth methods
    const dbUser = await storage.upsertUser({
      id: user.id,
      email: user.email || undefined,
      firstName: user.user_metadata?.first_name || user.user_metadata?.full_name?.split(' ')[0] || undefined,
      lastName: user.user_metadata?.last_name || user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || undefined,
      profileImageUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || undefined,
    });

    // IMPORTANT: Use the database user ID, not the Supabase auth ID
    // This ensures data continuity if a user signs in with different methods
    // (e.g., Google OAuth vs email/password) which may give different Supabase IDs
    const effectiveUserId = dbUser.id;
    
    if (effectiveUserId !== user.id) {
      console.log(`User ID mismatch: Supabase ID ${user.id} mapped to DB ID ${effectiveUserId} (email: ${user.email})`);
    }

    // Attach user to request using the DATABASE user ID for data consistency
    (req as any).user = {
      id: effectiveUserId,
      email: user.email,
      claims: {
        sub: effectiveUserId,
        email: user.email,
      },
    };

    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};

