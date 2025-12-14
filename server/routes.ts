import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, supabaseAdmin } from "./supabaseAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { insertClientSchema, insertBusinessSchema, insertInvoiceSchema, insertInvoiceItemSchema } from "@shared/schema";
import { z } from "zod";
import { getUncachableStripeClient } from "./stripeClient";
import { generateInvoicePDF, generateInvoicePDFAsync } from "./pdfGenerator";
import { sendInvoiceEmail, sendThankYouEmail } from "./emailClient";
import { processRecurringInvoices, calculateNextRecurringDate } from "./recurringInvoices";
import { generalLimiter, authLimiter, userLimiter, emailLimiter, publicLimiter, stripeLimiter, adminAuthLimiter, adminApiLimiter } from "./rateLimit";
import { 
  validateAdminCredentials, 
  generateAdminToken, 
  isAdminAuthenticated, 
  setAdminCookie, 
  clearAdminCookie 
} from "./adminAuth";
import { 
  validateBody, 
  createClientSchema, 
  updateClientSchema,
  createInvoiceSchema,
  updateInvoiceSchema,
  updateBusinessSchema,
  createTaxTypeSchema,
  updateTaxTypeSchema,
  recordPaymentSchema,
  updateUserSchema,
  signupCompleteSchema,
} from "./validation";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { logActivity, ActivityActions, EntityTypes } from "./activityLogger";


