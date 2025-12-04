import {
  users,
  businesses,
  clients,
  invoices,
  invoiceItems,
  payments,
  savedItems,
  sessions,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Business operations
  getBusinessByUserId(userId: string): Promise<Business | undefined>;
  createBusiness(business: InsertBusiness): Promise<Business>;
  updateBusiness(id: string, business: Partial<InsertBusiness>): Promise<Business>;
  
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
  
  // Dashboard stats
  getDashboardStats(businessId: string): Promise<DashboardStats>;
  
  // Saved items
  getSavedItemsByBusinessId(businessId: string): Promise<SavedItem[]>;
  createSavedItem(item: InsertSavedItem): Promise<SavedItem>;
  deleteSavedItem(id: string): Promise<void>;
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

    return { ...invoice, items, client, business };
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

    return { ...invoice, items, client, business };
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
      .select({ count: sql<number>`count(*)` })
      .from(invoices)
      .where(eq(invoices.businessId, businessId));
    
    const count = (result?.count || 0) + 1;
    return String(count).padStart(4, '0');
  }

  // Dashboard stats
  async getDashboardStats(businessId: string): Promise<DashboardStats> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all invoices for the business
    const allInvoices = await this.getInvoicesByBusinessId(businessId);

    // Calculate totals
    let totalPaid = 0;
    let totalUnpaid = 0;
    let totalOverdue = 0;

    const now = new Date();
    for (const invoice of allInvoices) {
      const amount = parseFloat(invoice.total as string) || 0;
      
      if (invoice.status === "paid") {
        // Only count paid invoices from last 30 days
        if (invoice.paidAt && new Date(invoice.paidAt) >= thirtyDaysAgo) {
          totalPaid += amount;
        }
      } else if (invoice.status === "overdue" || (invoice.status === "sent" && new Date(invoice.dueDate) < now)) {
        totalOverdue += amount;
      } else if (invoice.status === "sent" || invoice.status === "draft") {
        totalUnpaid += amount;
      }
    }

    return {
      totalPaid,
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
}

export const storage = new DatabaseStorage();
