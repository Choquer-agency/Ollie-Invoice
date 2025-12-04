import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { insertClientSchema, insertBusinessSchema, insertInvoiceSchema, insertInvoiceItemSchema } from "@shared/schema";
import { z } from "zod";
import { getUncachableStripeClient } from "./stripeClient";
import { generateInvoicePDF } from "./pdfGenerator";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Business routes
  app.get('/api/business', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const business = await storage.getBusinessByUserId(userId);
      res.json(business || null);
    } catch (error) {
      console.error("Error fetching business:", error);
      res.status(500).json({ message: "Failed to fetch business" });
    }
  });

  app.post('/api/business', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      let business = await storage.getBusinessByUserId(userId);
      if (!business) {
        business = await storage.createBusiness({ userId, businessName: "My Business" });
      }
      
      const invoiceNumber = await storage.getNextInvoiceNumber(business.id);
      const { items, ...invoiceData } = req.body;
      
      const invoice = await storage.createInvoice(
        { 
          ...invoiceData, 
          businessId: business.id,
          invoiceNumber,
          clientId: invoiceData.clientId || null,
          issueDate: invoiceData.issueDate ? new Date(invoiceData.issueDate) : new Date(),
          dueDate: invoiceData.dueDate ? new Date(invoiceData.dueDate) : new Date(),
        },
        items || []
      );
      
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  app.patch('/api/invoices/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const invoice = await storage.updateInvoice(req.params.id, updateData, items);
      res.json(invoice);
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  app.delete('/api/invoices/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.post('/api/invoices/:id/send', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice || invoice.businessId !== business.id) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      let stripePaymentLink = invoice.stripePaymentLink;
      
      if ((invoice.paymentMethod === 'stripe' || invoice.paymentMethod === 'both') && !stripePaymentLink) {
        try {
          const stripe = await getUncachableStripeClient();
          const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
          
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
              price_data: {
                currency: business.currency?.toLowerCase() || 'usd',
                product_data: {
                  name: `Invoice #${invoice.invoiceNumber}`,
                  description: `Payment for Invoice #${invoice.invoiceNumber}`,
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
            },
          });
          
          stripePaymentLink = session.url || null;
        } catch (stripeError) {
          console.error("Error creating Stripe checkout session:", stripeError);
        }
      }
      
      const updated = await storage.updateInvoice(req.params.id, { 
        status: "sent",
        stripePaymentLink,
      });
      res.json(updated);
    } catch (error) {
      console.error("Error sending invoice:", error);
      res.status(500).json({ message: "Failed to send invoice" });
    }
  });

  app.post('/api/invoices/:id/resend', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      
      // TODO: Implement actual email resend logic here
      // For now, we just return success to indicate the resend was triggered
      
      res.json({ message: "Invoice resent successfully", invoice });
    } catch (error) {
      console.error("Error resending invoice:", error);
      res.status(500).json({ message: "Failed to resend invoice" });
    }
  });

  app.patch('/api/invoices/:id/mark-paid', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice || invoice.businessId !== business.id) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const updated = await storage.updateInvoice(req.params.id, { 
        status: "paid",
        paidAt: new Date(),
      });
      res.json(updated);
    } catch (error) {
      console.error("Error marking invoice as paid:", error);
      res.status(500).json({ message: "Failed to mark invoice as paid" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
          email: invoice.business.email,
          phone: invoice.business.phone,
          address: invoice.business.address,
          taxNumber: invoice.business.taxNumber,
          etransferEmail: invoice.business.etransferEmail,
          etransferInstructions: invoice.business.etransferInstructions,
        } : null,
        client: invoice.client ? {
          name: invoice.client.name,
          email: invoice.client.email,
          phone: invoice.client.phone,
          address: invoice.client.address,
        } : null,
        stripePaymentLink: invoice.stripePaymentLink,
      });
    } catch (error) {
      console.error("Error fetching public invoice:", error);
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  // PDF download for authenticated users
  app.get('/api/invoices/:id/pdf', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice || invoice.businessId !== business.id) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const pdfDoc = generateInvoicePDF({
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

      const pdfDoc = generateInvoicePDF({
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
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
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
    const userId = req.user.claims.sub;
    const { logoURL } = req.body;
    
    if (!logoURL) {
      return res.status(400).json({ error: "logoURL is required" });
    }

    try {
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        logoURL,
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

  return httpServer;
}
