import PDFDocument from 'pdfkit';
import type { InvoiceWithRelations, Business, Client, InvoiceItem } from '@shared/schema';
import https from 'https';
import http from 'http';

// Fetch image from URL and return as buffer
async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    try {
      const protocol = url.startsWith('https') ? https : http;
      protocol.get(url, (response) => {
        if (response.statusCode !== 200) {
          console.log('Failed to fetch logo image:', response.statusCode);
          resolve(null);
          return;
        }
        
        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', () => resolve(null));
      }).on('error', () => resolve(null));
    } catch (error) {
      console.log('Error fetching logo:', error);
      resolve(null);
    }
  });
}

const DEFAULT_BRAND_COLOR = '#1A1A1A';

interface InvoiceData {
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    issueDate: Date | string;
    dueDate: Date | string;
    subtotal: string;
    taxAmount: string;
    total: string;
    notes: string | null;
    paymentMethod: string | null;
  };
  items: Array<{
    description: string;
    quantity: string;
    rate: string;
    lineTotal: string;
  }>;
  business: {
    businessName: string | null;
    logoUrl: string | null;
    brandColor: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    taxNumber: string | null;
    etransferEmail: string | null;
    etransferInstructions: string | null;
    currency: string | null;
  } | null;
  client: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  } | null;
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

function formatCurrency(amount: string | number, currency: string = 'USD'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  // Use simple formatting to avoid locale issues
  const symbol = currency === 'CAD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  return `${symbol}${num.toFixed(2)}`;
}

