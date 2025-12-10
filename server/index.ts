// Initialize Sentry first for error tracking
import { initSentry, captureException, Sentry } from './sentry';
initSentry();

import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { WebhookHandlers } from './webhookHandlers';
import { getUncachableStripeClient } from './stripeClient';
import cron from 'node-cron';
import { processRecurringInvoices } from './recurringInvoices';
import { log, logger } from './logger';

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

async function initStripe() {
  const hasStripeCredentials = process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY;

  if (!hasStripeCredentials) {
    log.info('Stripe credentials not configured');
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();
    await stripe.accounts.retrieve(); // Test connection
    log.info('Stripe connection verified');
  } catch (error) {
    log.warn('Stripe initialization failed - continuing without Stripe');
  }
}

async function initResend() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    log.info('Resend credentials not configured - email sending disabled');
    return;
  }

  if (!apiKey.startsWith('re_') || !fromEmail.includes('@')) {
    log.warn('Resend configuration appears invalid');
    return;
  }
  
  log.info('Resend configuration verified');
}

(async () => {
  await initStripe();
  await initResend();

  // Stripe webhook endpoint (without UUID requirement)
  app.post(
    '/api/stripe/webhook',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      const signature = req.headers['stripe-signature'];

      if (!signature) {
        return res.status(400).json({ error: 'Missing stripe-signature' });
      }

      try {
        const sig = Array.isArray(signature) ? signature[0] : signature;

        if (!Buffer.isBuffer(req.body)) {
          return res.status(500).json({ error: 'Webhook processing error' });
        }

        await WebhookHandlers.processWebhook(req.body as Buffer, sig);

        res.status(200).json({ received: true });
      } catch (error: any) {
        res.status(400).json({ error: 'Webhook processing error' });
      }
    }
  );

  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false }));
  
  // Cookie parser for admin auth tokens
  app.use(cookieParser());

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        log.request({
          method: req.method,
          url: path,
          statusCode: res.statusCode,
          duration,
        });
      }
    });

    next();
  });

  await registerRoutes(httpServer, app);

  // Global error handler with Sentry integration
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Capture error in Sentry for 500 errors
    if (status >= 500) {
      captureException(err);
    }

    res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // Process any missed recurring invoices on startup (catch-up logic)
  // This handles cases where the server was down at the scheduled time
  log.info('Checking for missed recurring invoices on startup...', { source: 'cron' });
  try {
    const startupResult = await processRecurringInvoices();
    if (startupResult.processed > 0) {
      log.info('Startup catch-up complete', { 
        source: 'cron',
        processed: startupResult.processed, 
        sent: startupResult.sent,
        errors: startupResult.errors.length 
      });
    }
  } catch (error: any) {
    log.error('Error checking for missed recurring invoices', { 
      source: 'cron', 
      error: error.message 
    });
  }

  // Schedule recurring invoice processor to run daily at 12:01 AM
  cron.schedule('1 0 * * *', async () => {
    log.info('Starting daily recurring invoice processing', { source: 'cron' });
    try {
      const result = await processRecurringInvoices();
      log.info('Recurring invoices processed', { 
        source: 'cron',
        processed: result.processed, 
        sent: result.sent,
        errors: result.errors.length 
      });
    } catch (error: any) {
      log.error('Critical error in recurring invoice cron', { 
        source: 'cron', 
        error: error.message 
      });
    }
  });
  log.info('Recurring invoice scheduler initialized (runs daily at 12:01 AM)', { source: 'cron' });

  const port = parseInt(process.env.PORT || "3000", 10);
  httpServer.listen(port, "0.0.0.0", () => {
    log.info('Server started', { port });
  });
})();
