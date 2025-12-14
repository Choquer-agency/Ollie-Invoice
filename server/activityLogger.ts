import { storage } from "./storage";
import type { InsertActivityLog } from "@shared/schema";
import type { Request } from "express";

/**
 * Activity Logger Utility
 * 
 * Logs user activities for admin monitoring and analytics
 */

// Extract IP address from request (handles proxies)
function getClientIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress;
}

// Extract user agent from request
function getUserAgent(req: Request): string | undefined {
  return req.headers['user-agent'];
}

/**
 * Log a user activity
 */
export async function logActivity(
  req: any, // Express Request with user attached
  action: string,
  options?: {
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  try {
    // Only log if user is authenticated
    if (!req.user?.id) {
      return;
    }

    const activityLog: InsertActivityLog = {
      userId: req.user.id,
      action,
      entityType: options?.entityType,
      entityId: options?.entityId,
      metadata: options?.metadata,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    };

    // Fire and forget - don't await to avoid slowing down requests
    storage.logActivity(activityLog).catch((error) => {
      console.error('Failed to log activity:', error);
    });
  } catch (error) {
    // Silently fail - activity logging should never break the main flow
    console.error('Activity logger error:', error);
  }
}

/**
 * Activity action types (for consistency)
 */
export const ActivityActions = {
  // Authentication
  LOGIN: 'login',
  LOGOUT: 'logout',
  SIGNUP: 'signup',
  
  // Business
  CREATE_BUSINESS: 'create_business',
  UPDATE_BUSINESS: 'update_business',
  
  // Clients
  CREATE_CLIENT: 'create_client',
  UPDATE_CLIENT: 'update_client',
  DELETE_CLIENT: 'delete_client',
  
  // Invoices
  CREATE_INVOICE: 'create_invoice',
  UPDATE_INVOICE: 'update_invoice',
  DELETE_INVOICE: 'delete_invoice',
  SEND_INVOICE: 'send_invoice',
  RESEND_INVOICE: 'resend_invoice',
  MARK_INVOICE_PAID: 'mark_invoice_paid',
  DOWNLOAD_INVOICE_PDF: 'download_invoice_pdf',
  
  // Payments
  RECORD_PAYMENT: 'record_payment',
  STRIPE_PAYMENT: 'stripe_payment',
  
  // Subscriptions
  UPGRADE_SUBSCRIPTION: 'upgrade_subscription',
  CANCEL_SUBSCRIPTION: 'cancel_subscription',
  
  // Settings
  UPDATE_SETTINGS: 'update_settings',
  CONNECT_STRIPE: 'connect_stripe',
  DISCONNECT_STRIPE: 'disconnect_stripe',
} as const;

/**
 * Entity types (for consistency)
 */
export const EntityTypes = {
  BUSINESS: 'business',
  CLIENT: 'client',
  INVOICE: 'invoice',
  PAYMENT: 'payment',
  SUBSCRIPTION: 'subscription',
  SETTINGS: 'settings',
} as const;