export async function generateInvoicePDFAsync(data: InvoiceData): Promise<typeof PDFDocument.prototype> {
  const doc = new PDFDocument({ 
    size: 'A4',
    margin: 50,
  });

  const { invoice, items, business, client } = data;
  const currency = business?.currency || 'USD';
  const brandColor = business?.brandColor || DEFAULT_BRAND_COLOR;
  
  const pageWidth = doc.page.width;
  const marginLeft = 50;
  const marginRight = pageWidth - 50;
  const contentWidth = marginRight - marginLeft;
  
  let yPos = 50;
  
  // ============================================
  // Fetch logo if available
  // ============================================
  let logoBuffer: Buffer | null = null;
  if (business?.logoUrl && business.logoUrl.startsWith('http')) {
    logoBuffer = await fetchImageBuffer(business.logoUrl);
  }

  // ============================================
  // HEADER: Logo + Company Info (left) | INVOICE + # (right)
  // ============================================
  
  const headerStartY = yPos;
  let leftY = headerStartY;
  
  // Left side: Logo (if available)
  if (logoBuffer) {
    try {
      doc.image(logoBuffer, marginLeft, leftY, { height: 45 });
      leftY += 55;
    } catch (e) {
      console.log('Failed to embed logo in PDF:', e);
    }
  }
  
  // Left side: Company name
  if (business) {
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#000000');
    doc.text(business.businessName || '', marginLeft, leftY);
    leftY += 24;
    
    doc.font('Helvetica').fontSize(9).fillColor('#6b7280');
    if (business.email) {
      doc.text(business.email, marginLeft, leftY);
      leftY += 13;
    }
    if (business.phone) {
      doc.text(business.phone, marginLeft, leftY);
      leftY += 13;
    }
    if (business.address) {
      doc.text(business.address, marginLeft, leftY);
      leftY += 13;
    }
  }
  
  // Right side: INVOICE title (at top) - uses brand color
  doc.font('Helvetica-Bold').fontSize(28).fillColor(brandColor);
  doc.text('INVOICE', marginLeft, headerStartY, { 
    width: contentWidth, 
    align: 'right' 
  });
  
  // Right side: Invoice number
  doc.font('Helvetica').fontSize(10).fillColor('#6b7280');
  doc.text(`#${invoice.invoiceNumber}`, marginLeft, headerStartY + 35, { 
    width: contentWidth, 
    align: 'right' 
  });
  
  yPos = Math.max(leftY, headerStartY + 60) + 25;

  // ============================================
  // BILL TO (left) | Dates (right)
  // ============================================
  
  const billToStartY = yPos;
  
  // Left side: Bill To
  if (client) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#6b7280');
    doc.text('Bill To', marginLeft, yPos);
    yPos += 14;
    
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000');
    doc.text(client.name, marginLeft, yPos);
    yPos += 14;
    
    doc.font('Helvetica').fontSize(9).fillColor('#6b7280');
    if (client.email) {
      doc.text(client.email, marginLeft, yPos);
      yPos += 12;
    }
    if (client.phone) {
      doc.text(client.phone, marginLeft, yPos);
      yPos += 12;
    }
    if (client.address) {
      doc.text(client.address, marginLeft, yPos);
      yPos += 12;
    }
  }
  
  // Right side: Dates (aligned right)
  let dateY = billToStartY;
  const dateLabelWidth = 65;
  const dateValueWidth = 80;
  const dateRightEdge = marginRight;
  
  doc.font('Helvetica').fontSize(9).fillColor('#6b7280');
  doc.text('Issue Date:', dateRightEdge - dateLabelWidth - dateValueWidth, dateY, { width: dateLabelWidth, align: 'right' });
  doc.font('Helvetica-Bold').fillColor('#000000');
  doc.text(formatDate(invoice.issueDate), dateRightEdge - dateValueWidth, dateY, { width: dateValueWidth, align: 'right' });
  dateY += 16;
  
  doc.font('Helvetica').fontSize(9).fillColor('#6b7280');
  doc.text('Due Date:', dateRightEdge - dateLabelWidth - dateValueWidth, dateY, { width: dateLabelWidth, align: 'right' });
  doc.font('Helvetica-Bold').fillColor('#000000');
  doc.text(formatDate(invoice.dueDate), dateRightEdge - dateValueWidth, dateY, { width: dateValueWidth, align: 'right' });
  
  yPos = Math.max(yPos, dateY + 15) + 25;

  // ============================================
  // LINE ITEMS TABLE (matching Pay page grid)
  // ============================================
  
  // Column positions matching 12-col grid (col-span-6, col-span-2, col-span-2, col-span-2)
  const colDesc = marginLeft;
  const colQty = marginLeft + (contentWidth * 0.5);   // 50% width for description
  const colRate = marginLeft + (contentWidth * 0.67); // 67%
  const colAmount = marginLeft + (contentWidth * 0.83); // 83%
  
  // Table header (uppercase, tracking-wider) - uses brand color
  doc.font('Helvetica-Bold').fontSize(8).fillColor(brandColor);
  doc.text('Description', colDesc, yPos);
  doc.text('Qty', colQty, yPos, { width: contentWidth * 0.16, align: 'right' });
  doc.text('Rate', colRate, yPos, { width: contentWidth * 0.16, align: 'right' });
  doc.text('Amount', colAmount, yPos, { width: contentWidth * 0.17, align: 'right' });
  
  yPos += 12;
  
  // Header border (border-b-2) - uses brand color
  doc.lineWidth(1.5);
  doc.moveTo(marginLeft, yPos).lineTo(marginRight, yPos).stroke(brandColor);
  doc.lineWidth(1);
  yPos += 15;
  
  // Line items
  items.forEach((item, index) => {
    doc.font('Helvetica').fontSize(10).fillColor('#000000');
    doc.text(item.description, colDesc, yPos, { width: contentWidth * 0.48 });
    
    doc.fillColor('#6b7280');
    doc.text(item.quantity, colQty, yPos, { width: contentWidth * 0.16, align: 'right' });
    doc.text(formatCurrency(item.rate, currency), colRate, yPos, { width: contentWidth * 0.16, align: 'right' });
    
    doc.font('Helvetica-Bold').fillColor('#000000');
    doc.text(formatCurrency(item.lineTotal, currency), colAmount, yPos, { width: contentWidth * 0.17, align: 'right' });
    
    yPos += 20;
    
    // Row border (border-b border-muted)
    doc.moveTo(marginLeft, yPos).lineTo(marginRight, yPos).stroke('#e5e7eb');
    yPos += 15;
  });
  
  yPos += 10;

  // ============================================
  // TOTALS (flex justify-end, max-w-xs)
  // ============================================
  
  const totalsWidth = 180;
  const totalsLeft = marginRight - totalsWidth;
  
  // Subtotal
  doc.font('Helvetica').fontSize(10).fillColor('#6b7280');
  doc.text('Subtotal', totalsLeft, yPos);
  doc.fillColor('#000000');
  doc.text(formatCurrency(invoice.subtotal, currency), totalsLeft, yPos, { width: totalsWidth, align: 'right' });
  yPos += 16;
  
  // Tax
  doc.font('Helvetica').fontSize(10).fillColor('#6b7280');
  doc.text('Tax', totalsLeft, yPos);
  doc.fillColor('#000000');
  doc.text(formatCurrency(invoice.taxAmount, currency), totalsLeft, yPos, { width: totalsWidth, align: 'right' });
  yPos += 18;
  
  // Separator line
  doc.moveTo(totalsLeft, yPos).lineTo(marginRight, yPos).stroke('#e5e7eb');
  yPos += 12;
  
  // Total (text-xl font-bold) - amount uses brand color
  doc.font('Helvetica-Bold').fontSize(16).fillColor('#000000');
  doc.text('Total', totalsLeft, yPos);
  doc.fillColor(brandColor);
  doc.text(formatCurrency(invoice.total, currency), totalsLeft, yPos, { width: totalsWidth, align: 'right' });

  return doc;
}

