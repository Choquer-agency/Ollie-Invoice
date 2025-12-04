# Ollie Invoice

A minimalist invoicing and payment platform designed for small businesses. Create professional invoices, send them via email or shareable links, accept payments through Stripe, and track invoice status (paid, unpaid, overdue, draft).

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Wouter (routing), TanStack Query, React Hook Form, Zod, Tailwind CSS, shadcn/ui
- **Backend:** Express.js, TypeScript, Drizzle ORM, PostgreSQL (via Supabase)
- **Authentication:** Supabase Auth
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage
- **Payment Processing:** Stripe
- **Email:** Resend

## Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Stripe account (optional, for payment processing)
- Resend account (optional, for email sending)

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Supabase Storage
SUPABASE_STORAGE_BUCKET_NAME=files
PUBLIC_OBJECT_SEARCH_PATHS=public
PRIVATE_OBJECT_DIR=private

# Stripe (optional)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend (optional)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Session
SESSION_SECRET=your-random-secret-key-change-in-production

# Server
PORT=5000
NODE_ENV=development
BASE_URL=http://localhost:5000
```

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Ollie-Invoice
```

2. Install dependencies:
```bash
npm install
```

3. Set up your Supabase project:
   - Create a new Supabase project
   - Get your project URL and API keys from the Supabase dashboard
   - Create a storage bucket named `files` (or update `SUPABASE_STORAGE_BUCKET_NAME`)
   - Set up database tables by running migrations:
   ```bash
   npm run db:push
   ```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Database Setup

The application uses Drizzle ORM for database migrations. To push schema changes:

```bash
npm run db:push
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run check` - Type check TypeScript
- `npm run db:push` - Push database schema changes

## Project Structure

```
.
├── client/          # Frontend React application
│   └── src/
│       ├── components/  # React components
│       ├── hooks/       # Custom React hooks
│       ├── lib/         # Utilities and configurations
│       └── pages/       # Page components
├── server/          # Backend Express application
│   ├── supabaseAuth.ts  # Supabase authentication
│   ├── routes.ts        # API routes
│   ├── storage.ts       # Database operations
│   └── ...
├── shared/          # Shared TypeScript types and schemas
│   └── schema.ts    # Database schema definitions
└── package.json
```

## Features

- ✅ User authentication with Supabase Auth
- ✅ Create and manage invoices
- ✅ Client management
- ✅ Business profile setup
- ✅ Invoice status tracking (draft, sent, paid, overdue)
- ✅ PDF invoice generation
- ✅ Stripe payment integration
- ✅ Shareable payment links
- ✅ Dashboard with invoice statistics
- ✅ Tax type management
- ✅ Saved items for quick invoice creation

## Development

The application runs in development mode with Vite for fast hot module replacement. The backend and frontend are served from the same Express server.

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. Set `NODE_ENV=production` in your environment variables

3. Start the server:
```bash
npm start
```

The production build serves static files from the `dist/public` directory.

## License

MIT

