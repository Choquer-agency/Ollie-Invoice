import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

// Validation middleware factory
export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Validation error',
          errors: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(error);
    }
  };
}

// ===== Client Schemas =====
export const createClientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  companyName: z.string().max(255).optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  address: z.string().max(1000).optional(),
});

export const updateClientSchema = createClientSchema.partial();

// ===== Invoice Schemas =====
export const createInvoiceItemSchema = z.object({
  description: z.string().min(1, 'Description is required').max(1000),
  quantity: z.string().or(z.number()).transform(v => String(v)),
  rate: z.string().or(z.number()).transform(v => String(v)),
  taxTypeId: z.string().optional(),
  lineTotal: z.string().or(z.number()).transform(v => String(v)),
  taxAmount: z.string().or(z.number()).transform(v => String(v)).optional(),
});

export const createInvoiceSchema = z.object({
  clientId: z.string().optional(),
  issueDate: z.string().or(z.date()).optional(),
  dueDate: z.string().or(z.date()),
  notes: z.string().max(5000).optional(),
  status: z.enum(['draft', 'sent', 'paid', 'partially_paid', 'overdue']).optional(),
  subtotal: z.string().or(z.number()).transform(v => String(v)).optional(),
  taxAmount: z.string().or(z.number()).transform(v => String(v)).optional(),
  shipping: z.string().or(z.number()).transform(v => String(v)).optional(),
  discountType: z.enum(['percent', 'dollar']).optional().nullable(),
  discountValue: z.string().or(z.number()).transform(v => String(v)).optional(),
  discountAmount: z.string().or(z.number()).transform(v => String(v)).optional(),
  total: z.string().or(z.number()).transform(v => String(v)).optional(),
  isRecurring: z.boolean().optional(),
  recurringFrequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional().nullable(),
  recurringDay: z.number().min(1).max(31).optional().nullable(),
  recurringMonth: z.number().min(1).max(12).optional().nullable(),
  recurringEvery: z.number().min(1).max(12).optional().nullable(),
  paymentMethod: z.enum(['stripe', 'etransfer', 'both']).optional(),
  // New multi-select payment methods
  paymentMethods: z.array(z.enum(['stripe', 'etransfer', 'bank_transfer', 'paypal', 'venmo', 'zelle'])).optional(),
  items: z.array(createInvoiceItemSchema).optional(),
});

export const updateInvoiceSchema = createInvoiceSchema.partial();

// ===== Business Schemas =====
export const updateBusinessSchema = z.object({
  businessName: z.string().min(1).max(255).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  address: z.string().max(1000).optional(),
  website: z.string().url().optional().or(z.literal('')),
  currency: z.string().length(3).optional(),
  brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  taxNumber: z.string().max(100).optional(),
  acceptEtransfer: z.boolean().optional(),
  acceptCard: z.boolean().optional(),
  etransferEmail: z.string().email().optional().or(z.literal('')),
  etransferInstructions: z.string().max(2000).optional(),
  paymentInstructions: z.string().max(2000).optional(),
  sendInvoiceCopy: z.boolean().optional(),
  invoiceCopyEmail: z.string().email().optional().or(z.literal('')),
  // Thank You Notes (Pro feature)
  thankYouEnabled: z.boolean().optional(),
  thankYouMessage: z.string().max(2000).optional().or(z.literal('')),
  // Bank Transfer (Pro feature)
  acceptBankTransfer: z.boolean().optional(),
  bankAccountName: z.string().max(255).optional().or(z.literal('')),
  bankName: z.string().max(255).optional().or(z.literal('')),
  bankAccountNumber: z.string().max(100).optional().or(z.literal('')),
  bankRoutingNumber: z.string().max(50).optional().or(z.literal('')),
  bankSwiftCode: z.string().max(20).optional().or(z.literal('')),
  bankAddress: z.string().max(500).optional().or(z.literal('')),
  bankInstructions: z.string().max(2000).optional().or(z.literal('')),
  // PayPal (Pro feature)
  acceptPaypal: z.boolean().optional(),
  paypalEmail: z.string().email().optional().or(z.literal('')),
  // Venmo (Pro feature)
  acceptVenmo: z.boolean().optional(),
  venmoUsername: z.string().max(100).optional().or(z.literal('')),
  // Zelle (Pro feature)
  acceptZelle: z.boolean().optional(),
  zelleEmail: z.string().email().optional().or(z.literal('')),
  zellePhone: z.string().max(50).optional().or(z.literal('')),
});

// ===== Tax Type Schemas =====
export const createTaxTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  rate: z.string().or(z.number()).transform(v => String(v)),
  isDefault: z.boolean().optional(),
});

export const updateTaxTypeSchema = createTaxTypeSchema.partial();

// ===== Payment Schemas =====
export const recordPaymentSchema = z.object({
  amount: z.string().or(z.number()).transform(v => String(v)),
  paymentMethod: z.string().max(50).optional(),
  notes: z.string().max(1000).optional(),
});

// ===== User Schemas =====
export const updateUserSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
});

// ===== Signup Schemas =====
export const signupCompleteSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  fullName: z.string().max(200).optional(),
  businessData: z.object({
    businessName: z.string().min(1).max(255).optional(),
    currency: z.string().length(3).optional(),
    phone: z.string().max(50).optional(),
    address: z.string().max(1000).optional(),
  }).optional(),
  logoURL: z.string().url().optional(),
  updateBusiness: z.boolean().optional(),
  taxTypes: z.array(z.object({
    name: z.string().min(1).max(100),
    rate: z.number().or(z.string()),
    isDefault: z.boolean().optional(),
  })).optional(),
});

