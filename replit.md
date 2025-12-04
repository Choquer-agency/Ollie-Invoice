# Simple Invoice App

## Overview

A minimalist invoicing and payment platform designed for small businesses under $500K revenue. The application enables users to create professional invoices, send them via email or shareable links, accept payments through Stripe or e-transfer, and track invoice status (paid, unpaid, overdue, draft). Built with a focus on simplicity and speed, inspired by Cal.com's clean interface design.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React 18 with TypeScript using Vite as the build tool
- Client-side routing via Wouter (lightweight alternative to React Router)
- Single-page application (SPA) architecture with client-side rendering

**UI Component Strategy:**
- shadcn/ui component library built on Radix UI primitives
- Tailwind CSS for styling with custom design system
- Custom theme system supporting light/dark modes stored in localStorage
- Design inspiration drawn from Cal.com (layout), Stripe (forms), and Apple (spacing)
- Typography: Inter font family throughout, with specific type scales for headers, body text, and metadata
- Consistent spacing using Tailwind units: 2, 4, 6, 8, 12, 16, 20, 24

**State Management:**
- TanStack Query (React Query) for server state management and caching
- React Hook Form with Zod validation for form state
- No global client state management (leverages server state)

**Form Handling:**
- React Hook Form for form state and validation
- Zod schemas for type-safe validation
- @hookform/resolvers for integrating Zod with React Hook Form

### Backend Architecture

**Server Framework:**
- Express.js with TypeScript
- HTTP server created using Node's native `http` module
- Custom middleware for JSON parsing with raw body capture (for webhook verification)

**API Design:**
- RESTful API endpoints under `/api` prefix
- Resource-based routing: `/api/invoices`, `/api/clients`, `/api/business`
- Standard HTTP methods (GET, POST, PATCH, DELETE)
- Consistent error handling with appropriate status codes

**Authentication:**
- Replit Auth integration using OpenID Connect (OIDC)
- Passport.js with openid-client strategy
- Session-based authentication with PostgreSQL session store
- Session management via express-session with 7-day expiry
- Middleware pattern: `isAuthenticated` guard for protected routes

**Data Access Layer:**
- Storage abstraction pattern: `IStorage` interface defining all data operations
- Drizzle ORM for type-safe database queries
- Schema-first approach with TypeScript types generated from Drizzle schema
- Shared schema definitions between client and server

### Database Architecture

**Database:**
- PostgreSQL via Neon serverless driver
- WebSocket-based connection pooling for serverless environments
- Connection managed through `@neondatabase/serverless` with `ws` WebSocket constructor

**Schema Design:**
- **Users table:** Stores Replit Auth user data (id, email, name, profile image)
- **Businesses table:** One-to-one relationship with users; stores business profile (name, contact info, tax settings, payment methods)
- **Clients table:** Belongs to business; stores client information for invoicing
- **Invoices table:** Belongs to business and client; tracks invoice metadata (number, status, dates, amounts, payment method)
- **Invoice Items table:** Line items belonging to invoices (description, quantity, rate)
- **Payments table:** Payment records linked to invoices
- **Saved Items table:** Reusable line items for quick invoice creation
- **Sessions table:** PostgreSQL session storage for authentication

**Data Relationships:**
- User → Business (one-to-one)
- Business → Invoices (one-to-many)
- Business → Clients (one-to-many)
- Client → Invoices (one-to-many)
- Invoice → Invoice Items (one-to-many)
- Invoice → Payments (one-to-many)

**Invoice Statuses:**
- `draft`: Not yet sent to client
- `sent`: Sent but unpaid
- `paid`: Payment received
- `overdue`: Past due date and unpaid

### Object Storage

**Google Cloud Storage Integration:**
- Service configured for Replit's sidecar endpoint
- External account authentication using access tokens from sidecar
- Custom ACL (Access Control List) system with owner and visibility policies
- Supports public/private object visibility
- Used for storing business logos and attachments

### Payment Processing

**Stripe Integration:**
- Payment links generated for each invoice
- Support for one-time checkout sessions
- Configurable per invoice (enabled/disabled based on business settings)

**E-Transfer Support:**
- Alternative payment method with custom email and instructions
- Configured at business level, displayed on invoice

### Page Structure & Routing

**Public Routes:**
- `/` - Landing page (shown to unauthenticated users)
- `/pay/:token` - Public invoice view with payment options (uses share token)

**Authenticated Routes:**
- `/dashboard` - Dashboard with stats and recent invoices
- `/invoices` - Invoice list with filtering and search
- `/invoices/new` - Invoice creation form
- `/invoices/:id` - Invoice preview
- `/invoices/:id/edit` - Invoice editing
- `/clients` - Client management
- `/settings` - Business profile settings

### Development & Build Process

**Development:**
- Vite dev server with HMR (Hot Module Replacement) over `/vite-hmr` path
- Server-side Express app proxies Vite middleware in development
- TypeScript compilation with `tsx` for server code
- Replit-specific plugins for development banner and error overlay

**Production Build:**
- Client built with Vite to `dist/public`
- Server bundled with esbuild to `dist/index.cjs`
- Selective bundling: Core dependencies bundled, platform dependencies externalized
- Static file serving from built client directory

**Database Migrations:**
- Drizzle Kit for schema migrations
- Migration files stored in `/migrations` directory
- Push-based deployment with `db:push` command

## External Dependencies

**Third-Party Services:**
- **Replit Auth:** OpenID Connect authentication provider
- **Stripe:** Payment processing for invoice payments
- **Google Cloud Storage:** File storage for logos and attachments (via Replit Object Storage)
- **Neon:** Serverless PostgreSQL database hosting

**Key NPM Packages:**
- **Frontend:** React, Wouter, TanStack Query, React Hook Form, Zod, Radix UI, Tailwind CSS
- **Backend:** Express, Passport, Drizzle ORM, Neon serverless driver
- **Build Tools:** Vite, esbuild, TypeScript, PostCSS
- **Utilities:** date-fns, nanoid (ID generation), ws (WebSocket)

**UI Component Library:**
- shadcn/ui components (Radix UI primitives with Tailwind styling)
- Full suite of form controls, dialogs, dropdowns, tables, and navigation components
- Consistent styling via CSS variables and Tailwind config

**Email Delivery:**
- Integration expected for sending invoices (not fully implemented in current codebase)
- Likely via Nodemailer or similar service

**Currency & Formatting:**
- Internationalization API (Intl) for currency and date formatting
- Multi-currency support configured at business level (defaults to USD)
- Date formatting localized to en-US