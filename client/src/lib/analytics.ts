import { posthog } from './posthog';

// =============================================================================
// ANALYTICS EVENT TRACKING
// Centralized event tracking for PostHog analytics
// =============================================================================

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

type CTALocation = 
  | 'hero' 
  | 'pricing_section' 
  | 'pricing_page' 
  | 'footer' 
  | 'nav' 
  | 'how_it_works'
  | 'final_cta';

type AuthMethod = 'email' | 'google';

type UpgradeSource = 
  | 'settings' 
  | 'invoice_limit_modal' 
  | 'create_invoice' 
  | 'usage_indicator'
  | 'dashboard';

type PaymentMethod = 'stripe' | 'etransfer';

type ProFeature = 
  | 'recurring_invoices' 
  | 'custom_branding' 
  | 'brand_color';

// -----------------------------------------------------------------------------
// Acquisition Events (Marketing / Landing)
// -----------------------------------------------------------------------------

/**
 * Track when a user clicks a CTA button
 */
export function trackCTAClicked(location: CTALocation) {
  posthog.capture('cta_clicked', { location });
}

/**
 * Track when user views the pricing section or page
 */
export function trackPricingViewed(source: 'landing' | 'nav' | 'direct') {
  posthog.capture('pricing_viewed', { source });
}

/**
 * Track when user opens an FAQ accordion
 */
export function trackFAQOpened(question: string) {
  posthog.capture('faq_opened', { question });
}

// -----------------------------------------------------------------------------
// Authentication Events
// -----------------------------------------------------------------------------

/**
 * Track when user starts the signup process
 */
export function trackSignupStarted(method: AuthMethod) {
  posthog.capture('signup_started', { method });
}

/**
 * Track when signup is completed successfully
 */
export function trackSignupCompleted(method: AuthMethod, hasCompany: boolean) {
  posthog.capture('signup_completed', { 
    method, 
    has_company: hasCompany 
  });
}

/**
 * Track when user logs in
 */
export function trackLogin(method: AuthMethod) {
  posthog.capture('login', { method });
}

// -----------------------------------------------------------------------------
// User Identification
// -----------------------------------------------------------------------------

interface UserProperties {
  email?: string;
  name?: string;
  plan: 'free' | 'pro';
  signupDate?: string;
  invoiceCount?: number;
  businessName?: string;
}

/**
 * Identify a user for cohort analysis
 * Call this after login/signup with user details
 */
export function identifyUser(userId: string, properties: UserProperties) {
  posthog.identify(userId, {
    email: properties.email,
    name: properties.name,
    plan: properties.plan,
    signup_date: properties.signupDate,
    invoice_count: properties.invoiceCount,
    business_name: properties.businessName,
  });
}

/**
 * Update user properties (e.g., when they upgrade)
 */
export function updateUserProperties(properties: Partial<UserProperties>) {
  posthog.capture('$set', { $set: properties });
}

/**
 * Reset user identification (on logout)
 */
export function resetUser() {
  posthog.reset();
}

// -----------------------------------------------------------------------------
// Activation Events (First Value)
// -----------------------------------------------------------------------------

/**
 * Track when user completes business profile setup
 */
export function trackBusinessSetupCompleted(options: {
  hasLogo: boolean;
  hasStripe: boolean;
  hasEtransfer: boolean;
}) {
  posthog.capture('business_setup_completed', {
    has_logo: options.hasLogo,
    has_stripe: options.hasStripe,
    has_etransfer: options.hasEtransfer,
  });
}

/**
 * Track when a client is created
 */
export function trackClientCreated(clientNumber: number) {
  posthog.capture('client_created', { 
    client_number: clientNumber,
    is_first: clientNumber === 1,
  });
}

/**
 * Track when an invoice is created (saved as draft or sent)
 */
export function trackInvoiceCreated(options: {
  invoiceNumber: string;
  total: number;
  hasRecurring: boolean;
  itemCount: number;
  status: 'draft' | 'sent';
}) {
  posthog.capture('invoice_created', {
    invoice_number: options.invoiceNumber,
    total: options.total,
    has_recurring: options.hasRecurring,
    item_count: options.itemCount,
    status: options.status,
  });
}

/**
 * Track when an invoice is sent to client
 */
export function trackInvoiceSent(options: {
  invoiceNumber: string;
  total: number;
  isResend?: boolean;
}) {
  posthog.capture('invoice_sent', {
    invoice_number: options.invoiceNumber,
    total: options.total,
    is_resend: options.isResend || false,
  });
}

// -----------------------------------------------------------------------------
// Revenue Events (Monetization)
// -----------------------------------------------------------------------------

/**
 * Track when user initiates upgrade to Pro
 */
export function trackUpgradeStarted(source: UpgradeSource) {
  posthog.capture('upgrade_started', { source });
}

/**
 * Track when upgrade is completed successfully
 */
export function trackUpgradeCompleted(plan: 'pro') {
  posthog.capture('upgrade_completed', { plan });
  // Also update user properties
  updateUserProperties({ plan });
}

/**
 * Track when user cancels subscription
 */
export function trackSubscriptionCancelled(reason?: string) {
  posthog.capture('subscription_cancelled', { 
    reason: reason || 'not_specified' 
  });
}

// -----------------------------------------------------------------------------
// Engagement / Retention Events
// -----------------------------------------------------------------------------

/**
 * Track invoice milestones (2nd, 5th, 10th, 25th, 50th, 100th)
 */
export function trackInvoiceMilestone(milestone: number, daysSinceSignup: number) {
  posthog.capture('invoice_milestone', {
    milestone,
    days_since_signup: daysSinceSignup,
  });
}

/**
 * Track when a payment is received from a client
 */
export function trackPaymentReceived(options: {
  amount: number;
  paymentMethod: PaymentMethod;
  invoiceNumber: string;
}) {
  posthog.capture('payment_received', {
    amount: options.amount,
    payment_method: options.paymentMethod,
    invoice_number: options.invoiceNumber,
  });
}

/**
 * Track when a Pro feature is used
 */
export function trackFeatureUsed(feature: ProFeature) {
  posthog.capture('feature_used', { feature });
}

// -----------------------------------------------------------------------------
// Page/Section Tracking Helpers
// -----------------------------------------------------------------------------

/**
 * Track when user scrolls to a specific section
 * Useful for tracking engagement with landing page sections
 */
export function trackSectionViewed(section: string) {
  posthog.capture('section_viewed', { section });
}

