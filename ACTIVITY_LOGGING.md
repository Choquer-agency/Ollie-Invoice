# Activity Logging System

## Overview

The activity logging system tracks all user actions within Ollie Invoice, providing administrators with detailed insights into user behavior and system usage.

## Features

### What Gets Logged

The system automatically tracks the following user activities:

#### Authentication
- **Login** - User successfully logs in
- **Logout** - User logs out
- **Signup** - New user registration

#### Business Management
- **Create Business** - User sets up their business profile
- **Update Business** - Changes to business settings

#### Client Management
- **Create Client** - New client is added
- **Update Client** - Client information is modified
- **Delete Client** - Client is removed

#### Invoice Operations
- **Create Invoice** - New invoice is created
- **Update Invoice** - Invoice details are modified
- **Delete Invoice** - Invoice is deleted
- **Send Invoice** - Invoice is sent to client via email
- **Resend Invoice** - Invoice is resent to client
- **Mark Invoice Paid** - Invoice status is updated to paid
- **Download Invoice PDF** - User downloads invoice as PDF

#### Payment Processing
- **Record Payment** - Manual payment is recorded
- **Stripe Payment** - Payment received via Stripe

#### Subscriptions
- **Upgrade Subscription** - User upgrades to Pro
- **Cancel Subscription** - User cancels Pro subscription

### Activity Log Data

Each activity log entry includes:

- **User ID** - Who performed the action
- **Action Type** - What was done (e.g., "create_invoice", "send_invoice")
- **Entity Type** - What was affected (e.g., "invoice", "client", "payment")
- **Entity ID** - The ID of the affected record
- **Metadata** - Additional context (invoice number, client name, amounts, etc.)
- **IP Address** - User's IP address
- **User Agent** - Browser/device information
- **Timestamp** - When the action occurred

## Admin Dashboard Integration

### Viewing User Activity

1. Navigate to the Admin Dashboard at `/admin`
2. Go to the "Users" section
3. Click on any user to open their details drawer
4. Scroll down to the "Recent Activity" section

The activity log displays:
- **Action icon** - Visual indicator of the action type
- **Action name** - Human-readable action description
- **Metadata** - Key details like invoice numbers, client names, amounts
- **Timestamp** - Date and time of the action

### API Endpoints

#### Get User Activity Logs
```
GET /api/admin/users/:userId/activity?limit=50&offset=0
```

Returns activity logs for a specific user.

**Query Parameters:**
- `limit` (optional) - Number of logs to return (default: 50)
- `offset` (optional) - Pagination offset (default: 0)

#### Get All Activity Logs
```
GET /api/admin/activity?limit=100&offset=0
```

Returns activity logs across all users (for general monitoring).

**Query Parameters:**
- `limit` (optional) - Number of logs to return (default: 100)
- `offset` (optional) - Pagination offset (default: 0)

## Database Schema

The activity logs are stored in the `activity_logs` table:

```sql
CREATE TABLE "activity_logs" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "action" VARCHAR NOT NULL,
  "entity_type" VARCHAR,
  "entity_id" VARCHAR,
  "metadata" JSONB,
  "ip_address" VARCHAR,
  "user_agent" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX "IDX_activity_logs_user_id" ON "activity_logs"("user_id");
CREATE INDEX "IDX_activity_logs_created_at" ON "activity_logs"("created_at");
CREATE INDEX "IDX_activity_logs_action" ON "activity_logs"("action");
```

## Implementation Details

### Activity Logger Utility

Located in `server/activityLogger.ts`, this utility provides:

- `logActivity(req, action, options)` - Main function to log activities
- `ActivityActions` - Constants for action types
- `EntityTypes` - Constants for entity types

### Usage in Routes

Activity logging is automatically integrated into key routes. Example:

```typescript
import { logActivity, ActivityActions, EntityTypes } from './activityLogger';

// After creating an invoice
logActivity(req, ActivityActions.CREATE_INVOICE, {
  entityType: EntityTypes.INVOICE,
  entityId: invoice.id,
  metadata: {
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    total: invoice.total,
  },
});
```

### Performance Considerations

- Activity logging is **fire-and-forget** - it doesn't block request processing
- Failed logging operations are caught and logged but don't affect the main application flow
- Logs are automatically indexed for fast querying

## Privacy & Data Retention

### Data Collected
- User actions within the application
- IP addresses (for security monitoring)
- Browser/device information (user agent strings)

### Recommendations
- Consider implementing a data retention policy (e.g., delete logs older than 90 days)
- Be transparent with users about activity tracking
- Ensure compliance with privacy regulations (GDPR, CCPA, etc.)

## Future Enhancements

Potential improvements to consider:

1. **Filtering & Search** - Add filters by action type, date range, entity type
2. **Analytics Dashboard** - Visualize user activity patterns
3. **Export Functionality** - Export activity logs as CSV
4. **Real-time Monitoring** - WebSocket-based live activity feed
5. **Alerts** - Notify admins of suspicious activity patterns
6. **Data Retention** - Automatic cleanup of old logs
7. **Audit Trail** - Tamper-proof logging for compliance

## Testing

To verify the activity logging system:

1. **Login Test**: Sign in and check if login activity is logged
2. **Create Client Test**: Add a new client and verify it's tracked
3. **Invoice Test**: Create and send an invoice, check both actions are logged
4. **Payment Test**: Record a payment and verify logging
5. **Admin View Test**: Open a user's detail drawer and confirm activities display correctly

## Migration

The migration file `migrations/0011_add_activity_logs.sql` creates the necessary table and indexes. It was applied on initial setup.

To manually apply:
```bash
npx tsx -e "import { db } from './server/db.ts'; ..."
```

Or if using drizzle-kit migrations, it will be applied automatically on next `npm run db:push`.

