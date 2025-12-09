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
      
      // Check if this is a subscription checkout (Pro upgrade)
      if (session.mode === 'subscription') {
        const businessId = session.metadata?.businessId;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        
        if (businessId && customerId) {
          // Update business to Pro tier and save customer ID
          await storage.updateBusiness(businessId, {
            subscriptionTier: 'pro',
            stripeCustomerId: customerId,
          });
          console.log(`Business ${businessId} upgraded to Pro via subscription checkout`);
          console.log(`  Customer: ${customerId}`);
          console.log(`  Subscription: ${subscriptionId}`);
          console.log(`  Payment status: ${session.payment_status}`);
        } else {
          console.error('Missing businessId or customerId in subscription checkout:', { businessId, customerId, session: session.id });
        }
      } else {
        // Invoice payment checkout
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
      }
    } else if (event.type === 'customer.subscription.deleted') {
      // Handle subscription cancellation
      const subscription = event.data.object as any;
      const businessId = subscription.metadata?.businessId;
      
      if (businessId) {
        // Downgrade business to free tier
        await storage.updateBusiness(businessId, {
          subscriptionTier: 'free',
        });
        console.log(`Business ${businessId} downgraded to Free (subscription canceled)`);
      }
    } else if (event.type === 'customer.subscription.updated') {
      // Handle subscription updates (e.g., payment failed, subscription paused)
      const subscription = event.data.object as any;
      const businessId = subscription.metadata?.businessId;
      
      if (businessId) {
        // Check subscription status
        if (subscription.status === 'active') {
          await storage.updateBusiness(businessId, {
            subscriptionTier: 'pro',
          });
          console.log(`Business ${businessId} subscription active - Pro tier`);
        } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
          await storage.updateBusiness(businessId, {
            subscriptionTier: 'free',
          });
          console.log(`Business ${businessId} subscription ${subscription.status} - Free tier`);
        }
      }
    } else if (event.type === 'invoice.payment_succeeded') {
      // Handle subscription invoice payments (recurring billing)
      const invoice = event.data.object as any;
      const subscriptionId = invoice.subscription as string | null;
      
      if (subscriptionId) {
        // This is a subscription payment - ensure business stays on Pro tier
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const businessId = subscription.metadata?.businessId;
        
        if (businessId && subscription.status === 'active') {
          await storage.updateBusiness(businessId, {
            subscriptionTier: 'pro',
          });
          console.log(`Business ${businessId} subscription payment succeeded - confirming Pro tier`);
        }
      }
    } else if (event.type === 'invoice.payment_failed') {
      // Handle failed subscription payments
      const invoice = event.data.object as any;
      const subscriptionId = invoice.subscription as string | null;
      
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const businessId = subscription.metadata?.businessId;
        
        if (businessId) {
          console.warn(`Business ${businessId} subscription payment failed - subscription status: ${subscription.status}`);
          // Don't downgrade immediately - Stripe will retry and eventually cancel if needed
        }
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
