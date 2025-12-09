-- Performance indexes for production readiness
-- These indexes improve query performance for common operations

-- Index on invoices.business_id for fetching all invoices by business
CREATE INDEX IF NOT EXISTS idx_invoices_business_id ON invoices(business_id);

-- Index on invoices.share_token for public invoice lookup
CREATE INDEX IF NOT EXISTS idx_invoices_share_token ON invoices(share_token);

-- Index on invoices.status for filtering by status
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Partial index on invoices.next_recurring_date for recurring invoice processing
CREATE INDEX IF NOT EXISTS idx_invoices_next_recurring ON invoices(next_recurring_date) 
  WHERE is_recurring = true AND next_recurring_date IS NOT NULL;

-- Index on clients.business_id for fetching all clients by business
CREATE INDEX IF NOT EXISTS idx_clients_business_id ON clients(business_id);

-- Index on payments.invoice_id for fetching payments by invoice
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);

-- Index on tax_types.business_id for fetching tax types by business
CREATE INDEX IF NOT EXISTS idx_tax_types_business_id ON tax_types(business_id);

-- Index on saved_items.business_id for fetching saved items by business
CREATE INDEX IF NOT EXISTS idx_saved_items_business_id ON saved_items(business_id);

-- Index on businesses.user_id for fetching business by user
CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON businesses(user_id);

-- Index on invoice_items.invoice_id for fetching items by invoice
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

