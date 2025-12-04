import { getStripeSync } from './stripeClient';
import { storage } from './storage';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string, uuid: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    const event = await sync.processWebhook(payload, signature, uuid);
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const invoiceId = session.metadata?.invoiceId;
      
      if (invoiceId) {
        await storage.updateInvoice(invoiceId, {
          status: 'paid',
          paidAt: new Date(),
        });
        console.log(`Invoice ${invoiceId} marked as paid via Stripe webhook`);
      }
    }
  }
}