// Synchronous wrapper for backwards compatibility
export function generateInvoicePDF(data: InvoiceData): typeof PDFDocument.prototype {
  // Create a simple sync version without logo for immediate use
  // The async version will be called from routes
  const doc = new PDFDocument({ 
    size: 'A4',
    margin: 50,
  });

  const { invoice, items, business, client } = data;
  const currency = business?.currency || 'USD';
  const brandColor = business?.brandColor || DEFAULT_BRAND_COLOR;
  
  const pageWidth = doc.page.width;
  const marginLeft = 50;
  const marginRight = pageWidth - 50;
  const contentWidth = marginRight - marginLeft;
  
  let yPos = 50;
  let leftY = yPos;
  
  // Left side: Company name
  if (business) {
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#000000');
    doc.text(business.businessName || '', marginLeft, leftY);
    leftY += 24;
    
    doc.font('Helvetica').fontSize(9).fillColor('#6b7280');
    if (business.email) {
      doc.text(business.email, marginLeft, leftY);
      leftY += 13;
    }
    if (business.phone) {
      doc.text(business.phone, marginLeft, leftY);
      leftY += 13;
    }
    if (business.address) {
      doc.text(business.address, marginLeft, leftY);
      leftY += 13;
    }
  }
  
  // Right side: INVOICE title - uses brand color
  doc.font('Helvetica-Bold').fontSize(28).fillColor(brandColor);
  doc.text('INVOICE', marginLeft, yPos, { width: contentWidth, align: 'right' });
  doc.font('Helvetica').fontSize(10).fillColor('#6b7280');
  doc.text(`#${invoice.invoiceNumber}`, marginLeft, yPos + 35, { width: contentWidth, align: 'right' });
  
  yPos = Math.max(leftY, yPos + 60) + 25;
  
  // Bill To section
  const billToStartY = yPos;
  if (client) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#6b7280').text('Bill To', marginLeft, yPos);
    yPos += 14;
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000').text(client.name, marginLeft, yPos);
    yPos += 14;
    doc.font('Helvetica').fontSize(9).fillColor('#6b7280');
    if (client.email) { doc.text(client.email, marginLeft, yPos); yPos += 12; }
    if (client.phone) { doc.text(client.phone, marginLeft, yPos); yPos += 12; }
  }
  
  // Dates
  let dateY = billToStartY;
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
  
  // Table
  const colDesc = marginLeft;
  const colQty = marginLeft + (contentWidth * 0.5);
  const colRate = marginLeft + (contentWidth * 0.67);
  const colAmount = marginLeft + (contentWidth * 0.83);
  
  // Table header - uses brand color
  doc.font('Helvetica-Bold').fontSize(8).fillColor(brandColor);
  doc.text('Description', colDesc, yPos);
  doc.text('Qty', colQty, yPos, { width: contentWidth * 0.16, align: 'right' });
  doc.text('Rate', colRate, yPos, { width: contentWidth * 0.16, align: 'right' });
  doc.text('Amount', colAmount, yPos, { width: contentWidth * 0.17, align: 'right' });
  yPos += 12;
  // Table header border - uses brand color
  doc.lineWidth(1.5).moveTo(marginLeft, yPos).lineTo(marginRight, yPos).stroke(brandColor);
  doc.lineWidth(1);
  yPos += 15;
  
  items.forEach((item) => {
    doc.font('Helvetica').fontSize(10).fillColor('#000000');
    doc.text(item.description, colDesc, yPos, { width: contentWidth * 0.48 });
    doc.fillColor('#6b7280');
    doc.text(item.quantity, colQty, yPos, { width: contentWidth * 0.16, align: 'right' });
    doc.text(formatCurrency(item.rate, currency), colRate, yPos, { width: contentWidth * 0.16, align: 'right' });
    doc.font('Helvetica-Bold').fillColor('#000000');
    doc.text(formatCurrency(item.lineTotal, currency), colAmount, yPos, { width: contentWidth * 0.17, align: 'right' });
    yPos += 20;
    doc.moveTo(marginLeft, yPos).lineTo(marginRight, yPos).stroke('#e5e7eb');
    yPos += 15;
  });
  
  yPos += 10;
  const totalsWidth = 180;
  const totalsLeft = marginRight - totalsWidth;
  
  doc.font('Helvetica').fontSize(10).fillColor('#6b7280').text('Subtotal', totalsLeft, yPos);
  doc.fillColor('#000000').text(formatCurrency(invoice.subtotal, currency), totalsLeft, yPos, { width: totalsWidth, align: 'right' });
  yPos += 16;
  doc.font('Helvetica').fontSize(10).fillColor('#6b7280').text('Tax', totalsLeft, yPos);
  doc.fillColor('#000000').text(formatCurrency(invoice.taxAmount, currency), totalsLeft, yPos, { width: totalsWidth, align: 'right' });
  yPos += 18;
  doc.moveTo(totalsLeft, yPos).lineTo(marginRight, yPos).stroke('#e5e7eb');
  yPos += 12;
  // Total - amount uses brand color
  doc.font('Helvetica-Bold').fontSize(16).fillColor('#000000');
  doc.text('Total', totalsLeft, yPos);
  doc.fillColor(brandColor);
  doc.text(formatCurrency(invoice.total, currency), totalsLeft, yPos, { width: totalsWidth, align: 'right' });

  return doc;
}
