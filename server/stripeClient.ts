import Stripe from 'stripe';

// Get Stripe credentials from environment variables
function getStripeCredentials() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY not found in environment variables');
  }

  if (!publishableKey) {
    throw new Error('STRIPE_PUBLISHABLE_KEY not found in environment variables');
  }

  return {
    secretKey,
    publishableKey,
  };
}

// Stripe client - don't cache, create new instance each time
export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = getStripeCredentials();
  return new Stripe(secretKey, {
    apiVersion: '2025-08-27.basil',
  });
}

export async function getStripePublishableKey(): Promise<string> {
  const { publishableKey } = getStripeCredentials();
  return publishableKey;
}

export async function getStripeSecretKey(): Promise<string> {
  const { secretKey } = getStripeCredentials();
  return secretKey;
}
