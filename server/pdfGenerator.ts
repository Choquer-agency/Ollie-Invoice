import PDFDocument from 'pdfkit';
import type { InvoiceWithRelations, Business, Client, InvoiceItem } from '@shared/schema';

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
    month: 'long', 
    day: 'numeric' 
  });
}

function formatCurrency(amount: string | number, currency: string = 'USD'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(num);
}

export function generateInvoicePDF(data: InvoiceData): typeof PDFDocument.prototype {
  const doc = new PDFDocument({ 
    size: 'A4',
    margin: 50,
  });

  const { invoice, items, business, client } = data;
  const currency = business?.currency || 'USD';

  doc.font('Helvetica-Bold').fontSize(28).text('INVOICE', 50, 50);
  
  doc.font('Helvetica').fontSize(10);
  doc.text(`Invoice #: ${invoice.invoiceNumber}`, 50, 90);
  doc.text(`Issue Date: ${formatDate(invoice.issueDate)}`, 50, 105);
  doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, 50, 120);
  
  const statusColors: Record<string, string> = {
    paid: '#22c55e',
    sent: '#3b82f6',
    overdue: '#ef4444',
    draft: '#6b7280',
  };
  
  const statusColor = statusColors[invoice.status] || '#6b7280';
  doc.fillColor(statusColor)
     .font('Helvetica-Bold')
     .fontSize(12)
     .text(invoice.status.toUpperCase(), 450, 50, { width: 100, align: 'right' });
  doc.fillColor('#000000');

  let yPos = 160;

  if (business) {
    doc.font('Helvetica-Bold').fontSize(12).text('From:', 50, yPos);
    yPos += 18;
    doc.font('Helvetica').fontSize(10);
    if (business.businessName) {
      doc.font('Helvetica-Bold').text(business.businessName, 50, yPos);
      yPos += 15;
    }
    doc.font('Helvetica');
    if (business.address) {
      const addressLines = business.address.split('\n');
      addressLines.forEach(line => {
        doc.text(line, 50, yPos);
        yPos += 12;
      });
    }
    if (business.email) {
      doc.text(business.email, 50, yPos);
      yPos += 12;
    }
    if (business.phone) {
      doc.text(business.phone, 50, yPos);
      yPos += 12;
    }
    if (business.taxNumber) {
      doc.text(`Tax ID: ${business.taxNumber}`, 50, yPos);
      yPos += 12;
    }
  }

  let clientY = 160;
  if (client) {
    doc.font('Helvetica-Bold').fontSize(12).text('Bill To:', 300, clientY);
    clientY += 18;
    doc.font('Helvetica').fontSize(10);
    doc.font('Helvetica-Bold').text(client.name, 300, clientY);
    clientY += 15;
    doc.font('Helvetica');
    if (client.address) {
      const addressLines = client.address.split('\n');
      addressLines.forEach(line => {
        doc.text(line, 300, clientY);
        clientY += 12;
      });
    }
    if (client.email) {
      doc.text(client.email, 300, clientY);
      clientY += 12;
    }
    if (client.phone) {
      doc.text(client.phone, 300, clientY);
      clientY += 12;
    }
  }

  yPos = Math.max(yPos, clientY) + 30;

  const tableTop = yPos;
  const tableHeaders = ['Description', 'Qty', 'Rate', 'Amount'];
  const colWidths = [250, 60, 100, 100];
  const colX = [50, 300, 360, 460];

  doc.rect(50, tableTop, 510, 25).fill('#f3f4f6');
  doc.fillColor('#000000').font('Helvetica-Bold').fontSize(10);
  
  tableHeaders.forEach((header, i) => {
    const align = i > 0 ? 'right' : 'left';
    doc.text(header, colX[i], tableTop + 8, { 
      width: colWidths[i], 
      align: align as 'left' | 'right' | 'center' | 'justify'
    });
  });

  yPos = tableTop + 30;
  doc.font('Helvetica').fontSize(10);

  items.forEach((item, index) => {
    if (index % 2 === 0) {
      doc.rect(50, yPos - 5, 510, 25).fill('#fafafa');
      doc.fillColor('#000000');
    }
    
    doc.text(item.description, colX[0], yPos, { width: colWidths[0] });
    doc.text(item.quantity, colX[1], yPos, { width: colWidths[1], align: 'right' });
    doc.text(formatCurrency(item.rate, currency), colX[2], yPos, { width: colWidths[2], align: 'right' });
    doc.text(formatCurrency(item.lineTotal, currency), colX[3], yPos, { width: colWidths[3], align: 'right' });
    
    yPos += 25;
  });

  yPos += 20;
  doc.moveTo(350, yPos).lineTo(560, yPos).stroke('#e5e7eb');
  yPos += 10;

  doc.font('Helvetica').fontSize(10);
  doc.text('Subtotal:', 360, yPos);
  doc.text(formatCurrency(invoice.subtotal, currency), 460, yPos, { width: 100, align: 'right' });
  yPos += 18;

  if (parseFloat(invoice.taxAmount) > 0) {
    doc.text('Tax:', 360, yPos);
    doc.text(formatCurrency(invoice.taxAmount, currency), 460, yPos, { width: 100, align: 'right' });
    yPos += 18;
  }

  doc.moveTo(350, yPos).lineTo(560, yPos).stroke('#e5e7eb');
  yPos += 10;

  doc.font('Helvetica-Bold').fontSize(14);
  doc.text('Total:', 360, yPos);
  doc.text(formatCurrency(invoice.total, currency), 460, yPos, { width: 100, align: 'right' });

  yPos += 50;

  if (invoice.paymentMethod === 'etransfer' || invoice.paymentMethod === 'both' || !invoice.paymentMethod) {
    if (business?.etransferEmail || business?.etransferInstructions) {
      doc.font('Helvetica-Bold').fontSize(12).text('Payment Instructions', 50, yPos);
      yPos += 18;
      doc.font('Helvetica').fontSize(10);
      if (business.etransferEmail) {
        doc.text(`E-Transfer to: ${business.etransferEmail}`, 50, yPos);
        yPos += 15;
      }
      if (business.etransferInstructions) {
        doc.text(business.etransferInstructions, 50, yPos, { width: 500 });
        yPos += 30;
      }
    }
  }

  if (invoice.notes) {
    yPos += 10;
    doc.font('Helvetica-Bold').fontSize(12).text('Notes', 50, yPos);
    yPos += 18;
    doc.font('Helvetica').fontSize(10).text(invoice.notes, 50, yPos, { width: 500 });
  }

  doc.fontSize(8)
     .fillColor('#9ca3af')
     .text(
       'Thank you for your business!',
       50,
       doc.page.height - 50,
       { align: 'center', width: doc.page.width - 100 }
     );

  return doc;
}