export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Health check endpoint - no auth required, used for monitoring
  app.get('/health', async (req, res) => {
    try {
      // Test database connection
      await db.execute(sql`SELECT 1`);
      
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
      });
    } catch (error) {
      res.status(503).json({ 
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed',
      });
    }
  });

  // Auth middleware
  await setupAuth(app);

  // Apply general rate limiting to all API routes
  app.use('/api/', generalLimiter);

  // Auth routes - user endpoint needs higher limit since it's called on every page load
  app.get('/api/auth/user', userLimiter, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.patch('/api/auth/user', isAuthenticated, validateBody(updateUserSchema), async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const { firstName, lastName } = req.body;
      const user = await storage.upsertUser({
        id: userId,
        firstName,
        lastName,
      });
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Signup completion endpoint - requires valid Supabase auth token
  // The userId from the token is used (not from request body) to prevent impersonation
  app.post('/api/auth/signup-complete', authLimiter, validateBody(signupCompleteSchema), async (req: any, res) => {
    try {
      const { firstName, lastName, fullName, businessData, logoURL, updateBusiness, taxTypes } = req.body;
      
      // Parse fullName into firstName and lastName if provided
      let parsedFirstName = firstName;
      let parsedLastName = lastName;
      if (fullName && !firstName) {
        const nameParts = fullName.trim().split(/\s+/);
        parsedFirstName = nameParts[0] || '';
        parsedLastName = nameParts.slice(1).join(' ') || '';
      }

      // Verify authentication - extract userId from the auth token
      let userId: string;
      
      if (!supabaseAdmin) {
        return res.status(500).json({ message: "Authentication not configured" });
      }

      // Get the authorization token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const token = authHeader.substring(7);
      const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError || !authUser) {
        return res.status(401).json({ message: "Invalid authentication token" });
      }

      // Use the verified userId from the token, not from the request body
      userId = authUser.id;

      let user;
      let business;

      if (updateBusiness) {
        // Update existing business
        business = await storage.getBusinessByUserId(userId);
        if (!business) {
          return res.status(404).json({ message: "Business not found" });
        }
        business = await storage.updateBusiness(business.id, businessData || {});
      } else {
        // Initial signup - create user and business
        // Check if user already exists (for back/forth navigation)
        const existingUser = await storage.getUser(userId);
        if (existingUser) {
          user = existingUser;
          // Update user info if provided
          if (parsedFirstName || parsedLastName) {
            user = await storage.upsertUser({
              id: userId,
              firstName: parsedFirstName || existingUser.firstName,
              lastName: parsedLastName || existingUser.lastName,
            });
          }
        } else {
          // Create new user
          user = await storage.upsertUser({
            id: userId,
            firstName: parsedFirstName,
            lastName: parsedLastName,
          });
        }

        // Check if business already exists
        business = await storage.getBusinessByUserId(userId);
        if (business) {
          // Update existing business
          business = await storage.updateBusiness(business.id, businessData || {});
        } else {
          // Create new business
          business = await storage.createBusiness({
            userId,
            ...businessData,
          });
        }

        // Upload logo if provided
        if (logoURL) {
          try {
            // Convert upload/sign URL to public URL if needed
            const publicURL = logoURL.replace('/upload/sign/', '/public/');
            
            const objectStorageService = new ObjectStorageService();
            const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
              publicURL,
              {
                owner: userId,
                visibility: "public",
              }
            );
            business = await storage.updateBusiness(business.id, { logoUrl: objectPath });
          } catch (err) {
            // Continue even if logo upload fails
          }
        }
      }

      // Create tax types if provided
      if (taxTypes && Array.isArray(taxTypes) && taxTypes.length > 0 && business) {
        for (const taxType of taxTypes) {
          try {
            await storage.createTaxType({
              businessId: business.id,
              name: taxType.name,
              rate: taxType.rate.toString(),
              isDefault: taxType.isDefault || false,
            });
          } catch (err) {
            // Continue with other tax types
          }
        }
      }

      res.json({ user, business });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to complete signup" });
    }
  });

  // Business routes
  app.get('/api/business', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      let business = await storage.getBusinessByUserId(userId);
      
      // Auto-create business if it doesn't exist (handles incomplete signup)
      if (!business) {
        const user = await storage.getUser(userId);
        const userName = user?.firstName ? `${user.firstName}'s Business` : 'My Business';
        business = await storage.createBusiness({
          userId,
          businessName: userName,
        });
      }
      
      res.json(business || null);
    } catch (error) {
      console.error("Error fetching business:", error);
      res.status(500).json({ message: "Failed to fetch business" });
    }
  });

  app.post('/api/business', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const existing = await storage.getBusinessByUserId(userId);
      if (existing) {
        return res.status(400).json({ message: "Business already exists" });
      }
      const data = { ...req.body, userId };
      const business = await storage.createBusiness(data);
      res.status(201).json(business);
    } catch (error) {
      console.error("Error creating business:", error);
      res.status(500).json({ message: "Failed to create business" });
    }
  });

  app.patch('/api/business', isAuthenticated, validateBody(updateBusinessSchema), async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const existing = await storage.getBusinessByUserId(userId);
      if (!existing) {
        // Create if doesn't exist
        const data = { ...req.body, userId };
        const business = await storage.createBusiness(data);
        return res.json(business);
      }
      const business = await storage.updateBusiness(existing.id, req.body);
      res.json(business);
    } catch (error) {
      res.status(500).json({ message: "Failed to update business" });
    }
  });

  // Client routes
  app.get('/api/clients', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.json([]);
      }
      const clients = await storage.getClientsByBusinessId(business.id);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.post('/api/clients', isAuthenticated, validateBody(createClientSchema), async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      let business = await storage.getBusinessByUserId(userId);
      if (!business) {
        // Auto-create business
        business = await storage.createBusiness({ userId, businessName: "My Business" });
      }
      const data = { ...req.body, businessId: business.id };
      const client = await storage.createClient(data);
      
      // Log activity
      logActivity(req, ActivityActions.CREATE_CLIENT, {
        entityType: EntityTypes.CLIENT,
        entityId: client.id,
        metadata: {
          clientName: client.name,
          clientEmail: client.email,
        },
      });
      
      res.status(201).json(client);
    } catch (error) {
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  app.patch('/api/clients/:id', isAuthenticated, validateBody(updateClientSchema), async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      const client = await storage.getClient(req.params.id);
      if (!client || client.businessId !== business.id) {
        return res.status(404).json({ message: "Client not found" });
      }
      const updated = await storage.updateClient(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  app.delete('/api/clients/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      const client = await storage.getClient(req.params.id);
      if (!client || client.businessId !== business.id) {
        return res.status(404).json({ message: "Client not found" });
      }
      await storage.deleteClient(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Tax type routes
  app.get('/api/tax-types', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.json([]);
      }
      const taxTypes = await storage.getTaxTypesByBusinessId(business.id);
      res.json(taxTypes);
    } catch (error) {
      console.error("Error fetching tax types:", error);
      res.status(500).json({ message: "Failed to fetch tax types" });
    }
  });

  app.post('/api/tax-types', isAuthenticated, validateBody(createTaxTypeSchema), async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      let business = await storage.getBusinessByUserId(userId);
      if (!business) {
        business = await storage.createBusiness({ userId, businessName: "My Business" });
      }
      
      const rate = parseFloat(req.body.rate);
      if (isNaN(rate) || rate < 0) {
        return res.status(400).json({ message: "Tax rate must be a non-negative number" });
      }
      
      const taxType = await storage.createTaxType({
        ...req.body,
        rate: Math.max(0, rate).toString(),
        businessId: business.id,
      });
      res.status(201).json(taxType);
    } catch (error) {
      res.status(500).json({ message: "Failed to create tax type" });
    }
  });

  app.patch('/api/tax-types/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      const taxType = await storage.getTaxType(req.params.id);
      if (!taxType || taxType.businessId !== business.id) {
        return res.status(404).json({ message: "Tax type not found" });
      }
      
      const updateData = { ...req.body };
      if (req.body.rate !== undefined) {
        const rate = parseFloat(req.body.rate);
        if (isNaN(rate) || rate < 0) {
          return res.status(400).json({ message: "Tax rate must be a non-negative number" });
        }
        updateData.rate = Math.max(0, rate).toString();
      }
      
      const updated = await storage.updateTaxType(req.params.id, updateData);
      res.json(updated);
    } catch (error) {
      console.error("Error updating tax type:", error);
      res.status(500).json({ message: "Failed to update tax type" });
    }
  });

  app.delete('/api/tax-types/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      const taxType = await storage.getTaxType(req.params.id);
      if (!taxType || taxType.businessId !== business.id) {
        return res.status(404).json({ message: "Tax type not found" });
      }
      await storage.deleteTaxType(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting tax type:", error);
      res.status(500).json({ message: "Failed to delete tax type" });
    }
  });

  // Invoice routes
  app.get('/api/invoices/count', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.json({ count: 0 });
      }
      const invoices = await storage.getInvoicesByBusinessId(business.id);
      res.json({ count: invoices.length });
    } catch (error) {
      console.error("Error fetching invoice count:", error);
      res.status(500).json({ message: "Failed to fetch invoice count" });
    }
  });

  app.get('/api/invoices', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.json([]);
      }
      const invoices = await storage.getInvoicesByBusinessId(business.id);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get('/api/invoices/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice || invoice.businessId !== business.id) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  app.post('/api/invoices', isAuthenticated, validateBody(createInvoiceSchema), async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      let business = await storage.getBusinessByUserId(userId);
      if (!business) {
        business = await storage.createBusiness({ userId, businessName: "My Business" });
      }
      
      const invoiceNumber = await storage.getNextInvoiceNumber(business.id);
      const { items, ...invoiceData } = req.body;
      
      // Enforce Pro tier requirement for recurring invoices
      if (invoiceData.isRecurring && business.subscriptionTier !== 'pro') {
        return res.status(403).json({ 
          message: "Recurring invoices require a Pro subscription",
          error: "PRO_FEATURE_REQUIRED"
        });
      }
      
      // Calculate next recurring date if this is a recurring invoice
      let nextRecurringDate = null;
      if (invoiceData.isRecurring && invoiceData.recurringFrequency) {
        nextRecurringDate = calculateNextRecurringDate(
          invoiceData.recurringFrequency,
          invoiceData.recurringEvery || 1,
          invoiceData.recurringDay,
          invoiceData.recurringMonth
        );
      }
      
      // Check subscription usage before creating invoice as 'sent'
      if (invoiceData.status === 'sent') {
        const usage = await storage.getMonthlyInvoiceUsage(business.id);
        if (!usage.canSend && business.subscriptionTier !== 'pro') {
          return res.status(403).json({ 
            message: `You've reached your monthly limit of ${usage.limit} invoices. Upgrade to Pro for unlimited invoices.`,
            error: "INVOICE_LIMIT_REACHED",
            usage
          });
        }
      }
      
      const invoice = await storage.createInvoice(
        { 
          ...invoiceData, 
          businessId: business.id,
          invoiceNumber,
          clientId: invoiceData.clientId || null,
          issueDate: invoiceData.issueDate ? new Date(invoiceData.issueDate) : new Date(),
          dueDate: invoiceData.dueDate ? new Date(invoiceData.dueDate) : new Date(),
          nextRecurringDate,
        },
        items || []
      );
      
      // If invoice is created as 'sent' directly, increment the monthly count
      if (invoice.status === 'sent') {
        await storage.incrementMonthlyInvoiceCount(business.id);
      }
      
      // Log activity
      logActivity(req, ActivityActions.CREATE_INVOICE, {
        entityType: EntityTypes.INVOICE,
        entityId: invoice.id,
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          total: invoice.total,
        },
      });
      
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  app.patch('/api/invoices/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      const existing = await storage.getInvoice(req.params.id);
      if (!existing || existing.businessId !== business.id) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const { items, ...invoiceData } = req.body;
      const updateData = { ...invoiceData };
      if (invoiceData.issueDate) {
        updateData.issueDate = new Date(invoiceData.issueDate);
      }
      if (invoiceData.dueDate) {
        updateData.dueDate = new Date(invoiceData.dueDate);
      }
      
      // Calculate next recurring date if recurring settings changed
      if (invoiceData.isRecurring !== undefined) {
        if (invoiceData.isRecurring && invoiceData.recurringFrequency) {
          updateData.nextRecurringDate = calculateNextRecurringDate(
            invoiceData.recurringFrequency,
            invoiceData.recurringEvery || 1,
            invoiceData.recurringDay,
            invoiceData.recurringMonth
          );
        } else if (!invoiceData.isRecurring) {
          updateData.nextRecurringDate = null;
          updateData.lastRecurringDate = null;
        }
      }
      
      const invoice = await storage.updateInvoice(req.params.id, updateData, items);
      res.json(invoice);
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  app.delete('/api/invoices/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice || invoice.businessId !== business.id) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      await storage.deleteInvoice(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });

  // Get subscription usage
  app.get('/api/subscription/usage', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.json({ 
          tier: 'free',
          count: 0, 
          limit: 5, 
          canSend: true,
          resetDate: null
        });
      }
      
      const usage = await storage.getMonthlyInvoiceUsage(business.id);
      res.json({
        tier: business.subscriptionTier || 'free',
        ...usage
      });
    } catch (error) {
      console.error("Error fetching subscription usage:", error);
      res.status(500).json({ message: "Failed to fetch subscription usage" });
    }
  });

  // ========================================
  // BATCH OPERATIONS - Must be before :id routes!
  // ========================================
  
  // Batch send draft invoices
  app.post('/api/invoices/batch/send', emailLimiter, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Invoice IDs array is required" });
      }

      // Get all invoices and validate ownership
      const invoices = await Promise.all(
        ids.map(id => storage.getInvoice(id))
      );

      // Filter valid invoices (exist, owned by user, and are drafts)
      const validInvoices = invoices.filter(inv => 
        inv && inv.businessId === business.id && inv.status === 'draft'
      );

      if (validInvoices.length === 0) {
        return res.status(400).json({ message: "No valid draft invoices found" });
      }

      // Check subscription usage
      const usage = await storage.getMonthlyInvoiceUsage(business.id);
      const canSendCount = usage.canSend ? Infinity : Math.max(0, usage.limit - usage.count);
      
      if (canSendCount < validInvoices.length && business.subscriptionTier !== 'pro') {
        return res.status(403).json({ 
          message: `Cannot send ${validInvoices.length} invoices. ${canSendCount} remaining in your monthly limit.`,
          error: "INVOICE_LIMIT_REACHED",
          usage
        });
      }

      // Send each invoice
      const results = {
        sent: 0,
        failed: 0,
        errors: [] as any[],
      };

      for (const invoice of validInvoices) {
        try {
          // Generate Stripe payment link if needed
          let stripePaymentLink = invoice.stripePaymentLink;
          let stripeCheckoutId = invoice.stripeCheckoutId;
          
          if ((invoice.paymentMethod === 'stripe' || invoice.paymentMethod === 'both') && !stripePaymentLink) {
            if (process.env.STRIPE_SECRET_KEY && business.stripeAccountId) {
              try {
                const stripe = await getUncachableStripeClient();
                const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
                
                const session = await stripe.checkout.sessions.create({
                  payment_method_types: ['card'],
                  line_items: [{
                    price_data: {
                      currency: business.currency?.toLowerCase() || 'usd',
                      product_data: {
                        name: `Invoice #${invoice.invoiceNumber}`,
                        description: `Payment for Invoice #${invoice.invoiceNumber} from ${business.businessName}`,
                      },
                      unit_amount: Math.round(parseFloat(invoice.total as string) * 100),
                    },
                    quantity: 1,
                  }],
                  mode: 'payment',
                  success_url: `${baseUrl}/pay/${invoice.shareToken}?success=true`,
                  cancel_url: `${baseUrl}/pay/${invoice.shareToken}?canceled=true`,
                  metadata: {
                    invoiceId: invoice.id,
                    invoiceNumber: invoice.invoiceNumber,
                    businessId: business.id,
                  },
                }, {
                  stripeAccount: business.stripeAccountId,
                });
                
                stripePaymentLink = session.url || null;
                stripeCheckoutId = session.id;
              } catch (stripeError) {
                // Continue without payment link
              }
            }
          }

          // Update invoice status
          await storage.updateInvoice(invoice.id, { 
            status: "sent",
            stripePaymentLink,
            stripeCheckoutId,
          });

          // Increment monthly count
          await storage.incrementMonthlyInvoiceCount(business.id);

          // Send email if client has email
          if (invoice.client?.email) {
            try {
              await sendInvoiceEmail({
                invoiceNumber: invoice.invoiceNumber,
                total: invoice.total as string,
                dueDate: invoice.dueDate,
                shareToken: invoice.shareToken,
                businessName: business.businessName || 'Your Business',
                businessEmail: business.email,
                businessLogoUrl: business.logoUrl,
                brandColor: business.brandColor,
                clientName: invoice.client.name,
                clientEmail: invoice.client.email,
                currency: business.currency,
                stripePaymentLink,
                isResend: false,
                sendCopyToOwner: business.sendInvoiceCopy || false,
                ownerCopyEmail: business.invoiceCopyEmail,
                hideBranding: business.hideBranding || false,
              });
            } catch (emailError) {
              // Email failed but invoice was sent
            }
          }

          results.sent++;
        } catch (error: any) {
          results.failed++;
          results.errors.push({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            error: error.message,
          });
        }
      }

      res.json(results);
    } catch (error) {
      console.error("Error batch sending invoices:", error);
      res.status(500).json({ message: "Failed to batch send invoices" });
    }
  });

  // Batch resend invoices (reminders)
  app.post('/api/invoices/batch/resend', emailLimiter, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Invoice IDs array is required" });
      }

      console.log('[Batch Resend] Received IDs:', ids);

      // Get all invoices and validate - handle nulls gracefully
      const invoicePromises = ids.map(async (id) => {
        try {
          const invoice = await storage.getInvoice(id);
          if (!invoice) {
            console.log(`[Batch Resend] Invoice ${id} not found`);
          }
          return invoice;
        } catch (error) {
          console.error(`[Batch Resend] Error fetching invoice ${id}:`, error);
          return null;
        }
      });

      const invoices = await Promise.all(invoicePromises);

      // Separate into reminders (sent/overdue) and receipts (paid)
      const reminderInvoices = invoices.filter(inv => {
        if (!inv) return false;
        if (inv.businessId !== business.id) {
          console.log(`[Batch Resend] Invoice ${inv.id} owned by different business`);
          return false;
        }
        if (inv.status !== 'sent' && inv.status !== 'overdue') return false;
        if (!inv.client?.email) {
          console.log(`[Batch Resend] Invoice ${inv.id} missing client email`);
          return false;
        }
        return true;
      });

      const receiptInvoices = invoices.filter(inv => {
        if (!inv) return false;
        if (inv.businessId !== business.id) return false;
        if (inv.status !== 'paid') return false;
        if (!inv.client?.email) {
          console.log(`[Batch Resend] Invoice ${inv.id} missing client email`);
          return false;
        }
        return true;
      });

      const totalValid = reminderInvoices.length + receiptInvoices.length;

      console.log(`[Batch Resend] Valid invoices: ${totalValid} of ${ids.length} (${reminderInvoices.length} reminders, ${receiptInvoices.length} receipts)`);

      if (totalValid === 0) {
        return res.status(400).json({ message: "No valid invoices found. Only sent/overdue/paid invoices with client emails can be processed." });
      }

      const results = {
        sent: 0,
        receipts: 0,
        skipped: ids.length - totalValid,
        failed: 0,
        errors: [] as any[],
      };

      // Send reminders for sent/overdue invoices
      for (const invoice of reminderInvoices) {
        try {
          console.log(`[Batch Resend] Sending reminder for invoice ${invoice.invoiceNumber}`);
          
          const emailResult = await sendInvoiceEmail({
            invoiceNumber: invoice.invoiceNumber,
            total: invoice.total as string,
            dueDate: invoice.dueDate,
            shareToken: invoice.shareToken,
            businessName: business.businessName || 'Your Business',
            businessEmail: business.email,
            businessLogoUrl: business.logoUrl,
            brandColor: business.brandColor,
            clientName: invoice.client!.name,
            clientEmail: invoice.client!.email!,
            currency: business.currency,
            stripePaymentLink: invoice.stripePaymentLink,
            isResend: true,
            sendCopyToOwner: business.sendInvoiceCopy || false,
            ownerCopyEmail: business.invoiceCopyEmail,
            hideBranding: business.hideBranding || false,
          });

          if (emailResult.success) {
            results.sent++;
            console.log(`[Batch Resend] ✓ Sent reminder for invoice ${invoice.invoiceNumber}`);
          } else {
            results.failed++;
            results.errors.push({
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              error: emailResult.error,
            });
            console.error(`[Batch Resend] ✗ Failed to send reminder for invoice ${invoice.invoiceNumber}:`, emailResult.error);
          }
        } catch (error: any) {
          results.failed++;
          results.errors.push({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            error: error.message,
          });
          console.error(`[Batch Resend] ✗ Exception sending reminder for invoice ${invoice.invoiceNumber}:`, error);
        }
      }

      // Send receipts for paid invoices
      for (const invoice of receiptInvoices) {
        try {
          console.log(`[Batch Resend] Sending receipt for paid invoice ${invoice.invoiceNumber}`);
          
          const emailResult = await sendThankYouEmail({
            invoiceNumber: invoice.invoiceNumber,
            amountPaid: invoice.total as string,
            paidAt: invoice.paidAt || new Date(),
            shareToken: invoice.shareToken,
            businessName: business.businessName || 'Your Business',
            businessEmail: business.email,
            businessLogoUrl: business.logoUrl,
            brandColor: business.brandColor,
            clientName: invoice.client!.name,
            clientEmail: invoice.client!.email!,
            currency: business.currency,
            hideBranding: business.hideBranding || false,
          });

          if (emailResult.success) {
            results.receipts++;
            console.log(`[Batch Resend] ✓ Sent receipt for invoice ${invoice.invoiceNumber}`);
          } else {
            results.failed++;
            results.errors.push({
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              error: emailResult.error,
            });
            console.error(`[Batch Resend] ✗ Failed to send receipt for invoice ${invoice.invoiceNumber}:`, emailResult.error);
          }
        } catch (error: any) {
          results.failed++;
          results.errors.push({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            error: error.message,
          });
          console.error(`[Batch Resend] ✗ Exception sending receipt for invoice ${invoice.invoiceNumber}:`, error);
        }
      }

      console.log(`[Batch Resend] Results: ${results.sent} reminders sent, ${results.receipts} receipts sent, ${results.skipped} skipped, ${results.failed} failed`);

      res.json(results);
    } catch (error) {
      console.error("[Batch Resend] Fatal error:", error);
      res.status(500).json({ message: "Failed to batch resend invoices" });
    }
  });

  // Batch export invoices as combined PDF
  app.post('/api/invoices/batch/export', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Invoice IDs array is required" });
      }

      // Get all invoices and validate ownership
      const invoices = await Promise.all(
        ids.map(id => storage.getInvoice(id))
      );

      const validInvoices = invoices.filter(inv => 
        inv && inv.businessId === business.id
      );

      if (validInvoices.length === 0) {
        return res.status(404).json({ message: "No valid invoices found" });
      }

      // Create combined PDF
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ size: 'A4', margin: 50 });

      res.setHeader('Content-Type', 'application/pdf');
      const today = new Date().toISOString().split('T')[0];
      res.setHeader('Content-Disposition', `attachment; filename=invoices-batch-${today}.pdf`);
      
      doc.pipe(res);

      // Generate each invoice on a new page
      for (let i = 0; i < validInvoices.length; i++) {
        const invoice = validInvoices[i];
        
        if (i > 0) {
          doc.addPage();
        }

        // Generate invoice PDF content
        const invoiceData = await generateInvoicePDFAsync({
          invoice: {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            status: invoice.status,
            issueDate: invoice.issueDate,
            dueDate: invoice.dueDate,
            subtotal: invoice.subtotal,
            taxAmount: invoice.taxAmount || "0",
            discountType: invoice.discountType,
            discountValue: invoice.discountValue,
            discountAmount: invoice.discountAmount || "0",
            total: invoice.total,
            notes: invoice.notes,
            paymentMethod: invoice.paymentMethod,
          },
          items: invoice.items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            lineTotal: item.lineTotal,
          })),
          business: business ? {
            businessName: business.businessName,
            logoUrl: business.logoUrl,
            brandColor: business.brandColor,
            email: business.email,
            phone: business.phone,
            address: business.address,
            taxNumber: business.taxNumber,
            etransferEmail: business.etransferEmail,
            etransferInstructions: business.etransferInstructions,
            currency: business.currency,
            acceptBankTransfer: business.acceptBankTransfer,
            bankAccountName: business.bankAccountName,
            bankName: business.bankName,
            bankAccountNumber: business.bankAccountNumber,
            bankRoutingNumber: business.bankRoutingNumber,
            bankSwiftCode: business.bankSwiftCode,
            bankAddress: business.bankAddress,
            bankInstructions: business.bankInstructions,
            acceptPaypal: business.acceptPaypal,
            paypalEmail: business.paypalEmail,
            acceptVenmo: business.acceptVenmo,
            venmoUsername: business.venmoUsername,
            acceptZelle: business.acceptZelle,
            zelleEmail: business.zelleEmail,
            zellePhone: business.zellePhone,
          } : null,
          client: invoice.client ? {
            name: invoice.client.name,
            email: invoice.client.email,
            phone: invoice.client.phone,
            address: invoice.client.address,
          } : null,
        });

        // PDF generation logic
        const currency = business?.currency || 'USD';
        const brandColor = business?.brandColor || '#1A1A1A';
        
        const formatDate = (date: Date | string): string => {
          return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
        };

        const formatCurrency = (amount: string): string => {
          const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
          const symbol = currency === 'CAD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
          return `${symbol}${numAmount.toFixed(2)}`;
        };

        let yPosition = 50;
        const pageWidth = doc.page.width;
        const marginLeft = 50;
        const marginRight = pageWidth - 50;
        const contentWidth = marginRight - marginLeft;

        // Header
        doc.font('Helvetica-Bold').fontSize(18).fillColor('#000000');
        doc.text(business?.businessName || '', marginLeft, yPosition);
        yPosition += 24;

        // Invoice title and number
        doc.font('Helvetica-Bold').fontSize(28).fillColor(brandColor);
        doc.text('INVOICE', marginLeft, 50, { width: contentWidth, align: 'right' });

        doc.font('Helvetica').fontSize(10).fillColor('#6b7280');
        doc.text(`#${invoice.invoiceNumber}`, marginLeft, 85, { width: contentWidth, align: 'right' });

        // Business contact info
        doc.font('Helvetica').fontSize(9).fillColor('#6b7280');
        if (business?.email) {
          doc.text(business.email, marginLeft, yPosition);
          yPosition += 13;
        }
        if (business?.phone) {
          doc.text(business.phone, marginLeft, yPosition);
          yPosition += 13;
        }

        // Client info
        yPosition = 135;
        if (invoice.client) {
          doc.font('Helvetica-Bold').fontSize(8).fillColor('#6b7280');
          doc.text('Bill To', marginLeft, yPosition);
          yPosition += 14;

          doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000');
          doc.text(invoice.client.name, marginLeft, yPosition);
          yPosition += 14;

          doc.font('Helvetica').fontSize(9).fillColor('#6b7280');
          if (invoice.client.email) {
            doc.text(invoice.client.email, marginLeft, yPosition);
            yPosition += 12;
          }
        }

        // Dates
        let dateY = 135;
        doc.font('Helvetica').fontSize(9).fillColor('#6b7280');
        doc.text('Issue Date:', marginRight - 145, dateY, { width: 65, align: 'right' });
        doc.font('Helvetica-Bold').fillColor('#000000');
        doc.text(formatDate(invoice.issueDate), marginRight - 80, dateY, { width: 80, align: 'right' });
        dateY += 16;

        doc.font('Helvetica').fontSize(9).fillColor('#6b7280');
        doc.text('Due Date:', marginRight - 145, dateY, { width: 65, align: 'right' });
        doc.font('Helvetica-Bold').fillColor('#000000');
        doc.text(formatDate(invoice.dueDate), marginRight - 80, dateY, { width: 80, align: 'right' });

        yPosition = Math.max(yPosition, dateY + 15) + 25;

        // Table header
        const col1 = marginLeft;
        const col2 = marginLeft + contentWidth * 0.5;
        const col3 = marginLeft + contentWidth * 0.67;
        const col4 = marginLeft + contentWidth * 0.83;

        doc.font('Helvetica-Bold').fontSize(8).fillColor(brandColor);
        doc.text('Description', col1, yPosition);
        doc.text('Qty', col2, yPosition, { width: contentWidth * 0.16, align: 'right' });
        doc.text('Rate', col3, yPosition, { width: contentWidth * 0.16, align: 'right' });
        doc.text('Amount', col4, yPosition, { width: contentWidth * 0.17, align: 'right' });
        yPosition += 12;

        doc.lineWidth(1.5).moveTo(marginLeft, yPosition).lineTo(marginRight, yPosition).stroke(brandColor);
        doc.lineWidth(1);
        yPosition += 15;

        // Items
        invoice.items.forEach(item => {
          doc.font('Helvetica').fontSize(10).fillColor('#000000');
          doc.text(item.description, col1, yPosition, { width: contentWidth * 0.48 });
          doc.fillColor('#6b7280');
          doc.text(item.quantity, col2, yPosition, { width: contentWidth * 0.16, align: 'right' });
          doc.text(formatCurrency(item.rate), col3, yPosition, { width: contentWidth * 0.16, align: 'right' });
          doc.font('Helvetica-Bold').fillColor('#000000');
          doc.text(formatCurrency(item.lineTotal), col4, yPosition, { width: contentWidth * 0.17, align: 'right' });
          yPosition += 20;

          doc.moveTo(marginLeft, yPosition).lineTo(marginRight, yPosition).stroke('#e5e7eb');
          yPosition += 15;
        });

        yPosition += 10;

        // Totals
        const totalWidth = 180;
        const totalX = marginRight - totalWidth;

        doc.font('Helvetica').fontSize(10).fillColor('#6b7280').text('Subtotal', totalX, yPosition);
        doc.fillColor('#000000').text(formatCurrency(invoice.subtotal), totalX, yPosition, { width: totalWidth, align: 'right' });
        yPosition += 16;

        doc.font('Helvetica').fontSize(10).fillColor('#6b7280').text('Tax', totalX, yPosition);
        doc.fillColor('#000000').text(formatCurrency(invoice.taxAmount || "0"), totalX, yPosition, { width: totalWidth, align: 'right' });
        yPosition += 18;

        doc.moveTo(totalX, yPosition).lineTo(marginRight, yPosition).stroke('#e5e7eb');
        yPosition += 12;

        doc.font('Helvetica-Bold').fontSize(16).fillColor('#000000');
        doc.text('Total', totalX, yPosition);
        doc.fillColor(brandColor);
        doc.text(formatCurrency(invoice.total), totalX, yPosition, { width: totalWidth, align: 'right' });
      }

      doc.end();
    } catch (error) {
      console.error("Error batch exporting invoices:", error);
      res.status(500).json({ message: "Failed to batch export invoices" });
    }
  });

  // ========================================
  // SINGLE INVOICE OPERATIONS (with :id params)
  // ========================================

  app.post('/api/invoices/:id/send', emailLimiter, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice || invoice.businessId !== business.id) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Check if this is a new send (not already sent) and enforce free tier limit
      if (invoice.status === 'draft') {
        const usage = await storage.getMonthlyInvoiceUsage(business.id);
        if (!usage.canSend) {
          return res.status(403).json({ 
            message: "Monthly invoice limit reached",
            error: "INVOICE_LIMIT_REACHED",
            usage: {
              count: usage.count,
              limit: usage.limit,
              resetDate: usage.resetDate
            }
          });
        }
      }
      
      let stripePaymentLink = invoice.stripePaymentLink;
      let stripeCheckoutId = invoice.stripeCheckoutId;
      
      if ((invoice.paymentMethod === 'stripe' || invoice.paymentMethod === 'both') && !stripePaymentLink) {
        // Check if Stripe is configured and business has connected account
        if (!process.env.STRIPE_SECRET_KEY) {
          // Stripe not configured - skip payment link
        } else if (!business.stripeAccountId) {
          // Business has not connected Stripe account - skip payment link
        } else {
          try {
            const stripe = await getUncachableStripeClient();
            const baseUrl = process.env.BASE_URL || (req.protocol + '://' + req.get('host'));
            
            // Create checkout session on the connected account (payments go to the business)
            const session = await stripe.checkout.sessions.create({
              payment_method_types: ['card'],
              line_items: [{
                price_data: {
                  currency: business.currency?.toLowerCase() || 'usd',
                  product_data: {
                    name: `Invoice #${invoice.invoiceNumber}`,
                    description: `Payment for Invoice #${invoice.invoiceNumber} from ${business.businessName}`,
                  },
                  unit_amount: Math.round(parseFloat(invoice.total as string) * 100),
                },
                quantity: 1,
              }],
              mode: 'payment',
              success_url: `${baseUrl}/pay/${invoice.shareToken}?success=true`,
              cancel_url: `${baseUrl}/pay/${invoice.shareToken}?canceled=true`,
              metadata: {
                invoiceId: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                businessId: business.id,
              },
            }, {
              stripeAccount: business.stripeAccountId, // Payments go to the business's Stripe account
            });
            
            stripePaymentLink = session.url || null;
            stripeCheckoutId = session.id;
          } catch (stripeError) {
            // Stripe checkout session creation failed - continue without payment link
          }
        }
      }
      
      // Check subscription usage before allowing send
      const usage = await storage.getMonthlyInvoiceUsage(business.id);
      if (!usage.canSend && business.subscriptionTier !== 'pro') {
        return res.status(403).json({ 
          message: `You've reached your monthly limit of ${usage.limit} invoices. Upgrade to Pro for unlimited invoices.`,
          error: "INVOICE_LIMIT_REACHED",
          usage
        });
      }
      
      // Increment monthly invoice count when sending an invoice
      // Only increment if this is the first time sending (status was draft)
      // This prevents double-counting on resends
      if (invoice.status === 'draft') {
        await storage.incrementMonthlyInvoiceCount(business.id);
      }
      
      const updated = await storage.updateInvoice(req.params.id, { 
        status: "sent",
        stripePaymentLink,
        stripeCheckoutId,
      });
      
      // Send email to client if they have an email address
      if (invoice.client?.email) {
        try {
          await sendInvoiceEmail({
            invoiceNumber: invoice.invoiceNumber,
            total: invoice.total as string,
            dueDate: invoice.dueDate,
            shareToken: invoice.shareToken,
            businessName: business.businessName || 'Your Business',
            businessEmail: business.email,
            businessLogoUrl: business.logoUrl,
            brandColor: business.brandColor,
            clientName: invoice.client.name,
            clientEmail: invoice.client.email,
            currency: business.currency,
            stripePaymentLink,
            isResend: false,
            sendCopyToOwner: business.sendInvoiceCopy || false,
            ownerCopyEmail: business.invoiceCopyEmail,
            hideBranding: business.hideBranding || false,
          });
        } catch (emailError) {
          // Email sending failed - don't fail the request
        }
      }
      
      // Log activity
      logActivity(req, ActivityActions.SEND_INVOICE, {
        entityType: EntityTypes.INVOICE,
        entityId: invoice.id,
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          total: invoice.total,
          clientName: invoice.client?.name,
          clientEmail: invoice.client?.email,
        },
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error sending invoice:", error);
      res.status(500).json({ message: "Failed to send invoice" });
    }
  });

  app.post('/api/invoices/:id/resend', emailLimiter, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice || invoice.businessId !== business.id) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      if (invoice.status !== "sent" && invoice.status !== "overdue") {
        return res.status(400).json({ message: "Can only resend sent or overdue invoices" });
      }
      
      // Check if client has email address
      if (!invoice.client?.email) {
        return res.status(400).json({ message: "Cannot resend invoice - client has no email address" });
      }
      
      // Send reminder email to client
      try {
        const emailResult = await sendInvoiceEmail({
          invoiceNumber: invoice.invoiceNumber,
          total: invoice.total as string,
          dueDate: invoice.dueDate,
          shareToken: invoice.shareToken,
          businessName: business.businessName || 'Your Business',
          businessEmail: business.email,
          businessLogoUrl: business.logoUrl,
          brandColor: business.brandColor,
          clientName: invoice.client.name,
          clientEmail: invoice.client.email,
          currency: business.currency,
          stripePaymentLink: invoice.stripePaymentLink,
          isResend: true,
          sendCopyToOwner: business.sendInvoiceCopy || false,
          ownerCopyEmail: business.invoiceCopyEmail,
          hideBranding: business.hideBranding || false,
        });
        
        if (!emailResult.success) {
          return res.status(500).json({ 
            message: "Failed to send email", 
            error: emailResult.error 
          });
        }
        
        res.json({ message: "Invoice resent successfully", invoice });
      } catch (emailError: any) {
        return res.status(500).json({ 
          message: "Failed to send email", 
          error: emailError.message 
        });
      }
    } catch (error) {
      console.error("Error resending invoice:", error);
      res.status(500).json({ message: "Failed to resend invoice" });
    }
  });

  app.patch('/api/invoices/:id/mark-paid', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice || invoice.businessId !== business.id) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Check if invoice was not already paid (for thank you email logic)
      const wasAlreadyPaid = invoice.status === "paid";
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Invoice IDs array is required" });
      }

      // Get all invoices and validate ownership
      const invoices = await Promise.all(
        ids.map(id => storage.getInvoice(id))
      );

      // Filter valid invoices (exist, owned by user, and are drafts)
      const validInvoices = invoices.filter(inv => 
        inv && inv.businessId === business.id && inv.status === 'draft'
      );

      if (validInvoices.length === 0) {
        return res.status(400).json({ message: "No valid draft invoices found" });
      }

      // Check subscription usage
      const usage = await storage.getMonthlyInvoiceUsage(business.id);
      const canSendCount = usage.canSend ? Infinity : Math.max(0, usage.limit - usage.count);
      
      if (canSendCount < validInvoices.length && business.subscriptionTier !== 'pro') {
        return res.status(403).json({ 
          message: `Cannot send ${validInvoices.length} invoices. ${canSendCount} remaining in your monthly limit.`,
          error: "INVOICE_LIMIT_REACHED",
          usage
        });
      }

      // Send each invoice
      const results = {
        sent: 0,
        failed: 0,
        errors: [] as any[],
      };

      for (const invoice of validInvoices) {
        try {
          // Generate Stripe payment link if needed
          let stripePaymentLink = invoice.stripePaymentLink;
          let stripeCheckoutId = invoice.stripeCheckoutId;
          
          if ((invoice.paymentMethod === 'stripe' || invoice.paymentMethod === 'both') && !stripePaymentLink) {
            if (process.env.STRIPE_SECRET_KEY && business.stripeAccountId) {
              try {
                const stripe = await getUncachableStripeClient();
                const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
                
                const session = await stripe.checkout.sessions.create({
                  payment_method_types: ['card'],
                  line_items: [{
                    price_data: {
                      currency: business.currency?.toLowerCase() || 'usd',
                      product_data: {
                        name: `Invoice #${invoice.invoiceNumber}`,
                        description: `Payment for Invoice #${invoice.invoiceNumber} from ${business.businessName}`,
                      },
                      unit_amount: Math.round(parseFloat(invoice.total as string) * 100),
                    },
                    quantity: 1,
                  }],
                  mode: 'payment',
                  success_url: `${baseUrl}/pay/${invoice.shareToken}?success=true`,
                  cancel_url: `${baseUrl}/pay/${invoice.shareToken}?canceled=true`,
                  metadata: {
                    invoiceId: invoice.id,
                    invoiceNumber: invoice.invoiceNumber,
                    businessId: business.id,
                  },
                }, {
                  stripeAccount: business.stripeAccountId,
                });
                
                stripePaymentLink = session.url || null;
                stripeCheckoutId = session.id;
              } catch (stripeError) {
                // Continue without payment link
              }
            }
          }

          // Update invoice status
          await storage.updateInvoice(invoice.id, { 
            status: "sent",
            stripePaymentLink,
            stripeCheckoutId,
          });

          // Increment monthly count
          await storage.incrementMonthlyInvoiceCount(business.id);

          // Send email if client has email
          if (invoice.client?.email) {
            try {
              await sendInvoiceEmail({
                invoiceNumber: invoice.invoiceNumber,
                total: invoice.total as string,
                dueDate: invoice.dueDate,
                shareToken: invoice.shareToken,
                businessName: business.businessName || 'Your Business',
                businessEmail: business.email,
                businessLogoUrl: business.logoUrl,
                brandColor: business.brandColor,
                clientName: invoice.client.name,
                clientEmail: invoice.client.email,
                currency: business.currency,
                stripePaymentLink,
                isResend: false,
                sendCopyToOwner: business.sendInvoiceCopy || false,
                ownerCopyEmail: business.invoiceCopyEmail,
                hideBranding: business.hideBranding || false,
              });
            } catch (emailError) {
              // Email failed but invoice was sent
            }
          }

          results.sent++;
        } catch (error: any) {
          results.failed++;
          results.errors.push({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            error: error.message,
          });
        }
      }

      res.json(results);
    } catch (error) {
      console.error("Error batch sending invoices:", error);
      res.status(500).json({ message: "Failed to batch send invoices" });
    }
  });

  // Batch resend invoices (reminders)
  app.post('/api/invoices/batch/resend', emailLimiter, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Invoice IDs array is required" });
      }

      console.log('[Batch Resend] Received IDs:', ids);

      // Get all invoices and validate - handle nulls gracefully
      const invoicePromises = ids.map(async (id) => {
        try {
          const invoice = await storage.getInvoice(id);
          if (!invoice) {
            console.log(`[Batch Resend] Invoice ${id} not found`);
          }
          return invoice;
        } catch (error) {
          console.error(`[Batch Resend] Error fetching invoice ${id}:`, error);
          return null;
        }
      });

      const invoices = await Promise.all(invoicePromises);

      // Separate into reminders (sent/overdue) and receipts (paid)
      const reminderInvoices = invoices.filter(inv => {
        if (!inv) return false;
        if (inv.businessId !== business.id) {
          console.log(`[Batch Resend] Invoice ${inv.id} owned by different business`);
          return false;
        }
        if (inv.status !== 'sent' && inv.status !== 'overdue') return false;
        if (!inv.client?.email) {
          console.log(`[Batch Resend] Invoice ${inv.id} missing client email`);
          return false;
        }
        return true;
      });

      const receiptInvoices = invoices.filter(inv => {
        if (!inv) return false;
        if (inv.businessId !== business.id) return false;
        if (inv.status !== 'paid') return false;
        if (!inv.client?.email) {
          console.log(`[Batch Resend] Invoice ${inv.id} missing client email`);
          return false;
        }
        return true;
      });

      const totalValid = reminderInvoices.length + receiptInvoices.length;

      console.log(`[Batch Resend] Valid invoices: ${totalValid} of ${ids.length} (${reminderInvoices.length} reminders, ${receiptInvoices.length} receipts)`);

      if (totalValid === 0) {
        return res.status(400).json({ message: "No valid invoices found. Only sent/overdue/paid invoices with client emails can be processed." });
      }

      const results = {
        sent: 0,
        receipts: 0,
        skipped: ids.length - totalValid,
        failed: 0,
        errors: [] as any[],
      };

      // Send reminders for sent/overdue invoices
      for (const invoice of reminderInvoices) {
        try {
          console.log(`[Batch Resend] Sending reminder for invoice ${invoice.invoiceNumber}`);
          
          const emailResult = await sendInvoiceEmail({
            invoiceNumber: invoice.invoiceNumber,
            total: invoice.total as string,
            dueDate: invoice.dueDate,
            shareToken: invoice.shareToken,
            businessName: business.businessName || 'Your Business',
            businessEmail: business.email,
            businessLogoUrl: business.logoUrl,
            brandColor: business.brandColor,
            clientName: invoice.client!.name,
            clientEmail: invoice.client!.email!,
            currency: business.currency,
            stripePaymentLink: invoice.stripePaymentLink,
            isResend: true,
            sendCopyToOwner: business.sendInvoiceCopy || false,
            ownerCopyEmail: business.invoiceCopyEmail,
            hideBranding: business.hideBranding || false,
          });

          if (emailResult.success) {
            results.sent++;
            console.log(`[Batch Resend] ✓ Sent reminder for invoice ${invoice.invoiceNumber}`);
          } else {
            results.failed++;
            results.errors.push({
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              error: emailResult.error,
            });
            console.error(`[Batch Resend] ✗ Failed to send reminder for invoice ${invoice.invoiceNumber}:`, emailResult.error);
          }
        } catch (error: any) {
          results.failed++;
          results.errors.push({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            error: error.message,
          });
          console.error(`[Batch Resend] ✗ Exception sending reminder for invoice ${invoice.invoiceNumber}:`, error);
        }
      }

      // Send receipts for paid invoices
      for (const invoice of receiptInvoices) {
        try {
          console.log(`[Batch Resend] Sending receipt for paid invoice ${invoice.invoiceNumber}`);
          
          const emailResult = await sendThankYouEmail({
            invoiceNumber: invoice.invoiceNumber,
            amountPaid: invoice.total as string,
            paidAt: invoice.paidAt || new Date(),
            shareToken: invoice.shareToken,
            businessName: business.businessName || 'Your Business',
            businessEmail: business.email,
            businessLogoUrl: business.logoUrl,
            brandColor: business.brandColor,
            clientName: invoice.client!.name,
            clientEmail: invoice.client!.email!,
            currency: business.currency,
            hideBranding: business.hideBranding || false,
          });

          if (emailResult.success) {
            results.receipts++;
            console.log(`[Batch Resend] ✓ Sent receipt for invoice ${invoice.invoiceNumber}`);
          } else {
            results.failed++;
            results.errors.push({
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              error: emailResult.error,
            });
            console.error(`[Batch Resend] ✗ Failed to send receipt for invoice ${invoice.invoiceNumber}:`, emailResult.error);
          }
        } catch (error: any) {
          results.failed++;
          results.errors.push({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            error: error.message,
          });
          console.error(`[Batch Resend] ✗ Exception sending receipt for invoice ${invoice.invoiceNumber}:`, error);
        }
      }

      console.log(`[Batch Resend] Results: ${results.sent} reminders sent, ${results.receipts} receipts sent, ${results.skipped} skipped, ${results.failed} failed`);

      res.json(results);
    } catch (error) {
      console.error("[Batch Resend] Fatal error:", error);
      res.status(500).json({ message: "Failed to batch resend invoices" });
    }
  });

  // Batch export invoices as combined PDF
  app.post('/api/invoices/batch/export', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Invoice IDs array is required" });
      }

      // Get all invoices and validate ownership
      const invoices = await Promise.all(
        ids.map(id => storage.getInvoice(id))
      );

      const validInvoices = invoices.filter(inv => 
        inv && inv.businessId === business.id
      );

      if (validInvoices.length === 0) {
        return res.status(404).json({ message: "No valid invoices found" });
      }

      // Create combined PDF
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ size: 'A4', margin: 50 });

      res.setHeader('Content-Type', 'application/pdf');
      const today = new Date().toISOString().split('T')[0];
      res.setHeader('Content-Disposition', `attachment; filename=invoices-batch-${today}.pdf`);
      
      doc.pipe(res);

      // Generate each invoice on a new page
      for (let i = 0; i < validInvoices.length; i++) {
        const invoice = validInvoices[i];
        
        if (i > 0) {
          doc.addPage();
        }

        // Generate invoice using existing async PDF generator
        const invoicePDF = await generateInvoicePDFAsync({
          invoice: {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            status: invoice.status,
            issueDate: invoice.issueDate,
            dueDate: invoice.dueDate,
            subtotal: invoice.subtotal as string,
            taxAmount: (invoice.taxAmount || '0') as string,
            discountType: invoice.discountType,
            discountValue: invoice.discountValue as string,
            discountAmount: (invoice.discountAmount || '0') as string,
            total: invoice.total as string,
            notes: invoice.notes,
            paymentMethod: invoice.paymentMethod,
          },
          items: invoice.items.map(item => ({
            description: item.description,
            quantity: item.quantity as string,
            rate: item.rate as string,
            lineTotal: item.lineTotal as string,
          })),
          business: business ? {
            businessName: business.businessName,
            logoUrl: business.logoUrl,
            brandColor: business.brandColor,
            email: business.email,
            phone: business.phone,
            address: business.address,
            taxNumber: business.taxNumber,
            etransferEmail: business.etransferEmail,
            etransferInstructions: business.etransferInstructions,
            currency: business.currency,
            acceptBankTransfer: business.acceptBankTransfer,
            bankAccountName: business.bankAccountName,
            bankName: business.bankName,
            bankAccountNumber: business.bankAccountNumber,
            bankRoutingNumber: business.bankRoutingNumber,
            bankSwiftCode: business.bankSwiftCode,
            bankAddress: business.bankAddress,
            bankInstructions: business.bankInstructions,
            acceptPaypal: business.acceptPaypal,
            paypalEmail: business.paypalEmail,
            acceptVenmo: business.acceptVenmo,
            venmoUsername: business.venmoUsername,
            acceptZelle: business.acceptZelle,
            zelleEmail: business.zelleEmail,
            zellePhone: business.zellePhone,
          } : null,
          client: invoice.client ? {
            name: invoice.client.name,
            email: invoice.client.email,
            phone: invoice.client.phone,
            address: invoice.client.address,
          } : null,
        });

        // Since we can't easily merge PDFKit documents, we'll render each invoice
        // separately in the same document. For now, we'll use a simpler approach
        // by manually drawing the content
        const currency = business?.currency || 'USD';
        const brandColor = business?.brandColor || '#1A1A1A';
        
        const formatDate = (date: Date) => {
          return new Date(date).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          });
        };

        const formatCurrency = (amount: string | number) => {
          const num = typeof amount === 'string' ? parseFloat(amount) : amount;
          const symbol = currency === 'CAD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
          return `${symbol}${num.toFixed(2)}`;
        };

        let yPos = 50;
        const pageWidth = doc.page.width;
        const marginLeft = 50;
        const marginRight = pageWidth - 50;
        const contentWidth = marginRight - marginLeft;

        // Header
        doc.font('Helvetica-Bold').fontSize(18).fillColor('#000000');
        doc.text(business?.businessName || '', marginLeft, yPos);
        yPos += 24;

        doc.font('Helvetica-Bold').fontSize(28).fillColor(brandColor);
        doc.text('INVOICE', marginLeft, 50, { width: contentWidth, align: 'right' });
        doc.font('Helvetica').fontSize(10).fillColor('#6b7280');
        doc.text(`#${invoice.invoiceNumber}`, marginLeft, 85, { width: contentWidth, align: 'right' });

        doc.font('Helvetica').fontSize(9).fillColor('#6b7280');
        if (business?.email) { doc.text(business.email, marginLeft, yPos); yPos += 13; }
        if (business?.phone) { doc.text(business.phone, marginLeft, yPos); yPos += 13; }
        
        yPos = 135;

        // Bill To
        if (invoice.client) {
          doc.font('Helvetica-Bold').fontSize(8).fillColor('#6b7280');
          doc.text('Bill To', marginLeft, yPos);
          yPos += 14;
          doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000');
          doc.text(invoice.client.name, marginLeft, yPos);
          yPos += 14;
          doc.font('Helvetica').fontSize(9).fillColor('#6b7280');
          if (invoice.client.email) { doc.text(invoice.client.email, marginLeft, yPos); yPos += 12; }
        }

        // Dates
        let dateY = 135;
        doc.font('Helvetica').fontSize(9).fillColor('#6b7280');
        doc.text('Issue Date:', marginRight - 145, dateY, { width: 65, align: 'right' });
        doc.font('Helvetica-Bold').fillColor('#000000');
        doc.text(formatDate(invoice.issueDate), marginRight - 80, dateY, { width: 80, align: 'right' });
        dateY += 16;
        doc.font('Helvetica').fontSize(9).fillColor('#6b7280');
        doc.text('Due Date:', marginRight - 145, dateY, { width: 65, align: 'right' });
        doc.font('Helvetica-Bold').fillColor('#000000');
        doc.text(formatDate(invoice.dueDate), marginRight - 80, dateY, { width: 80, align: 'right' });

        yPos = Math.max(yPos, dateY + 15) + 25;

        // Items table
        const colDesc = marginLeft;
        const colQty = marginLeft + (contentWidth * 0.5);
        const colRate = marginLeft + (contentWidth * 0.67);
        const colAmount = marginLeft + (contentWidth * 0.83);

        doc.font('Helvetica-Bold').fontSize(8).fillColor(brandColor);
        doc.text('Description', colDesc, yPos);
        doc.text('Qty', colQty, yPos, { width: contentWidth * 0.16, align: 'right' });
        doc.text('Rate', colRate, yPos, { width: contentWidth * 0.16, align: 'right' });
        doc.text('Amount', colAmount, yPos, { width: contentWidth * 0.17, align: 'right' });
        yPos += 12;
        doc.lineWidth(1.5).moveTo(marginLeft, yPos).lineTo(marginRight, yPos).stroke(brandColor);
        doc.lineWidth(1);
        yPos += 15;

        invoice.items.forEach((item) => {
          doc.font('Helvetica').fontSize(10).fillColor('#000000');
          doc.text(item.description, colDesc, yPos, { width: contentWidth * 0.48 });
          doc.fillColor('#6b7280');
          doc.text(item.quantity as string, colQty, yPos, { width: contentWidth * 0.16, align: 'right' });
          doc.text(formatCurrency(item.rate as string), colRate, yPos, { width: contentWidth * 0.16, align: 'right' });
          doc.font('Helvetica-Bold').fillColor('#000000');
          doc.text(formatCurrency(item.lineTotal as string), colAmount, yPos, { width: contentWidth * 0.17, align: 'right' });
          yPos += 20;
          doc.moveTo(marginLeft, yPos).lineTo(marginRight, yPos).stroke('#e5e7eb');
          yPos += 15;
        });

        yPos += 10;
        const totalsWidth = 180;
        const totalsLeft = marginRight - totalsWidth;

        // Totals
        doc.font('Helvetica').fontSize(10).fillColor('#6b7280').text('Subtotal', totalsLeft, yPos);
        doc.fillColor('#000000').text(formatCurrency(invoice.subtotal as string), totalsLeft, yPos, { width: totalsWidth, align: 'right' });
        yPos += 16;
        doc.font('Helvetica').fontSize(10).fillColor('#6b7280').text('Tax', totalsLeft, yPos);
        doc.fillColor('#000000').text(formatCurrency(invoice.taxAmount as string || '0'), totalsLeft, yPos, { width: totalsWidth, align: 'right' });
        yPos += 18;
        doc.moveTo(totalsLeft, yPos).lineTo(marginRight, yPos).stroke('#e5e7eb');
        yPos += 12;
        doc.font('Helvetica-Bold').fontSize(16).fillColor('#000000');
        doc.text('Total', totalsLeft, yPos);
        doc.fillColor(brandColor);
        doc.text(formatCurrency(invoice.total as string), totalsLeft, yPos, { width: totalsWidth, align: 'right' });
      }

      doc.end();
    } catch (error) {
      console.error("Error batch exporting invoices:", error);
      res.status(500).json({ message: "Failed to batch export invoices" });
    }
  });

  app.patch('/api/invoices/:id/mark-paid', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice || invoice.businessId !== business.id) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Check if invoice was not already paid (for thank you email logic)
      const wasAlreadyPaid = invoice.status === "paid";
      
      // Calculate remaining balance and record as full payment
      const total = parseFloat(invoice.total as string) || 0;
      const amountPaid = parseFloat(invoice.amountPaid as string) || 0;
      const remainingBalance = total - amountPaid;
      
      let resultInvoice;
      if (remainingBalance > 0) {
        // Record a payment for the remaining balance
        const { invoice: updatedInvoice } = await storage.recordPayment(
          req.params.id,
          remainingBalance.toFixed(2),
          "manual",
          "Marked as paid"
        );
        resultInvoice = updatedInvoice;
      } else {
        // Already fully paid
        resultInvoice = await storage.updateInvoice(req.params.id, { 
          status: "paid",
          paidAt: new Date(),
        });
      }
      
      // Send thank you email if enabled and invoice just became paid
      if (!wasAlreadyPaid && 
          (business as any).thankYouEnabled && 
          business.subscriptionTier === 'pro' && 
          invoice.client?.email) {
        try {
          const emailResult = await sendThankYouEmail({
            invoiceNumber: invoice.invoiceNumber,
            amountPaid: invoice.total as string,
            paidAt: new Date(),
            shareToken: invoice.shareToken,
            businessName: business.businessName,
            businessEmail: business.email,
            businessLogoUrl: business.logoUrl,
            brandColor: business.brandColor,
            clientName: invoice.client.name,
            clientEmail: invoice.client.email,
            currency: business.currency,
            customMessage: (business as any).thankYouMessage,
            hideBranding: business.hideBranding || false,
          });
          
          // Record when thank you email was sent
          if (emailResult.success) {
            await storage.updateInvoice(req.params.id, { thankYouSentAt: new Date() });
          }
        } catch (emailError) {
          // Email sending failed - don't fail the request
          console.error("Failed to send thank you email:", emailError);
        }
      }
      
      // Re-fetch invoice to include thankYouSentAt if it was updated
      const finalInvoice = await storage.getInvoice(req.params.id);
      
      // Log activity
      logActivity(req, ActivityActions.RECORD_PAYMENT, {
        entityType: EntityTypes.PAYMENT,
        entityId: payment.id,
        metadata: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          amount: paymentAmount,
          paymentMethod,
          newStatus: updatedInvoice.status,
        },
      });
      
      res.json(finalInvoice);
    } catch (error) {
      console.error("Error marking invoice as paid:", error);
      res.status(500).json({ message: "Failed to mark invoice as paid" });
    }
  });

  // Record a payment for an invoice (supports partial payments)
  app.post('/api/invoices/:id/payments', isAuthenticated, validateBody(recordPaymentSchema), async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice || invoice.businessId !== business.id) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Check if invoice was not already paid (for thank you email logic)
      const wasAlreadyPaid = invoice.status === "paid";
      
      const { amount, paymentMethod, notes } = req.body;
      
      // Validate amount
      const paymentAmount = parseFloat(amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        return res.status(400).json({ message: "Payment amount must be a positive number" });
      }
      
      // Calculate remaining balance
      const total = parseFloat(invoice.total as string) || 0;
      const amountPaid = parseFloat(invoice.amountPaid as string) || 0;
      const remainingBalance = total - amountPaid;
      
      if (paymentAmount > remainingBalance + 0.01) { // Small tolerance for rounding
        return res.status(400).json({ 
          message: `Payment amount cannot exceed remaining balance of ${remainingBalance.toFixed(2)}` 
        });
      }
      
      // Record the payment
      const { payment, invoice: updatedInvoice } = await storage.recordPayment(
        req.params.id,
        paymentAmount.toFixed(2),
        paymentMethod,
        notes
      );
      
      // Get the updated invoice with all relations
      const fullInvoice = await storage.getInvoice(req.params.id);
      
      // Send thank you email if invoice just became fully paid
      if (!wasAlreadyPaid && 
          fullInvoice?.status === "paid" &&
          (business as any).thankYouEnabled && 
          business.subscriptionTier === 'pro' && 
          invoice.client?.email) {
        try {
          const emailResult = await sendThankYouEmail({
            invoiceNumber: invoice.invoiceNumber,
            amountPaid: invoice.total as string,
            paidAt: new Date(),
            shareToken: invoice.shareToken,
            businessName: business.businessName,
            businessEmail: business.email,
            businessLogoUrl: business.logoUrl,
            brandColor: business.brandColor,
            clientName: invoice.client.name,
            clientEmail: invoice.client.email,
            currency: business.currency,
            customMessage: (business as any).thankYouMessage,
            hideBranding: business.hideBranding || false,
          });
          
          // Record when thank you email was sent
          if (emailResult.success) {
            await storage.updateInvoice(req.params.id, { thankYouSentAt: new Date() });
          }
        } catch (emailError) {
          // Email sending failed - don't fail the request
          console.error("Failed to send thank you email:", emailError);
        }
      }
      
      // Re-fetch invoice to include thankYouSentAt if it was updated
      const finalInvoice = await storage.getInvoice(req.params.id);
      res.status(201).json({ payment, invoice: finalInvoice });
    } catch (error) {
      console.error("Error recording payment:", error);
      res.status(500).json({ message: "Failed to record payment" });
    }
  });

  // Get payments for an invoice
  app.get('/api/invoices/:id/payments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice || invoice.businessId !== business.id) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const payments = await storage.getPaymentsByInvoiceId(req.params.id);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.json({
          totalPaid: 0,
          totalUnpaid: 0,
          totalOverdue: 0,
          recentInvoices: [],
        });
      }
      const stats = await storage.getDashboardStats(business.id);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Saved items
  app.get('/api/saved-items', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.json([]);
      }
      const items = await storage.getSavedItemsByBusinessId(business.id);
      res.json(items);
    } catch (error) {
      console.error("Error fetching saved items:", error);
      res.status(500).json({ message: "Failed to fetch saved items" });
    }
  });

  app.post('/api/saved-items', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      const item = await storage.createSavedItem({ ...req.body, businessId: business.id });
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating saved item:", error);
      res.status(500).json({ message: "Failed to create saved item" });
    }
  });

  // Public invoice view (for payment links)
  app.get('/api/public/invoices/:token', publicLimiter, async (req, res) => {
    try {
      const invoice = await storage.getInvoiceByShareToken(req.params.token);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      let stripePaymentLink = invoice.stripePaymentLink;
      
      // Generate Stripe payment link on-the-fly if needed
      if (!stripePaymentLink && 
          invoice.status !== 'paid' &&
          invoice.business?.acceptCard &&
          invoice.business?.stripeAccountId &&
          (invoice.paymentMethod === 'stripe' || invoice.paymentMethod === 'both') &&
          process.env.STRIPE_SECRET_KEY) {
        try {
          const stripe = await getUncachableStripeClient();
          const baseUrl = process.env.BASE_URL || (req.protocol + '://' + req.get('host'));
          
          // Create checkout session on the connected account (payments go to the business)
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
              price_data: {
                currency: invoice.business.currency?.toLowerCase() || 'usd',
                product_data: {
                  name: `Invoice #${invoice.invoiceNumber}`,
                  description: `Payment for Invoice #${invoice.invoiceNumber} from ${invoice.business.businessName}`,
                },
                unit_amount: Math.round(parseFloat(invoice.total as string) * 100),
              },
              quantity: 1,
            }],
            mode: 'payment',
            success_url: `${baseUrl}/pay/${invoice.shareToken}?success=true`,
            cancel_url: `${baseUrl}/pay/${invoice.shareToken}?canceled=true`,
            metadata: {
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              businessId: invoice.businessId,
            },
          }, {
            stripeAccount: invoice.business.stripeAccountId, // Payments go to the business's Stripe account
          });
          
          stripePaymentLink = session.url || null;
          
          // Save the payment link to the invoice for future use
          if (stripePaymentLink) {
            await storage.updateInvoice(invoice.id, { 
              stripePaymentLink,
              stripeCheckoutId: session.id,
            });
          }
        } catch (stripeError) {
          console.error("Error creating Stripe checkout session on-the-fly:", stripeError);
        }
      }
      
      // Return sanitized data for public view
      res.json({
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          subtotal: invoice.subtotal,
          taxAmount: invoice.taxAmount,
          discountType: invoice.discountType,
          discountValue: invoice.discountValue,
          discountAmount: invoice.discountAmount,
          total: invoice.total,
          amountPaid: invoice.amountPaid,
          notes: invoice.notes,
          paymentMethod: invoice.paymentMethod,
          paymentMethods: invoice.paymentMethods,
          createdAt: invoice.createdAt,
          paidAt: invoice.paidAt,
          items: invoice.items.map(item => ({
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            lineTotal: item.lineTotal,
          })),
          payments: invoice.payments?.map(payment => ({
            id: payment.id,
            amount: payment.amount,
            status: payment.status,
            paymentMethod: payment.paymentMethod,
            notes: payment.notes,
            createdAt: payment.createdAt,
          })) || [],
        },
        business: invoice.business ? {
          businessName: invoice.business.businessName,
          logoUrl: invoice.business.logoUrl,
          brandColor: invoice.business.brandColor,
          email: invoice.business.email,
          phone: invoice.business.phone,
          address: invoice.business.address,
          taxNumber: invoice.business.taxNumber,
          etransferEmail: invoice.business.etransferEmail,
          etransferInstructions: invoice.business.etransferInstructions,
          // Bank Transfer fields
          acceptBankTransfer: invoice.business.acceptBankTransfer,
          bankAccountName: invoice.business.bankAccountName,
          bankName: invoice.business.bankName,
          bankAccountNumber: invoice.business.bankAccountNumber,
          bankRoutingNumber: invoice.business.bankRoutingNumber,
          bankSwiftCode: invoice.business.bankSwiftCode,
          bankAddress: invoice.business.bankAddress,
          bankInstructions: invoice.business.bankInstructions,
          // PayPal fields
          acceptPaypal: invoice.business.acceptPaypal,
          paypalEmail: invoice.business.paypalEmail,
          // Venmo fields
          acceptVenmo: invoice.business.acceptVenmo,
          venmoUsername: invoice.business.venmoUsername,
          // Zelle fields
          acceptZelle: invoice.business.acceptZelle,
          zelleEmail: invoice.business.zelleEmail,
          zellePhone: invoice.business.zellePhone,
          // Hide Branding
          hideBranding: invoice.business.hideBranding,
        } : null,
        client: invoice.client ? {
          name: invoice.client.name,
          companyName: invoice.client.companyName,
          email: invoice.client.email,
          phone: invoice.client.phone,
          address: invoice.client.address,
        } : null,
        stripePaymentLink,
      });
    } catch (error) {
      console.error("Error fetching public invoice:", error);
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  // PDF download for authenticated users
  app.get('/api/invoices/:id/pdf', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice || invoice.businessId !== business.id) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const pdfDoc = await generateInvoicePDFAsync({
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          subtotal: invoice.subtotal as string,
          taxAmount: (invoice.taxAmount || '0') as string,
          discountType: invoice.discountType,
          discountValue: invoice.discountValue as string,
          discountAmount: (invoice.discountAmount || '0') as string,
          total: invoice.total as string,
          notes: invoice.notes,
          paymentMethod: invoice.paymentMethod,
        },
        items: invoice.items.map(item => ({
          description: item.description,
          quantity: item.quantity as string,
          rate: item.rate as string,
          lineTotal: item.lineTotal as string,
        })),
        business: business ? {
          businessName: business.businessName,
          logoUrl: business.logoUrl,
          brandColor: business.brandColor,
          email: business.email,
          phone: business.phone,
          address: business.address,
          taxNumber: business.taxNumber,
          etransferEmail: business.etransferEmail,
          etransferInstructions: business.etransferInstructions,
          currency: business.currency,
          // Bank Transfer fields
          acceptBankTransfer: business.acceptBankTransfer,
          bankAccountName: business.bankAccountName,
          bankName: business.bankName,
          bankAccountNumber: business.bankAccountNumber,
          bankRoutingNumber: business.bankRoutingNumber,
          bankSwiftCode: business.bankSwiftCode,
          bankAddress: business.bankAddress,
          bankInstructions: business.bankInstructions,
          // PayPal fields
          acceptPaypal: business.acceptPaypal,
          paypalEmail: business.paypalEmail,
          // Venmo fields
          acceptVenmo: business.acceptVenmo,
          venmoUsername: business.venmoUsername,
          // Zelle fields
          acceptZelle: business.acceptZelle,
          zelleEmail: business.zelleEmail,
          zellePhone: business.zellePhone,
        } : null,
        client: invoice.client ? {
          name: invoice.client.name,
          email: invoice.client.email,
          phone: invoice.client.phone,
          address: invoice.client.address,
        } : null,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);
      
      pdfDoc.pipe(res);
      pdfDoc.end();
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  // Public PDF download
  app.get('/api/public/invoices/:token/pdf', publicLimiter, async (req, res) => {
    try {
      const invoice = await storage.getInvoiceByShareToken(req.params.token);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const pdfDoc = await generateInvoicePDFAsync({
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          subtotal: invoice.subtotal as string,
          taxAmount: (invoice.taxAmount || '0') as string,
          discountType: invoice.discountType,
          discountValue: invoice.discountValue as string,
          discountAmount: (invoice.discountAmount || '0') as string,
          total: invoice.total as string,
          notes: invoice.notes,
          paymentMethod: invoice.paymentMethod,
        },
        items: invoice.items.map(item => ({
          description: item.description,
          quantity: item.quantity as string,
          rate: item.rate as string,
          lineTotal: item.lineTotal as string,
        })),
        business: invoice.business ? {
          businessName: invoice.business.businessName,
          logoUrl: invoice.business.logoUrl,
          brandColor: invoice.business.brandColor,
          email: invoice.business.email,
          phone: invoice.business.phone,
          address: invoice.business.address,
          taxNumber: invoice.business.taxNumber,
          etransferEmail: invoice.business.etransferEmail,
          etransferInstructions: invoice.business.etransferInstructions,
          currency: invoice.business.currency,
          // Bank Transfer fields
          acceptBankTransfer: invoice.business.acceptBankTransfer,
          bankAccountName: invoice.business.bankAccountName,
          bankName: invoice.business.bankName,
          bankAccountNumber: invoice.business.bankAccountNumber,
          bankRoutingNumber: invoice.business.bankRoutingNumber,
          bankSwiftCode: invoice.business.bankSwiftCode,
          bankAddress: invoice.business.bankAddress,
          bankInstructions: invoice.business.bankInstructions,
          // PayPal fields
          acceptPaypal: invoice.business.acceptPaypal,
          paypalEmail: invoice.business.paypalEmail,
          // Venmo fields
          acceptVenmo: invoice.business.acceptVenmo,
          venmoUsername: invoice.business.venmoUsername,
          // Zelle fields
          acceptZelle: invoice.business.acceptZelle,
          zelleEmail: invoice.business.zelleEmail,
          zellePhone: invoice.business.zellePhone,
        } : null,
        client: invoice.client ? {
          name: invoice.client.name,
          email: invoice.client.email,
          phone: invoice.client.phone,
          address: invoice.client.address,
        } : null,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);
      
      pdfDoc.pipe(res);
      pdfDoc.end();
    } catch (error) {
      console.error("Error generating public PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  // Object storage routes for public assets
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Object upload URL endpoint - requires authentication
  app.post("/api/objects/upload", isAuthenticated, async (req: any, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Update business logo
  app.put("/api/business/logo", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id || req.user.claims?.sub;
    const { logoURL } = req.body;
    
    if (!logoURL) {
      return res.status(400).json({ error: "logoURL is required" });
    }

    try {
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }

      // Convert upload/sign URL to public URL if needed
      const publicURL = logoURL.replace('/upload/sign/', '/public/');

      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        publicURL,
        {
          owner: userId,
          visibility: "public",
        }
      );

      const updated = await storage.updateBusiness(business.id, { logoUrl: objectPath });
      res.json({ logoUrl: updated.logoUrl });
    } catch (error) {
      console.error("Error updating business logo:", error);
      res.status(500).json({ error: "Failed to update logo" });
    }
  });

  // Serve private objects
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Stripe Connect - initiate connection for a business
  app.get('/api/stripe/connect', stripeLimiter, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const business = await storage.getBusinessByUserId(userId);
      
      if (!business) {
        return res.status(404).json({ message: "Business not found. Please complete your business profile first." });
      }

      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ message: "Stripe is not configured on this server" });
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = process.env.BASE_URL || (req.protocol + '://' + req.get('host'));
      
      // Create a Stripe Connect account for this business
      const account = await stripe.accounts.create({
        type: 'standard',
        business_profile: {
          name: business.businessName,
        },
        metadata: {
          businessId: business.id,
          userId: userId,
        },
      });

      // Save the account ID to the business
      await storage.updateBusiness(business.id, { stripeAccountId: account.id });

      // Create an account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${baseUrl}/settings?stripe=refresh`,
        return_url: `${baseUrl}/settings?stripe=success`,
        type: 'account_onboarding',
      });

      res.json({ url: accountLink.url });
    } catch (error: any) {
      console.error("Error initiating Stripe Connect:", error);
      res.status(500).json({ message: error.message || "Failed to initiate Stripe Connect" });
    }
  });

  // Stripe status - check if business has connected their Stripe account
  app.get('/api/stripe/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const business = await storage.getBusinessByUserId(userId);
      
      // Check if Stripe is configured at the platform level
      const stripeConfigured = !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY);
      
      if (!stripeConfigured) {
        return res.json({ 
          configured: false, 
          connected: false, 
          chargesEnabled: false 
        });
      }

      // Check if business has connected their Stripe account
      if (!business?.stripeAccountId) {
        return res.json({ 
          configured: true, 
          connected: false, 
          chargesEnabled: false 
        });
      }

      // Verify the connected account status
      try {
        const stripe = await getUncachableStripeClient();
        const account = await stripe.accounts.retrieve(business.stripeAccountId);
        
        res.json({
          configured: true,
          connected: true,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
        });
      } catch (stripeError: any) {
        console.error("Error retrieving Stripe account:", stripeError);
        res.json({ 
          configured: true, 
          connected: false, 
          chargesEnabled: false,
          error: "Stripe account not found" 
        });
      }
    } catch (error: any) {
      console.error("Error checking Stripe status:", error);
      res.status(500).json({ message: error.message || "Failed to check Stripe status" });
    }
  });

  // Disconnect Stripe account
  app.post('/api/stripe/disconnect', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const business = await storage.getBusinessByUserId(userId);
      
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      // Clear the Stripe account ID
      await storage.updateBusiness(business.id, { 
        stripeAccountId: null,
        acceptCard: false,
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error disconnecting Stripe:", error);
      res.status(500).json({ message: error.message || "Failed to disconnect Stripe" });
    }
  });

  // Resume Stripe onboarding
  app.get('/api/stripe/onboarding-link', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const business = await storage.getBusinessByUserId(userId);
      
      if (!business?.stripeAccountId) {
        return res.status(400).json({ message: "No Stripe account to resume onboarding for" });
      }

      const baseUrl = process.env.BASE_URL || (req.protocol + '://' + req.get('host'));
      const stripe = await getUncachableStripeClient();

      const accountLink = await stripe.accountLinks.create({
        account: business.stripeAccountId,
        refresh_url: `${baseUrl}/settings?stripe=refresh`,
        return_url: `${baseUrl}/settings?stripe=success`,
        type: 'account_onboarding',
      });

      res.json({ url: accountLink.url });
    } catch (error: any) {
      console.error("Error creating onboarding link:", error);
      res.status(500).json({ message: error.message || "Failed to create onboarding link" });
    }
  });

  // Stripe Subscription endpoints
  
  // Create checkout session for Pro subscription
  app.post('/api/stripe/create-subscription-checkout', stripeLimiter, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      let business = await storage.getBusinessByUserId(userId);
      const user = await storage.getUser(userId);
      
      // Auto-create business if it doesn't exist (handles incomplete signup)
      if (!business) {
        const userName = user?.firstName ? `${user.firstName}'s Business` : 'My Business';
        business = await storage.createBusiness({
          userId,
          businessName: userName,
        });
      }

      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ message: "Stripe is not configured" });
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = process.env.BASE_URL || (req.protocol + '://' + req.get('host'));
      
      // Pro subscription price ID
      const proPriceId = process.env.STRIPE_PRO_PRICE_ID || 'price_1ScCyDLMn1YDhR61tHetcy4J';
      
      // Get or create Stripe customer
      let customerId = (business as any).stripeCustomerId;
      
      if (!customerId) {
        // Create a new Stripe customer with proper metadata
        const customer = await stripe.customers.create({
          email: business.email || user?.email || undefined,
          name: business.businessName,
          metadata: {
            businessId: business.id,
            userId: userId,
          },
        });
        customerId = customer.id;
        
        // Save the customer ID to the business
        await storage.updateBusiness(business.id, {
          stripeCustomerId: customerId,
        });
      }
      
      // Create checkout session for subscription with the customer
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
          price: proPriceId,
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: `${baseUrl}/settings?subscription=success`,
        cancel_url: `${baseUrl}/settings?subscription=canceled`,
        metadata: {
          businessId: business.id,
          userId: userId,
        },
        subscription_data: {
          metadata: {
            businessId: business.id,
            userId: userId,
          },
          // Don't set trial_period_days at all - this charges immediately
          // Setting it to 0 or null causes an error
        },
        // Require payment immediately
        payment_method_collection: 'always',
        payment_method_options: {
          card: {
            request_three_d_secure: 'automatic',
          },
        },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Error creating subscription checkout:", error);
      res.status(500).json({ message: error.message || "Failed to create checkout session" });
    }
  });

  // Create customer portal session for managing subscription
  app.get('/api/stripe/customer-portal', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const business = await storage.getBusinessByUserId(userId);
      
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ message: "Stripe is not configured" });
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = process.env.BASE_URL || (req.protocol + '://' + req.get('host'));
      
      let customerId = (business as any).stripeCustomerId;
      const user = await storage.getUser(userId);
      
      // If no stored customer ID, try to find by metadata (fallback for existing subscriptions)
      if (!customerId) {
        const customers = await stripe.customers.search({
          query: `metadata['businessId']:'${business.id}'`,
        });
        
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
          // Save for future use
          await storage.updateBusiness(business.id, {
            stripeCustomerId: customerId,
          });
        }
      }
      
      // If still no customer ID, try to find by email (for subscriptions created before tracking)
      const lookupEmail = business.email || user?.email;
      if (!customerId && lookupEmail) {
        try {
          const customers = await stripe.customers.list({
            email: lookupEmail,
            limit: 1,
          });
          
          if (customers.data.length > 0) {
            // Verify this customer has an active subscription
            const subscriptions = await stripe.subscriptions.list({
              customer: customers.data[0].id,
              status: 'active',
              limit: 1,
            });
            
            if (subscriptions.data.length > 0) {
              customerId = customers.data[0].id;
              // Save for future use
              await storage.updateBusiness(business.id, {
                stripeCustomerId: customerId,
              });
            }
          }
        } catch (searchError) {
          // Email search fallback failed - continue without customer ID
        }
      }

      if (!customerId) {
        return res.status(404).json({ message: "No subscription found. Please subscribe to Pro first." });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${baseUrl}/settings`,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Error creating customer portal session:", error);
      res.status(500).json({ message: error.message || "Failed to create portal session" });
    }
  });
  
  // Get subscription details
  app.get('/api/stripe/subscription-details', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const business = await storage.getBusinessByUserId(userId);
      
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(200).json({ hasSubscription: false });
      }

      const stripe = await getUncachableStripeClient();
      let customerId = (business as any).stripeCustomerId;
      
      if (!customerId) {
        return res.status(200).json({ hasSubscription: false });
      }

      // Get active subscriptions for this customer
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1,
      });

      if (subscriptions.data.length === 0) {
        // Check for canceled subscriptions that are still active until period end
        const canceledSubs = await stripe.subscriptions.list({
          customer: customerId,
          status: 'canceled',
          limit: 1,
        });
        
        if (canceledSubs.data.length === 0) {
          return res.status(200).json({ hasSubscription: false });
        }
        
        // Use the canceled subscription for details
        const subscription = canceledSubs.data[0] as any;
        
        res.json({
          hasSubscription: true,
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
          cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
          canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
        });
        return;
      }

      const subscription = subscriptions.data[0] as any;
      
      // Safely handle undefined values
      const currentPeriodEnd = subscription.current_period_end 
        ? new Date(subscription.current_period_end * 1000).toISOString() 
        : null;
      
      res.json({
        hasSubscription: true,
        status: subscription.status,
        currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
      });
    } catch (error: any) {
      console.error("Error fetching subscription details:", error);
      res.status(500).json({ message: error.message || "Failed to fetch subscription details" });
    }
  });

  // Recurring invoice routes
  
  // Manual trigger endpoint for testing recurring invoice processing
  app.post('/api/recurring/process', isAuthenticated, async (req: any, res) => {
    try {
      const result = await processRecurringInvoices();
      res.json({
        message: 'Recurring invoice processing complete',
        processed: result.processed,
        sent: result.sent,
        errors: result.errors,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to process recurring invoices" });
    }
  });

  // Update invoice to set up recurring schedule
  app.patch('/api/invoices/:id/recurring', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice || invoice.businessId !== business.id) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const { isRecurring, recurringFrequency, recurringDay, recurringMonth, recurringEvery } = req.body;

      // Calculate next recurring date if enabling recurring
      let nextRecurringDate = null;
      if (isRecurring && recurringFrequency) {
        nextRecurringDate = calculateNextRecurringDate(
          recurringFrequency,
          recurringEvery || 1,
          recurringDay,
          recurringMonth
        );
      }

      const updated = await storage.updateInvoice(req.params.id, {
        isRecurring: isRecurring || false,
        recurringFrequency,
        recurringDay,
        recurringMonth,
        recurringEvery: recurringEvery || 1,
        nextRecurringDate,
        lastRecurringDate: null, // Reset when reconfiguring
      });

      res.json(updated);
    } catch (error: any) {
      console.error("Error updating recurring settings:", error);
      res.status(500).json({ message: error.message || "Failed to update recurring settings" });
    }
  });

  // Secure cron webhook endpoint for external triggers (e.g., cron-job.org, EasyCron)
  // This endpoint does NOT require user authentication - it uses a secret key instead
  app.post('/api/cron/recurring-invoices', async (req, res) => {
    const cronSecret = req.headers['x-cron-secret'] || req.query.secret;
    
    // Validate the cron secret
    if (!process.env.CRON_SECRET) {
      return res.status(500).json({ error: 'Cron endpoint not configured' });
    }
    
    if (cronSecret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const startTime = new Date();
    
    try {
      const result = await processRecurringInvoices();
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      res.json({
        success: true,
        timestamp: startTime.toISOString(),
        duration_ms: duration,
        processed: result.processed,
        sent: result.sent,
        errors: result.errors,
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false,
        timestamp: startTime.toISOString(),
        error: error.message || 'Failed to process recurring invoices' 
      });
    }
  });

  // Diagnostic endpoint to check recurring invoice status (requires cron secret)
  app.get('/api/cron/recurring-invoices/status', async (req, res) => {
    const cronSecret = req.headers['x-cron-secret'] || req.query.secret;
    
    if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
      const today = new Date();
      
      // Get recurring invoices that are due (uses existing storage method)
      const dueInvoices = await storage.getRecurringInvoicesDue();
      
      res.json({
        timestamp: today.toISOString(),
        summary: {
          due_now: dueInvoices.length,
        },
        due_invoices: dueInvoices.map(inv => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          recurringFrequency: inv.recurringFrequency,
          nextRecurringDate: inv.nextRecurringDate?.toISOString(),
          lastRecurringDate: inv.lastRecurringDate?.toISOString(),
          clientName: inv.client?.name || 'No client',
          clientEmail: inv.client?.email || 'No email',
          total: inv.total,
        })),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // PLATFORM ADMIN ROUTES (Hardcoded Auth)
  // ==========================================
  
  // Admin login - validates hardcoded credentials
  app.post('/api/admin/login', adminAuthLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      const result = await validateAdminCredentials(email, password);
      
      if (!result.valid) {
        return res.status(401).json({ message: result.error || "Invalid credentials" });
      }
      
      // Generate admin token
      const token = generateAdminToken(email);
      
      if (!token) {
        return res.status(500).json({ message: "Admin authentication not configured" });
      }
      
      // Set httpOnly cookie
      setAdminCookie(res, token);
      
      res.json({ 
        success: true, 
        message: "Logged in successfully",
        token // Also return token for header-based auth
      });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });
  
  // Admin logout
  app.post('/api/admin/logout', (req, res) => {
    clearAdminCookie(res);
    res.json({ success: true, message: "Logged out successfully" });
  });
  
  // Verify admin session
  app.get('/api/admin/me', isAdminAuthenticated, (req: any, res) => {
    res.json({ 
      authenticated: true, 
      email: req.admin?.email 
    });
  });
  
  // Apply admin rate limiting to all protected admin routes
  app.use('/api/admin', adminApiLimiter);
  
  // Get platform metrics (KPIs)
  app.get('/api/admin/metrics', isAdminAuthenticated, async (req: any, res) => {
    try {
      const metrics = await storage.getPlatformMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching platform metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });
  
  // Get all users (paginated)
  app.get('/api/admin/users', isAdminAuthenticated, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const users = await storage.getAllUsers({ limit, offset });
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  
  // Get all invoices (paginated, filterable)
  app.get('/api/admin/invoices', isAdminAuthenticated, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const status = req.query.status as string | undefined;
      
      const invoices = await storage.getAllInvoices({ limit, offset, status });
      
      // Map to admin view format
      const result = invoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        userEmail: inv.business?.email || "Unknown",
        clientName: inv.client?.name || "No client",
        sentDate: inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : "",
        status: inv.status,
        amount: parseFloat(inv.total as string) || 0,
      }));
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });
  
  // Get chart data
  app.get('/api/admin/charts/:metric', isAdminAuthenticated, async (req: any, res) => {
    try {
      const { metric } = req.params;
      const range = req.query.range as string || "This Year";
      const customStart = req.query.customStart as string | undefined;
      const customEnd = req.query.customEnd as string | undefined;
      
      let data;
      
      switch (metric) {
        case "users":
          data = await storage.getUserGrowthChart(range, customStart, customEnd);
          break;
        case "invoices":
          data = await storage.getInvoiceCountChart(range, customStart, customEnd);
          break;
        case "volume":
          data = await storage.getInvoiceVolumeChart(range, customStart, customEnd);
          break;
        case "subscriptions":
          data = await storage.getSubscriptionBreakdown();
          break;
        default:
          return res.status(400).json({ message: "Invalid metric" });
      }
      
      res.json(data);
    } catch (error) {
      console.error("Error fetching chart data:", error);
      res.status(500).json({ message: "Failed to fetch chart data" });
    }
  });
  
  // Get recent payments
  app.get('/api/admin/payments', isAdminAuthenticated, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const payments = await storage.getRecentPayments(limit);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  // Get user activity logs
  app.get('/api/admin/users/:userId/activity', isAdminAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const logs = await storage.getUserActivityLogs(userId, { limit, offset });
      res.json(logs);
    } catch (error) {
      console.error("Error fetching user activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  // Get all activity logs (for general monitoring)
  app.get('/api/admin/activity', isAdminAuthenticated, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const logs = await storage.getAllActivityLogs({ limit, offset });
      res.json(logs);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });
  
  // Export data as CSV
  app.get('/api/admin/exports/:type', isAdminAuthenticated, async (req: any, res) => {
    try {
      const { type } = req.params;
      const range = req.query.range as string || "All Time";
      
      let csvContent = "";
      let filename = "";
      
      switch (type) {
        case "users": {
          const users = await storage.getAllUsers({ limit: 10000 });
          csvContent = "Email,Name,Business Name,Created At,Status,Invoices Sent,Total Value,Subscription\n";
          csvContent += users.map(u => 
            `"${u.email || ""}","${u.firstName || ""} ${u.lastName || ""}","${u.businessName || ""}","${u.createdAt?.toISOString() || ""}","${u.status}","${u.invoicesSent}","${u.totalInvoiceValue}","${u.subscriptionTier || "free"}"`
          ).join("\n");
          filename = `users-export-${new Date().toISOString().split("T")[0]}.csv`;
          break;
        }
        
        case "invoices": {
          const invoices = await storage.getAllInvoices({ limit: 10000 });
          csvContent = "Invoice ID,User Email,Client Name,Amount,Status,Issue Date,Paid Date\n";
          csvContent += invoices.map(inv => 
            `"${inv.invoiceNumber}","${inv.business?.email || ""}","${inv.client?.name || ""}","${inv.total}","${inv.status}","${inv.issueDate?.toISOString() || ""}","${inv.paidAt?.toISOString() || ""}"`
          ).join("\n");
          filename = `invoices-export-${new Date().toISOString().split("T")[0]}.csv`;
          break;
        }
        
        case "subscriptions": {
          const users = await storage.getAllUsers({ limit: 10000 });
          const proUsers = users.filter(u => u.subscriptionTier === "pro");
          csvContent = "User Email,Business Name,Plan,Created At,Status\n";
          csvContent += proUsers.map(u => 
            `"${u.email || ""}","${u.businessName || ""}","Pro","${u.createdAt?.toISOString() || ""}","${u.status}"`
          ).join("\n");
          filename = `subscriptions-export-${new Date().toISOString().split("T")[0]}.csv`;
          break;
        }
        
        default:
          return res.status(400).json({ message: "Invalid export type" });
      }
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(csvContent);
    } catch (error) {
      console.error("Error exporting data:", error);
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  return httpServer;
}
