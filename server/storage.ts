import {
  users,
  businesses,
  clients,
  invoices,
  invoiceItems,
  payments,
  savedItems,
  sessions,
  taxTypes,
  type User,
  type UpsertUser,
  type Business,
  type InsertBusiness,
  type Client,
  type InsertClient,
  type Invoice,
  type InsertInvoice,
  type InvoiceItem,
  type InsertInvoiceItem,
  type Payment,
  type InsertPayment,
  type SavedItem,
  type InsertSavedItem,
  type InvoiceWithRelations,
  type DashboardStats,
  type TaxType,
  type InsertTaxType,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";

export interface IStorage {
  // User operations (for Supabase Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Business operations
  getBusinessByUserId(userId: string): Promise<Business | undefined>;
  createBusiness(business: InsertBusiness): Promise<Business>;
  updateBusiness(id: string, business: Partial<InsertBusiness>): Promise<Business>;
  
  // Subscription operations
  getMonthlyInvoiceUsage(businessId: string): Promise<{ count: number; limit: number; canSend: boolean; resetDate: Date | null }>;
  incrementMonthlyInvoiceCount(businessId: string): Promise<Business>;
  checkAndResetMonthlyCount(businessId: string): Promise<Business>;
  
  // Client operations
  getClientsByBusinessId(businessId: string): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: string): Promise<void>;
  
  // Invoice operations
  getInvoicesByBusinessId(businessId: string): Promise<InvoiceWithRelations[]>;
  getInvoice(id: string): Promise<InvoiceWithRelations | undefined>;
  getInvoiceByShareToken(token: string): Promise<InvoiceWithRelations | undefined>;
  createInvoice(invoice: InsertInvoice, items: InsertInvoiceItem[]): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>, items?: InsertInvoiceItem[]): Promise<Invoice>;
  deleteInvoice(id: string): Promise<void>;
  getNextInvoiceNumber(businessId: string): Promise<string>;
  
  // Recurring invoice operations
  getRecurringInvoicesDue(): Promise<InvoiceWithRelations[]>;
  duplicateInvoiceAsNew(templateInvoice: InvoiceWithRelations): Promise<Invoice>;
  updateRecurringSchedule(invoiceId: string): Promise<Invoice>;
  
  // Payment operations
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentsByInvoiceId(invoiceId: string): Promise<Payment[]>;
  recordPayment(invoiceId: string, amount: string, paymentMethod?: string, notes?: string): Promise<{ payment: Payment; invoice: Invoice }>;
  
  // Dashboard stats
  getDashboardStats(businessId: string): Promise<DashboardStats>;
  
  // Saved items
  getSavedItemsByBusinessId(businessId: string): Promise<SavedItem[]>;
  createSavedItem(item: InsertSavedItem): Promise<SavedItem>;
  deleteSavedItem(id: string): Promise<void>;
  
  // Tax types
  getTaxTypesByBusinessId(businessId: string): Promise<TaxType[]>;
  getTaxType(id: string): Promise<TaxType | undefined>;
  createTaxType(taxType: InsertTaxType): Promise<TaxType>;
  updateTaxType(id: string, taxType: Partial<InsertTaxType>): Promise<TaxType>;
  deleteTaxType(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    if (userData.email) {
      const existingByEmail = await db.select().from(users).where(eq(users.email, userData.email)).limit(1);
      
      if (existingByEmail.length > 0) {
        const existingUser = existingByEmail[0];
        const [updated] = await db
          .update(users)
          .set({
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImageUrl: userData.profileImageUrl,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id))
          .returning();
        return updated;
      }
    }

    const existingById = await db.select().from(users).where(eq(users.id, userData.id!)).limit(1);
    
    if (existingById.length > 0) {
      const [updated] = await db
        .update(users)
        .set({
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userData.id!))
        .returning();
      return updated;
    }

    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  // Business operations
  async getBusinessByUserId(userId: string): Promise<Business | undefined> {
    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.userId, userId));
    return business;
  }

  async createBusiness(business: InsertBusiness): Promise<Business> {
    const [created] = await db.insert(businesses).values(business).returning();
    return created;
  }

  async updateBusiness(id: string, business: Partial<InsertBusiness>): Promise<Business> {
    const [updated] = await db
      .update(businesses)
      .set({ ...business, updatedAt: new Date() })
      .where(eq(businesses.id, id))
      .returning();
    return updated;
  }

  // Subscription operations
  async getMonthlyInvoiceUsage(businessId: string): Promise<{ count: number; limit: number; canSend: boolean; resetDate: Date | null }> {
    const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId));
    if (!business) {
      return { count: 0, limit: 5, canSend: true, resetDate: null };
    }

    // Check if we need to reset the monthly count
    const updatedBusiness = await this.checkAndResetMonthlyCount(businessId);
    
    const isPro = updatedBusiness.subscriptionTier === 'pro';
    const count = updatedBusiness.monthlyInvoiceCount || 0;
    const limit = isPro ? Infinity : 5; // Free tier: 5 invoices/month
    const canSend = isPro || count < 5;
    
    return { 
      count, 
      limit: isPro ? -1 : 5, // -1 indicates unlimited
      canSend,
      resetDate: updatedBusiness.invoiceCountResetDate
    };
  }

  async incrementMonthlyInvoiceCount(businessId: string): Promise<Business> {
    // First check and reset if needed
    await this.checkAndResetMonthlyCount(businessId);
    
    // Then increment the count
    const [updated] = await db
      .update(businesses)
      .set({ 
        monthlyInvoiceCount: sql`${businesses.monthlyInvoiceCount} + 1`,
        updatedAt: new Date() 
      })
      .where(eq(businesses.id, businessId))
      .returning();
    return updated;
  }

  async checkAndResetMonthlyCount(businessId: string): Promise<Business> {
    const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId));
    if (!business) {
      throw new Error("Business not found");
    }

    const now = new Date();
    const resetDate = business.invoiceCountResetDate ? new Date(business.invoiceCountResetDate) : null;
    
    // Check if we need to reset (if reset date is in the past or not set)
    let needsReset = false;
    if (!resetDate) {
      needsReset = true;
    } else {
      // Reset if we're in a new month
      const resetMonth = resetDate.getMonth();
      const resetYear = resetDate.getFullYear();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      if (currentYear > resetYear || (currentYear === resetYear && currentMonth > resetMonth)) {
        needsReset = true;
      }
    }

    if (needsReset) {
      // Calculate next reset date (first of next month)
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      
      const [updated] = await db
        .update(businesses)
        .set({ 
          monthlyInvoiceCount: 0,
          invoiceCountResetDate: nextMonth,
          updatedAt: new Date() 
        })
        .where(eq(businesses.id, businessId))
        .returning();
      return updated;
    }

    return business;
  }

  // Client operations
  async getClientsByBusinessId(businessId: string): Promise<Client[]> {
    return db
      .select()
      .from(clients)
      .where(eq(clients.businessId, businessId))
      .orderBy(desc(clients.createdAt));
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [created] = await db.insert(clients).values(client).returning();
    return created;
  }

  async updateClient(id: string, client: Partial<InsertClient>): Promise<Client> {
    const [updated] = await db
      .update(clients)
      .set({ ...client, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return updated;
  }

  async deleteClient(id: string): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  // Invoice operations
  async getInvoicesByBusinessId(businessId: string): Promise<InvoiceWithRelations[]> {
    const invoiceList = await db
      .select()
      .from(invoices)
      .where(eq(invoices.businessId, businessId))
      .orderBy(desc(invoices.createdAt));

    const result: InvoiceWithRelations[] = [];
    for (const invoice of invoiceList) {
      const items = await db
        .select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, invoice.id));
      
      let client: Client | null = null;
      if (invoice.clientId) {
        const [clientData] = await db
          .select()
          .from(clients)
          .where(eq(clients.id, invoice.clientId));
        client = clientData || null;
      }
      
      result.push({ ...invoice, items, client });
    }
    return result;
  }

  async getInvoice(id: string): Promise<InvoiceWithRelations | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    if (!invoice) return undefined;

    const items = await db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoice.id));

    let client: Client | null = null;
    if (invoice.clientId) {
      const [clientData] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, invoice.clientId));
      client = clientData || null;
    }

    let business: Business | null = null;
    const [businessData] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, invoice.businessId));
    business = businessData || null;

    // Get payments for this invoice
    const invoicePayments = await db
      .select()
      .from(payments)
      .where(eq(payments.invoiceId, invoice.id))
      .orderBy(desc(payments.createdAt));

    return { ...invoice, items, client, business, payments: invoicePayments };
  }

  async getInvoiceByShareToken(token: string): Promise<InvoiceWithRelations | undefined> {
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.shareToken, token));
    if (!invoice) return undefined;

    const items = await db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoice.id));

    let client: Client | null = null;
    if (invoice.clientId) {
      const [clientData] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, invoice.clientId));
      client = clientData || null;
    }

    let business: Business | null = null;
    const [businessData] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, invoice.businessId));
    business = businessData || null;

    // Get payments for this invoice
    const invoicePayments = await db
      .select()
      .from(payments)
      .where(eq(payments.invoiceId, invoice.id))
      .orderBy(desc(payments.createdAt));

    return { ...invoice, items, client, business, payments: invoicePayments };
  }

  async createInvoice(invoice: InsertInvoice, items: InsertInvoiceItem[]): Promise<Invoice> {
    const [created] = await db.insert(invoices).values(invoice).returning();
    
    if (items.length > 0) {
      await db.insert(invoiceItems).values(
        items.map((item) => ({ ...item, invoiceId: created.id }))
      );
    }
    
    return created;
  }

  async updateInvoice(id: string, invoice: Partial<InsertInvoice>, items?: InsertInvoiceItem[]): Promise<Invoice> {
    const [updated] = await db
      .update(invoices)
      .set({ ...invoice, updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();

    if (items !== undefined) {
      // Delete existing items and insert new ones
      await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
      if (items.length > 0) {
        await db.insert(invoiceItems).values(
          items.map((item) => ({ ...item, invoiceId: id }))
        );
      }
    }

    return updated;
  }

  async deleteInvoice(id: string): Promise<void> {
    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
    await db.delete(invoices).where(eq(invoices.id, id));
  }

  async getNextInvoiceNumber(businessId: string): Promise<string> {
    const [result] = await db
      .select({ count: sql<number>`count(*)::integer` })
      .from(invoices)
      .where(eq(invoices.businessId, businessId));
    
    const count = Number(result?.count || 0) + 1;
    return String(count).padStart(4, '0');
  }

  // Recurring invoice operations
  async getRecurringInvoicesDue(): Promise<InvoiceWithRelations[]> {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    const recurringInvoices = await db
      .select()
      .from(invoices)
      .where(and(
        eq(invoices.isRecurring, true),
        lte(invoices.nextRecurringDate, today)
      ));
    
    const result: InvoiceWithRelations[] = [];
    for (const invoice of recurringInvoices) {
      const items = await db
        .select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, invoice.id));
      
      let client: Client | null = null;
      if (invoice.clientId) {
        const [clientData] = await db
          .select()
          .from(clients)
          .where(eq(clients.id, invoice.clientId));
        client = clientData || null;
      }
      
      let business: Business | null = null;
      const [businessData] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, invoice.businessId));
      business = businessData || null;
      
      result.push({ ...invoice, items, client, business });
    }
    return result;
  }

  async duplicateInvoiceAsNew(templateInvoice: InvoiceWithRelations): Promise<Invoice> {
    // Get next invoice number for this business
    const invoiceNumber = await this.getNextInvoiceNumber(templateInvoice.businessId);
    
    // Calculate new dates
    const today = new Date();
    const originalIssueDate = new Date(templateInvoice.issueDate);
    const originalDueDate = new Date(templateInvoice.dueDate);
    const daysDiff = Math.ceil((originalDueDate.getTime() - originalIssueDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const newDueDate = new Date(today);
    newDueDate.setDate(newDueDate.getDate() + daysDiff);
    
    // Create the new invoice
    const [newInvoice] = await db.insert(invoices).values({
      businessId: templateInvoice.businessId,
      clientId: templateInvoice.clientId,
      invoiceNumber,
      status: "sent", // New invoices from recurring are auto-sent
      issueDate: today,
      dueDate: newDueDate,
      subtotal: templateInvoice.subtotal,
      taxAmount: templateInvoice.taxAmount,
      shipping: templateInvoice.shipping,
      total: templateInvoice.total,
      amountPaid: "0",
      notes: templateInvoice.notes,
      paymentMethod: templateInvoice.paymentMethod,
      isRecurring: false, // New invoice is NOT recurring (template stays recurring)
    }).returning();
    
    // Copy all line items
    if (templateInvoice.items.length > 0) {
      await db.insert(invoiceItems).values(
        templateInvoice.items.map((item) => ({
          invoiceId: newInvoice.id,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          taxTypeId: item.taxTypeId,
          taxAmount: item.taxAmount,
          lineTotal: item.lineTotal,
        }))
      );
    }
    
    return newInvoice;
  }

  async updateRecurringSchedule(invoiceId: string): Promise<Invoice> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
    if (!invoice || !invoice.isRecurring) {
      throw new Error("Invoice not found or is not recurring");
    }
    
    const now = new Date();
    const recurringEvery = invoice.recurringEvery || 1;
    let nextDate = new Date();
    
    switch (invoice.recurringFrequency) {
      case "daily":
        nextDate.setDate(nextDate.getDate() + recurringEvery);
        break;
      case "weekly":
        nextDate.setDate(nextDate.getDate() + (7 * recurringEvery));
        break;
      case "monthly":
        nextDate.setMonth(nextDate.getMonth() + recurringEvery);
        if (invoice.recurringDay) {
          nextDate.setDate(Math.min(invoice.recurringDay, this.getDaysInMonth(nextDate)));
        }
        break;
      case "yearly":
        nextDate.setFullYear(nextDate.getFullYear() + recurringEvery);
        if (invoice.recurringMonth) {
          nextDate.setMonth(invoice.recurringMonth - 1);
        }
        if (invoice.recurringDay) {
          nextDate.setDate(Math.min(invoice.recurringDay, this.getDaysInMonth(nextDate)));
        }
        break;
    }
    
    const [updated] = await db
      .update(invoices)
      .set({
        lastRecurringDate: now,
        nextRecurringDate: nextDate,
        updatedAt: now,
      })
      .where(eq(invoices.id, invoiceId))
      .returning();
    
    return updated;
  }

  private getDaysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  // Payment operations
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [created] = await db.insert(payments).values(payment).returning();
    return created;
  }

  async getPaymentsByInvoiceId(invoiceId: string): Promise<Payment[]> {
    return db
      .select()
      .from(payments)
      .where(eq(payments.invoiceId, invoiceId))
      .orderBy(desc(payments.createdAt));
  }

  async recordPayment(invoiceId: string, amount: string, paymentMethod?: string, notes?: string): Promise<{ payment: Payment; invoice: Invoice }> {
    // Create the payment record
    const [payment] = await db.insert(payments).values({
      invoiceId,
      amount,
      status: "completed",
      paymentMethod,
      notes,
    }).returning();

    // Get all completed payments for this invoice to calculate total paid
    const allPayments = await db
      .select()
      .from(payments)
      .where(and(
        eq(payments.invoiceId, invoiceId),
        eq(payments.status, "completed")
      ));

    const totalPaid = allPayments.reduce((sum, p) => sum + parseFloat(p.amount as string), 0);

    // Get the invoice to compare with total
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
    const invoiceTotal = parseFloat(invoice.total as string);

    // Determine new status
    let newStatus: "paid" | "partially_paid" | "sent" | "draft" | "overdue" = invoice.status as any;
    if (totalPaid >= invoiceTotal) {
      newStatus = "paid";
    } else if (totalPaid > 0) {
      newStatus = "partially_paid";
    }

    // Update the invoice with new amount paid and status
    const [updatedInvoice] = await db
      .update(invoices)
      .set({
        amountPaid: totalPaid.toFixed(2),
        status: newStatus,
        paidAt: newStatus === "paid" ? new Date() : invoice.paidAt,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoiceId))
      .returning();

    return { payment, invoice: updatedInvoice };
  }

  // Dashboard stats
  async getDashboardStats(businessId: string): Promise<DashboardStats> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all invoices for the business
    const allInvoices = await this.getInvoicesByBusinessId(businessId);
    
    // Get all payments from the last 30 days for this business's invoices
    const invoiceIds = allInvoices.map(inv => inv.id);
    let recentPaymentsTotal = 0;
    
    if (invoiceIds.length > 0) {
      // Query payments made in the last 30 days
      const recentPayments = await db
        .select()
        .from(payments)
        .where(and(
          eq(payments.status, "completed"),
          gte(payments.createdAt, thirtyDaysAgo)
        ));
      
      // Filter to only payments for this business's invoices and sum them
      for (const payment of recentPayments) {
        if (invoiceIds.includes(payment.invoiceId)) {
          recentPaymentsTotal += parseFloat(payment.amount as string) || 0;
        }
      }
    }

    // Calculate totals
    let totalUnpaid = 0;
    let totalOverdue = 0;

    const now = new Date();
    for (const invoice of allInvoices) {
      const total = parseFloat(invoice.total as string) || 0;
      const amountPaid = parseFloat(invoice.amountPaid as string) || 0;
      const remainingBalance = total - amountPaid;
      
      if (invoice.status === "paid") {
        // Paid invoices are already counted in recentPaymentsTotal
        // No need to add to unpaid/overdue
      } else if (invoice.status === "overdue" || (invoice.status === "sent" && new Date(invoice.dueDate) < now)) {
        // For overdue invoices, count remaining balance
        totalOverdue += remainingBalance;
      } else if (invoice.status === "partially_paid") {
        // For partially paid invoices, add remaining balance to unpaid
        // The paid portion is already in recentPaymentsTotal if paid recently
        totalUnpaid += remainingBalance;
      } else if (invoice.status === "sent" || invoice.status === "draft") {
        totalUnpaid += remainingBalance;
      }
    }

    return {
      totalPaid: recentPaymentsTotal,
      totalUnpaid,
      totalOverdue,
      recentInvoices: allInvoices.slice(0, 10),
    };
  }

  // Saved items
  async getSavedItemsByBusinessId(businessId: string): Promise<SavedItem[]> {
    return db
      .select()
      .from(savedItems)
      .where(eq(savedItems.businessId, businessId))
      .orderBy(desc(savedItems.createdAt));
  }

  async createSavedItem(item: InsertSavedItem): Promise<SavedItem> {
    const [created] = await db.insert(savedItems).values(item).returning();
    return created;
  }

  async deleteSavedItem(id: string): Promise<void> {
    await db.delete(savedItems).where(eq(savedItems.id, id));
  }

  // Tax types
  async getTaxTypesByBusinessId(businessId: string): Promise<TaxType[]> {
    return db
      .select()
      .from(taxTypes)
      .where(eq(taxTypes.businessId, businessId))
      .orderBy(desc(taxTypes.createdAt));
  }

  async getTaxType(id: string): Promise<TaxType | undefined> {
    const [taxType] = await db.select().from(taxTypes).where(eq(taxTypes.id, id));
    return taxType;
  }

  async createTaxType(taxType: InsertTaxType): Promise<TaxType> {
    const [created] = await db.insert(taxTypes).values(taxType).returning();
    return created;
  }

  async updateTaxType(id: string, taxType: Partial<InsertTaxType>): Promise<TaxType> {
    const [updated] = await db
      .update(taxTypes)
      .set({ ...taxType, updatedAt: new Date() })
      .where(eq(taxTypes.id, id))
      .returning();
    return updated;
  }

  async deleteTaxType(id: string): Promise<void> {
    await db.delete(taxTypes).where(eq(taxTypes.id, id));
  }
}

export const storage = new DatabaseStorage();
