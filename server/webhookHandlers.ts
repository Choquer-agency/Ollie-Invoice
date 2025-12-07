import { getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const stripe = await getUncachableStripeClient();
    
    // Get webhook secret from environment
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    }

    // Verify webhook signature
    const sig = Array.isArray(signature) ? signature[0] : signature;
    let event;
    
    try {
      event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
    } catch (err: any) {
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }
    
    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const invoiceId = session.metadata?.invoiceId;
      
      if (invoiceId) {
        // Get the payment intent ID from the session
        const paymentIntentId = session.payment_intent as string | null;
        const amountTotal = session.amount_total ? (session.amount_total / 100).toString() : '0';
        
        // Update invoice status to paid
        await storage.updateInvoice(invoiceId, {
          status: 'paid',
          paidAt: new Date(),
        });
        
        // Record payment in the payments table
        try {
          await storage.createPayment({
            invoiceId,
            stripePaymentIntent: paymentIntentId,
            amount: amountTotal,
            status: 'completed',
            paymentMethod: 'stripe',
          });
          console.log(`Payment recorded for invoice ${invoiceId}: ${paymentIntentId}`);
        } catch (paymentError) {
          // Log error but don't fail - invoice is already marked as paid
          console.error(`Failed to record payment for invoice ${invoiceId}:`, paymentError);
        }
        
        console.log(`Invoice ${invoiceId} marked as paid via Stripe checkout.session.completed webhook`);
      }
    } else if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as any;
      const invoiceId = paymentIntent.metadata?.invoiceId;
      
      if (invoiceId) {
        // Get payment details from the payment intent
        const paymentIntentId = paymentIntent.id;
        const amount = paymentIntent.amount ? (paymentIntent.amount / 100).toString() : '0';
        
        // Check if invoice is already paid (checkout.session.completed may have fired first)
        const invoice = await storage.getInvoice(invoiceId);
        if (invoice && invoice.status !== 'paid') {
          // Update invoice status to paid
          await storage.updateInvoice(invoiceId, {
            status: 'paid',
            paidAt: new Date(),
          });
          
          // Record payment in the payments table
          try {
            await storage.createPayment({
              invoiceId,
              stripePaymentIntent: paymentIntentId,
              amount,
              status: 'completed',
              paymentMethod: 'stripe',
            });
            console.log(`Payment recorded for invoice ${invoiceId}: ${paymentIntentId}`);
          } catch (paymentError) {
            // Log error but don't fail - invoice is already marked as paid
            console.error(`Failed to record payment for invoice ${invoiceId}:`, paymentError);
          }
          
          console.log(`Invoice ${invoiceId} marked as paid via Stripe payment_intent.succeeded webhook`);
        } else {
          console.log(`Invoice ${invoiceId} already marked as paid, skipping duplicate webhook`);
        }
      }
    }
  }
}
