import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  decimal,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (used by express-session)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Users table (synced from Supabase Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const usersRelations = relations(users, ({ one }) => ({
  business: one(businesses),
}));

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Businesses table
export const businesses = pgTable("businesses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  businessName: varchar("business_name").notNull(),
  logoUrl: varchar("logo_url"),
  currency: varchar("currency").notNull().default("USD"),
  taxNumber: varchar("tax_number"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("0"),
  stripeAccountId: varchar("stripe_account_id"),
  acceptEtransfer: boolean("accept_etransfer").default(false),
  acceptCard: boolean("accept_card").default(false),
  etransferEmail: varchar("etransfer_email"),
  etransferInstructions: text("etransfer_instructions"),
  paymentInstructions: text("payment_instructions"),
  address: text("address"),
  phone: varchar("phone"),
  email: varchar("email"),
  website: varchar("website"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  user: one(users, {
    fields: [businesses.userId],
    references: [users.id],
  }),
  clients: many(clients),
  invoices: many(invoices),
  taxTypes: many(taxTypes),
}));

export const insertBusinessSchema = createInsertSchema(businesses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Business = typeof businesses.$inferSelect;

// Tax Types table
export const taxTypes = pgTable("tax_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  name: varchar("name").notNull(),
  rate: decimal("rate", { precision: 5, scale: 2 }).notNull().default("0"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const taxTypesRelations = relations(taxTypes, ({ one }) => ({
  business: one(businesses, {
    fields: [taxTypes.businessId],
    references: [businesses.id],
  }),
}));

export const insertTaxTypeSchema = createInsertSchema(taxTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTaxType = z.infer<typeof insertTaxTypeSchema>;
export type TaxType = typeof taxTypes.$inferSelect;

// Clients table
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  name: varchar("name").notNull(),
  companyName: varchar("company_name"),
  email: varchar("email"),
  phone: varchar("phone"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const clientsRelations = relations(clients, ({ one, many }) => ({
  business: one(businesses, {
    fields: [clients.businessId],
    references: [businesses.id],
  }),
  invoices: many(invoices),
}));

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

// Invoices table
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  clientId: varchar("client_id").references(() => clients.id),
  invoiceNumber: varchar("invoice_number").notNull(),
  status: varchar("status", { enum: ["draft", "sent", "paid", "partially_paid", "overdue"] }).notNull().default("draft"),
  issueDate: timestamp("issue_date").notNull().defaultNow(),
  dueDate: timestamp("due_date").notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  shipping: decimal("shipping", { precision: 12, scale: 2 }).default("0"),
  total: decimal("total", { precision: 12, scale: 2 }).notNull().default("0"),
  amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  stripePaymentLink: varchar("stripe_payment_link"),
  stripeCheckoutId: varchar("stripe_checkout_id"),
  isRecurring: boolean("is_recurring").default(false),
  recurringFrequency: varchar("recurring_frequency", { enum: ["daily", "weekly", "monthly", "yearly"] }),
  recurringDay: integer("recurring_day"),
  recurringMonth: integer("recurring_month"),
  recurringEvery: integer("recurring_every").default(1),
  nextRecurringDate: timestamp("next_recurring_date"),
  lastRecurringDate: timestamp("last_recurring_date"),
  paymentMethod: varchar("payment_method", { enum: ["stripe", "etransfer", "both"] }).default("both"),
  shareToken: varchar("share_token").notNull().default(sql`gen_random_uuid()`),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  business: one(businesses, {
    fields: [invoices.businessId],
    references: [businesses.id],
  }),
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
  }),
  items: many(invoiceItems),
  payments: many(payments),
}));

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  shareToken: true,
});

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

// Invoice Items table
export const invoiceItems = pgTable("invoice_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  rate: decimal("rate", { precision: 12, scale: 2 }).notNull(),
  taxTypeId: varchar("tax_type_id").references(() => taxTypes.id),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).default("0"),
  lineTotal: decimal("line_total", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
  taxType: one(taxTypes, {
    fields: [invoiceItems.taxTypeId],
    references: [taxTypes.id],
  }),
}));

export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({
  id: true,
  createdAt: true,
});

export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type InvoiceItem = typeof invoiceItems.$inferSelect;

// Payments table
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull().references(() => invoices.id),
  stripePaymentIntent: varchar("stripe_payment_intent"),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { enum: ["pending", "completed", "failed"] }).notNull().default("pending"),
  paymentMethod: varchar("payment_method"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
}));

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// Saved Items for quick reuse
export const savedItems = pgTable("saved_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  description: text("description").notNull(),
  rate: decimal("rate", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const savedItemsRelations = relations(savedItems, ({ one }) => ({
  business: one(businesses, {
    fields: [savedItems.businessId],
    references: [businesses.id],
  }),
}));

export const insertSavedItemSchema = createInsertSchema(savedItems).omit({
  id: true,
  createdAt: true,
});

export type InsertSavedItem = z.infer<typeof insertSavedItemSchema>;
export type SavedItem = typeof savedItems.$inferSelect;

// Invoice Item with tax type for frontend
export type InvoiceItemWithTax = InvoiceItem & {
  taxType?: TaxType | null;
};

// Invoice with related data type for frontend
export type InvoiceWithRelations = Invoice & {
  client?: Client | null;
  items: InvoiceItemWithTax[];
  business?: Business | null;
  payments?: Payment[];
};

// Dashboard stats type
export type DashboardStats = {
  totalPaid: number;
  totalUnpaid: number;
  totalOverdue: number;
  recentInvoices: InvoiceWithRelations[];
};
