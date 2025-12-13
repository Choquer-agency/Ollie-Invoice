import { storage } from './storage';
import { sendInvoiceEmail } from './emailClient';

/**
 * Process all recurring invoices that are due
 * This should be called daily at 12:01 AM
 */
export async function processRecurringInvoices(): Promise<{
  processed: number;
  sent: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let processed = 0;
  let sent = 0;

  try {
    // Get all recurring invoices that are due
    const dueInvoices = await storage.getRecurringInvoicesDue();

    for (const templateInvoice of dueInvoices) {
      try {
        // Create a new invoice from the template
        const newInvoice = await storage.duplicateInvoiceAsNew(templateInvoice);
        processed++;

        // Get the full invoice with relations for emailing
        const fullInvoice = await storage.getInvoice(newInvoice.id);
        if (!fullInvoice) {
          errors.push(`Failed to retrieve newly created invoice ${newInvoice.id}`);
          continue;
        }

        // Send the invoice email if client has email
        if (fullInvoice.client?.email) {
          const emailResult = await sendInvoiceEmail({
            invoiceNumber: newInvoice.invoiceNumber,
            total: newInvoice.total as string,
            dueDate: newInvoice.dueDate,
            shareToken: newInvoice.shareToken,
            clientName: fullInvoice.client.name,
            clientEmail: fullInvoice.client.email,
            businessName: fullInvoice.business?.businessName || 'Your Business',
            businessEmail: fullInvoice.business?.email,
            businessLogoUrl: fullInvoice.business?.logoUrl,
            currency: fullInvoice.business?.currency || 'USD',
            sendCopyToOwner: fullInvoice.business?.sendInvoiceCopy || false,
            ownerCopyEmail: fullInvoice.business?.invoiceCopyEmail,
            hideBranding: (fullInvoice.business as any)?.hideBranding || false,
          });

          if (emailResult.success) {
            sent++;
          } else {
            errors.push(`Failed to send invoice #${newInvoice.invoiceNumber}: ${emailResult.error}`);
          }
        }

        // Update the recurring schedule for the template
        await storage.updateRecurringSchedule(templateInvoice.id);

      } catch (invoiceError: any) {
        const errorMsg = `Error processing template ${templateInvoice.invoiceNumber}: ${invoiceError.message}`;
        errors.push(errorMsg);
      }
    }
    
  } catch (error: any) {
    const errorMsg = `Critical error in recurring invoice processor: ${error.message}`;
    errors.push(errorMsg);
  }

  return { processed, sent, errors };
}

/**
 * Calculate the next recurring date based on frequency settings
 * This is useful when setting up a new recurring invoice
 */
export function calculateNextRecurringDate(
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly',
  recurringEvery: number = 1,
  recurringDay?: number,
  recurringMonth?: number,
  startFrom: Date = new Date()
): Date {
  const nextDate = new Date(startFrom);
  
  switch (frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + recurringEvery);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + (7 * recurringEvery));
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + recurringEvery);
      if (recurringDay) {
        const daysInMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        nextDate.setDate(Math.min(recurringDay, daysInMonth));
      }
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + recurringEvery);
      if (recurringMonth) {
        nextDate.setMonth(recurringMonth - 1);
      }
      if (recurringDay) {
        const daysInMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        nextDate.setDate(Math.min(recurringDay, daysInMonth));
      }
      break;
  }
  
  return nextDate;
}

