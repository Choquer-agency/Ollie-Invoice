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
import { sendInvoiceEmail } from "./emailClient";
import { processRecurringInvoices, calculateNextRecurringDate } from "./recurringInvoices";

// Admin middleware - checks if user has admin role
async function isAdmin(req: any, res: any, next: any) {
  try {
    const userId = req.user?.id || req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const user = await storage.getUser(userId);
    if (!user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    next();
  } catch (error) {
    console.error("Error in admin middleware:", error);
    res.status(500).json({ message: "Failed to verify admin status" });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.patch('/api/auth/user', isAuthenticated, async (req: any, res) => {
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
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Special signup completion endpoint - accepts user ID directly for initial setup
  // This bypasses token validation issues immediately after signup
  app.post('/api/auth/signup-complete', async (req: any, res) => {
    console.log('Signup complete endpoint called');
    try {
      const { userId, firstName, lastName, businessData, logoURL, updateBusiness, taxTypes } = req.body;
      console.log('Request body:', { userId, firstName, lastName, hasBusinessData: !!businessData, updateBusiness });

      if (!userId) {
        console.error('No userId provided');
        return res.status(400).json({ message: "User ID is required" });
      }

      // Note: We skip user verification here because:
      // 1. The user was just created via Supabase signup
      // 2. There can be timing issues where the user isn't immediately available
      // 3. We trust the userId from the signup response
      // If needed, we can add optional verification later, but it should not block signup

      let user;
      let business;

      if (updateBusiness) {
        // Update existing business
        console.log('Updating business with data:', businessData);
        business = await storage.getBusinessByUserId(userId);
        if (!business) {
          return res.status(404).json({ message: "Business not found" });
        }
        business = await storage.updateBusiness(business.id, businessData || {});
        console.log('Business updated successfully:', {
          id: business.id,
          currency: business.currency,
          phone: business.phone,
          address: business.address
        });
      } else {
        // Initial signup - create user and business
        // Check if user already exists (for back/forth navigation)
        const existingUser = await storage.getUser(userId);
        if (existingUser) {
          user = existingUser;
          // Update user info if provided
          if (firstName || lastName) {
            user = await storage.upsertUser({
              id: userId,
              firstName: firstName || existingUser.firstName,
              lastName: lastName || existingUser.lastName,
            });
          }
        } else {
          // Create new user
          user = await storage.upsertUser({
            id: userId,
            firstName,
            lastName,
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
            console.log('Signup logo URL conversion:', { original: logoURL, public: publicURL });
            
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
            console.error("Error uploading logo:", err);
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
            console.error("Error creating tax type:", err);
            // Continue with other tax types
          }
        }
      }

      res.json({ user, business });
    } catch (error: any) {
      console.error("Error completing signup:", error);
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
        console.log(`Auto-created business for user ${userId}: ${business.id}`);
      }
      
      console.log('GET /api/business - returning data:', {
        id: business?.id,
        currency: business?.currency,
        phone: business?.phone,
        address: business?.address
      });
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

  app.patch('/api/business', isAuthenticated, async (req: any, res) => {
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
      console.error("Error updating business:", error);
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

  app.post('/api/clients', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      let business = await storage.getBusinessByUserId(userId);
      if (!business) {
        // Auto-create business
        business = await storage.createBusiness({ userId, businessName: "My Business" });
      }
      const data = { ...req.body, businessId: business.id };
      const client = await storage.createClient(data);
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  app.patch('/api/clients/:id', isAuthenticated, async (req: any, res) => {
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
      console.error("Error updating client:", error);
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

  app.post('/api/tax-types', isAuthenticated, async (req: any, res) => {
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
      console.error("Error creating tax type:", error);
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

  app.post('/api/invoices', isAuthenticated, async (req: any, res) => {
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
        console.log(`[Create Invoice] Invoice created as 'sent' - incrementing monthly count for business ${business.id}`);
        await storage.incrementMonthlyInvoiceCount(business.id);
      }
      
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

  app.post('/api/invoices/:id/send', isAuthenticated, async (req: any, res) => {
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
          console.log('Skipping Stripe payment link - Stripe not configured');
        } else if (!business.stripeAccountId) {
          console.log('Skipping Stripe payment link - Business has not connected Stripe account');
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
            console.error("Error creating Stripe checkout session:", stripeError);
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
        console.log(`[Send Invoice] Incrementing monthly count for business ${business.id}`);
        await storage.incrementMonthlyInvoiceCount(business.id);
      } else {
        console.log(`[Send Invoice] Skipping increment - invoice already ${invoice.status}`);
      }
      
      const updated = await storage.updateInvoice(req.params.id, { 
        status: "sent",
        stripePaymentLink,
        stripeCheckoutId,
      });
      
      // Send email to client if they have an email address
      if (invoice.client?.email) {
        try {
          // Log the business invoice copy settings for debugging
          console.log(`[Send Invoice] Business CC settings - sendInvoiceCopy: ${business.sendInvoiceCopy}, invoiceCopyEmail: ${business.invoiceCopyEmail}`);
          
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
            stripePaymentLink,
            isResend: false,
            sendCopyToOwner: business.sendInvoiceCopy || false,
            ownerCopyEmail: business.invoiceCopyEmail,
          });
          
          if (!emailResult.success) {
            console.error('Failed to send invoice email:', emailResult.error);
            // Don't fail the request, just log the error
          } else {
            console.log('Invoice email sent successfully:', emailResult.messageId);
          }
        } catch (emailError) {
          console.error('Error sending invoice email:', emailError);
          // Don't fail the request, just log the error
        }
      } else {
        console.log('Skipping email send - client has no email address');
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error sending invoice:", error);
      res.status(500).json({ message: "Failed to send invoice" });
    }
  });

  app.post('/api/invoices/:id/resend', isAuthenticated, async (req: any, res) => {
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
        // Log the business invoice copy settings for debugging
        console.log(`[Resend Invoice] Business CC settings - sendInvoiceCopy: ${business.sendInvoiceCopy}, invoiceCopyEmail: ${business.invoiceCopyEmail}`);
        
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
        });
        
        if (!emailResult.success) {
          console.error('Failed to resend invoice email:', emailResult.error);
          return res.status(500).json({ 
            message: "Failed to send email", 
            error: emailResult.error 
          });
        }
        
        console.log('Invoice reminder email sent successfully:', emailResult.messageId);
        res.json({ message: "Invoice resent successfully", invoice });
      } catch (emailError: any) {
        console.error('Error resending invoice email:', emailError);
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
      
      // Calculate remaining balance and record as full payment
      const total = parseFloat(invoice.total as string) || 0;
      const amountPaid = parseFloat(invoice.amountPaid as string) || 0;
      const remainingBalance = total - amountPaid;
      
      if (remainingBalance > 0) {
        // Record a payment for the remaining balance
        const { invoice: updatedInvoice } = await storage.recordPayment(
          req.params.id,
          remainingBalance.toFixed(2),
          "manual",
          "Marked as paid"
        );
        res.json(updatedInvoice);
      } else {
        // Already fully paid
        const updated = await storage.updateInvoice(req.params.id, { 
          status: "paid",
          paidAt: new Date(),
        });
        res.json(updated);
      }
    } catch (error) {
      console.error("Error marking invoice as paid:", error);
      res.status(500).json({ message: "Failed to mark invoice as paid" });
    }
  });

  // Record a payment for an invoice (supports partial payments)
  app.post('/api/invoices/:id/payments', isAuthenticated, async (req: any, res) => {
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
      
      res.status(201).json({ payment, invoice: fullInvoice });
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
  app.get('/api/public/invoices/:token', async (req, res) => {
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
          total: invoice.total,
          amountPaid: invoice.amountPaid,
          notes: invoice.notes,
          paymentMethod: invoice.paymentMethod,
          items: invoice.items.map(item => ({
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            lineTotal: item.lineTotal,
          })),
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
  app.get('/api/public/invoices/:token/pdf', async (req, res) => {
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

  // Object upload URL endpoint
  // Allow unauthenticated access for signup logo uploads
  app.post("/api/objects/upload", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
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
      console.log('Logo URL conversion:', { original: logoURL, public: publicURL });

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
  app.get('/api/stripe/connect', isAuthenticated, async (req: any, res) => {
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
  app.post('/api/stripe/create-subscription-checkout', isAuthenticated, async (req: any, res) => {
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
        console.log(`Auto-created business for user ${userId}: ${business.id}`);
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
          console.log('Email search fallback failed:', searchError);
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
      
      // Log the subscription data for debugging
      console.log('Subscription found:', {
        id: subscription.id,
        status: subscription.status,
        current_period_end: subscription.current_period_end,
        current_period_start: subscription.current_period_start,
      });
      
      // Safely handle undefined values
      const currentPeriodEnd = subscription.current_period_end 
        ? new Date(subscription.current_period_end * 1000).toISOString() 
        : null;
        
      console.log('Formatted currentPeriodEnd:', currentPeriodEnd);
      
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
      console.log('Manual recurring invoice processing triggered');
      const result = await processRecurringInvoices();
      res.json({
        message: 'Recurring invoice processing complete',
        processed: result.processed,
        sent: result.sent,
        errors: result.errors,
      });
    } catch (error: any) {
      console.error("Error processing recurring invoices:", error);
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
      console.error('[CRON] CRON_SECRET environment variable not set');
      return res.status(500).json({ error: 'Cron endpoint not configured' });
    }
    
    if (cronSecret !== process.env.CRON_SECRET) {
      console.warn('[CRON] Unauthorized cron request attempt');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const startTime = new Date();
    console.log(`[CRON] Recurring invoice processing triggered at ${startTime.toISOString()}`);
    
    try {
      const result = await processRecurringInvoices();
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      console.log(`[CRON] Completed in ${duration}ms - Processed: ${result.processed}, Sent: ${result.sent}, Errors: ${result.errors.length}`);
      
      res.json({
        success: true,
        timestamp: startTime.toISOString(),
        duration_ms: duration,
        processed: result.processed,
        sent: result.sent,
        errors: result.errors,
      });
    } catch (error: any) {
      console.error('[CRON] Critical error in recurring invoice processing:', error);
      res.status(500).json({ 
        success: false,
        timestamp: startTime.toISOString(),
        error: error.message || 'Failed to process recurring invoices' 
      });
    }
  });

  // Admin routes
  
  // Get admin status for current user
  app.get('/api/admin/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      const user = await storage.getUser(userId);
      res.json({ isAdmin: user?.isAdmin || false });
    } catch (error) {
      console.error("Error checking admin status:", error);
      res.status(500).json({ message: "Failed to check admin status" });
    }
  });

  // Get or create Ollie business
  app.get('/api/admin/ollie-business', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      let ollieBusiness = await storage.getOllieBusiness();
      res.json(ollieBusiness || null);
    } catch (error) {
      console.error("Error fetching Ollie business:", error);
      res.status(500).json({ message: "Failed to fetch Ollie business" });
    }
  });

  // Create Ollie business
  app.post('/api/admin/ollie-business', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.id || req.user.claims?.sub;
      
      // Check if Ollie business already exists
      const existing = await storage.getOllieBusiness();
      if (existing) {
        return res.status(400).json({ message: "Ollie business already exists" });
      }

      const ollieBusiness = await storage.createOllieBusiness({
        userId,
        businessName: req.body.businessName || "Ollie Invoice",
        email: req.body.email,
        phone: req.body.phone,
        address: req.body.address,
        website: req.body.website,
        currency: req.body.currency || "USD",
      });

      res.status(201).json(ollieBusiness);
    } catch (error) {
      console.error("Error creating Ollie business:", error);
      res.status(500).json({ message: "Failed to create Ollie business" });
    }
  });

  // Update Ollie business
  app.patch('/api/admin/ollie-business', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const ollieBusiness = await storage.getOllieBusiness();
      if (!ollieBusiness) {
        return res.status(404).json({ message: "Ollie business not found" });
      }

      const updated = await storage.updateBusiness(ollieBusiness.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating Ollie business:", error);
      res.status(500).json({ message: "Failed to update Ollie business" });
    }
  });

  // Get all invoices for Ollie business (admin view)
  app.get('/api/admin/invoices', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const ollieBusiness = await storage.getOllieBusiness();
      if (!ollieBusiness) {
        return res.json([]);
      }

      const invoices = await storage.getInvoicesByBusinessId(ollieBusiness.id);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching admin invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  // Get all clients for Ollie business (admin view)
  app.get('/api/admin/clients', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const ollieBusiness = await storage.getOllieBusiness();
      if (!ollieBusiness) {
        return res.json([]);
      }

      const clients = await storage.getClientsByBusinessId(ollieBusiness.id);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching admin clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  // Get dashboard stats for Ollie business (admin view)
  app.get('/api/admin/dashboard/stats', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const ollieBusiness = await storage.getOllieBusiness();
      if (!ollieBusiness) {
        return res.json({
          totalPaid: 0,
          totalUnpaid: 0,
          totalOverdue: 0,
          recentInvoices: [],
        });
      }

      const stats = await storage.getDashboardStats(ollieBusiness.id);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  return httpServer;
}
