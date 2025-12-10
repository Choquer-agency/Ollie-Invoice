import type { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Admin allowlist - only these emails can access admin dashboard
const ADMIN_ALLOWLIST = ["admin@ollieinvoice.com"];

// Pre-hashed password for "Choquer91!" using bcrypt
// Generated with: bcrypt.hashSync("Choquer91!", 12)
const ADMIN_PASSWORD_HASH = "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.XQsQHMBEPKsuOe";

// JWT secret for admin tokens (separate from app tokens)
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || "ollie-admin-secret-change-in-production";

// Token expiry: 24 hours
const TOKEN_EXPIRY = "24h";

interface AdminTokenPayload {
  email: string;
  isAdmin: true;
  iat?: number;
  exp?: number;
}

/**
 * Validate admin credentials
 */
export async function validateAdminCredentials(
  email: string,
  password: string
): Promise<{ valid: boolean; error?: string }> {
  // Check if email is in allowlist
  if (!ADMIN_ALLOWLIST.includes(email.toLowerCase())) {
    // Return generic error to prevent email enumeration
    return { valid: false, error: "Invalid credentials" };
  }

  // Verify password
  const passwordValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
  if (!passwordValid) {
    return { valid: false, error: "Invalid credentials" };
  }

  return { valid: true };
}

/**
 * Generate admin JWT token
 */
export function generateAdminToken(email: string): string {
  const payload: AdminTokenPayload = {
    email: email.toLowerCase(),
    isAdmin: true,
  };

  return jwt.sign(payload, ADMIN_JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

/**
 * Verify admin JWT token
 */
export function verifyAdminToken(token: string): AdminTokenPayload | null {
  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as AdminTokenPayload;
    
    // Double-check email is still in allowlist
    if (!ADMIN_ALLOWLIST.includes(decoded.email.toLowerCase())) {
      return null;
    }
    
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Extract admin token from request (cookie or header)
 */
function getAdminTokenFromRequest(req: any): string | null {
  // Check Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // Check cookie
  if (req.cookies?.admin_token) {
    return req.cookies.admin_token;
  }

  return null;
}

/**
 * Middleware to protect admin routes
 * Returns 404 for non-admins (to hide admin routes exist)
 */
export const isAdminAuthenticated: RequestHandler = (req, res, next) => {
  const token = getAdminTokenFromRequest(req);

  if (!token) {
    // Return 404 to hide that admin routes exist
    return res.status(404).json({ message: "Not found" });
  }

  const payload = verifyAdminToken(token);
  if (!payload) {
    // Return 404 to hide that admin routes exist
    return res.status(404).json({ message: "Not found" });
  }

  // Attach admin info to request
  (req as any).admin = {
    email: payload.email,
    isAdmin: true,
  };

  next();
};

/**
 * Set admin token as httpOnly cookie
 */
export function setAdminCookie(res: any, token: string): void {
  res.cookie("admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: "/",
  });
}

/**
 * Clear admin token cookie
 */
export function clearAdminCookie(res: any): void {
  res.clearCookie("admin_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
}

