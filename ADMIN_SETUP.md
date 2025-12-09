# Admin Dashboard & Auto-Invoice Setup

This document explains the admin dashboard feature that allows you to manage Ollie Invoice's own invoices and automatically generate invoices when customers subscribe.

## Overview

The admin dashboard provides:
- **Admin Access**: Secure admin-only access via user role
- **Ollie Business Management**: Configure your Ollie Invoice business profile
- **Automatic Invoice Generation**: Invoices are automatically created when customers subscribe or renew
- **Admin Dashboard**: View all subscription invoices in one place
- **Client Management**: Track all subscribed customers

## Setup Instructions

### Step 1: Run the Database Migration

First, apply the new database migration to add admin functionality:

```bash
npm run db:push
```

This migration adds:
- `is_admin` field to the users table
- `is_ollie_business` field to the businesses table

### Step 2: Grant Admin Access to Your Account

You need to manually set your user account as an admin in the database. You can do this through Supabase Studio or directly in PostgreSQL:

**Option A: Using Supabase Studio**
1. Go to your Supabase project dashboard
2. Navigate to the Table Editor
3. Open the `users` table
4. Find your user record (by email)
5. Set `is_admin` to `true`

**Option B: Using SQL**
```sql
-- Replace 'your-email@example.com' with your actual email
UPDATE users 
SET is_admin = true 
WHERE email = 'your-email@example.com';
```

### Step 3: Set Up Your Ollie Business Profile

1. Log in to Ollie Invoice with your admin account
2. You'll see a new "Admin" menu item in the sidebar (with a crown icon 👑)
3. Click on "Admin" to go to the admin dashboard
4. Click "Setup Ollie Business" button
5. Fill in your business information:
   - Business Name (e.g., "Ollie Invoice")
   - Email (shown on invoices sent to customers)
   - Phone
   - Address
   - Website
   - Currency (USD, CAD, EUR, etc.)
6. Click "Create Business"

### Step 4: How It Works

Once set up, the system automatically handles invoicing:

#### Initial Subscription
When a customer subscribes to Pro ($10/month):
1. Stripe processes the payment
2. The webhook handler receives the `checkout.session.completed` event
3. An invoice is automatically generated from your Ollie business to the customer
4. The invoice is marked as "Paid" with the subscription amount
5. The invoice appears in your Admin Dashboard

#### Recurring Subscriptions
Every month when Stripe charges the customer:
1. The webhook handler receives the `invoice.payment_succeeded` event
2. A new invoice is automatically generated for that month
3. The invoice is marked as "Paid"
4. The customer accumulates a monthly invoice history

#### Invoice Details
Each automatically generated invoice includes:
- **From**: Your Ollie Invoice business
- **To**: The customer's business (automatically created as a client)
- **Line Item**: "Monthly Subscription" (initial) or "Monthly Subscription - Recurring"
- **Amount**: The subscription price ($10 for Pro)
- **Status**: Paid (since Stripe already processed payment)
- **Date**: Current date

## Admin Dashboard Features

### Dashboard Stats
- **Total Revenue**: All paid subscription invoices
- **Outstanding**: Unpaid invoices (shouldn't normally happen for subscriptions)
- **Overdue**: Past-due invoices
- **Active Clients**: Number of subscribed customers

### Invoice Management
- View all invoices generated for subscriptions
- Click any invoice to view details
- Download PDFs
- Track payment history

### Client List
- View all subscribed customers as clients
- Includes their business information
- Email and contact details

## Admin Routes

The following routes are admin-only:

- `/admin` - Admin Dashboard
- `/admin/setup` - Configure Ollie Business Profile
- `GET /api/admin/status` - Check if user is admin
- `GET /api/admin/ollie-business` - Get Ollie business details
- `POST /api/admin/ollie-business` - Create Ollie business
- `PATCH /api/admin/ollie-business` - Update Ollie business
- `GET /api/admin/invoices` - Get all Ollie invoices
- `GET /api/admin/clients` - Get all Ollie clients
- `GET /api/admin/dashboard/stats` - Get admin dashboard stats

## Security

- Admin routes are protected by the `isAdmin` middleware
- Only users with `is_admin = true` can access admin features
- The admin check is cached for 5 minutes for performance
- Regular users cannot see or access admin functionality

## Webhook Integration

The system uses Stripe webhooks to automatically generate invoices:

### Required Webhooks
Make sure these webhook events are enabled in your Stripe dashboard:
- `checkout.session.completed` - Initial subscription
- `invoice.payment_succeeded` - Recurring monthly payments
- `customer.subscription.deleted` - Subscription cancellation
- `customer.subscription.updated` - Subscription status changes

### Testing Webhooks Locally
Use Stripe CLI for local testing:
```bash
stripe listen --forward-to localhost:5000/api/webhooks/stripe
```

## Troubleshooting

### No Admin Menu Item
- Verify your user has `is_admin = true` in the database
- Log out and log back in
- Check browser console for errors

### Invoices Not Being Generated
- Check that the Ollie business is set up in `/admin/setup`
- Verify Stripe webhooks are configured correctly
- Check server logs for webhook errors
- Ensure `STRIPE_WEBHOOK_SECRET` is set

### Cannot Access Admin Dashboard
- Verify you're logged in with an admin account
- Check that the database migration ran successfully
- Clear browser cache and cookies

## Database Schema Changes

### Users Table
```sql
ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT false;
```

### Businesses Table
```sql
ALTER TABLE businesses ADD COLUMN is_ollie_business BOOLEAN DEFAULT false;
CREATE INDEX idx_businesses_ollie ON businesses(is_ollie_business) WHERE is_ollie_business = true;
```

## Future Enhancements

Possible improvements:
- Email notifications when invoices are generated
- Invoice customization per customer
- Bulk invoice operations
- Revenue analytics and charts
- CSV export of invoices
- Multiple admin users management
- Audit log for admin actions

## Support

If you have questions or issues:
1. Check server logs for errors
2. Verify database schema is up to date
3. Test webhooks using Stripe CLI
4. Review Stripe webhook event history

