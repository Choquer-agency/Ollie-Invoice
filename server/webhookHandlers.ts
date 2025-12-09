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
          
          // Generate an invoice from Ollie Invoice to the customer
          try {
            await this.generateOllieInvoice(businessId, session.amount_total / 100, 'Monthly Subscription', true);
          } catch (invoiceError) {
            // Don't fail the webhook - the subscription is still valid
          }
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
          } catch (paymentError) {
            // Payment record failed but invoice is already marked as paid
          }
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
        } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
          await storage.updateBusiness(businessId, {
            subscriptionTier: 'free',
          });
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
          
          // Generate a monthly invoice from Ollie Invoice to the customer
          try {
            // Amount is in cents, convert to dollars
            const amount = invoice.amount_paid / 100;
            await this.generateOllieInvoice(businessId, amount, 'Monthly Subscription - Recurring', false);
          } catch (invoiceError) {
            // Don't fail the webhook - the subscription payment is still valid
          }
        }
      }
    } else if (event.type === 'invoice.payment_failed') {
      // Handle failed subscription payments - Stripe will retry and eventually cancel if needed
      // No action required here
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
          } catch (paymentError) {
            // Payment record failed but invoice is already marked as paid
          }
        }
        // Invoice already paid - skip duplicate webhook
      }
    }
  }

  /**
   * Generate an invoice from Ollie Invoice (your business) to a customer
   * when they subscribe or their subscription renews
   */
  static async generateOllieInvoice(
    customerBusinessId: string,
    amount: number,
    description: string,
    isInitial: boolean
  ): Promise<void> {
    // Get or create the Ollie Invoice business
    let ollieBusiness = await storage.getOllieBusiness();
    
    if (!ollieBusiness) {
      // Ollie business not configured - skip invoice generation
      return;
    }
    
    // Get the customer's business to use as the client
    const customerBusiness = await storage.getBusiness(customerBusinessId);
    if (!customerBusiness) {
      return;
    }
    
    // Check if customer already exists as a client for Ollie business
    const existingClients = await storage.getClientsByBusinessId(ollieBusiness.id);
    let client = existingClients.find(c => 
      c.email === customerBusiness.email || 
      c.name === customerBusiness.businessName
    );
    
    // Create client if doesn't exist
    if (!client) {
      client = await storage.createClient({
        businessId: ollieBusiness.id,
        name: customerBusiness.businessName,
        email: customerBusiness.email || undefined,
        phone: customerBusiness.phone || undefined,
        address: customerBusiness.address || undefined,
        companyName: customerBusiness.businessName,
      });
    }
    
    // Get next invoice number for Ollie business
    const invoiceNumber = await storage.getNextInvoiceNumber(ollieBusiness.id);
    
    // Create the invoice marked as paid
    const now = new Date();
    await storage.createInvoice(
      {
        businessId: ollieBusiness.id,
        clientId: client.id,
        invoiceNumber,
        status: 'paid',
        issueDate: now,
        dueDate: now, // Due immediately since it's already paid
        paidAt: now,
        subtotal: amount.toFixed(2),
        taxAmount: '0',
        total: amount.toFixed(2),
        amountPaid: amount.toFixed(2),
        notes: isInitial 
          ? 'Thank you for subscribing to Ollie Invoice Pro!' 
          : 'Thank you for your continued subscription to Ollie Invoice Pro!',
        paymentMethod: 'stripe',
      },
      [
        {
          invoiceId: '', // Will be set by createInvoice
          description,
          quantity: '1',
          rate: amount.toFixed(2),
          lineTotal: amount.toFixed(2),
          taxAmount: '0',
        }
      ]
    );
  }
}
