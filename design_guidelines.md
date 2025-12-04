# Design Guidelines: Simple Invoice App

## Design Approach

**Reference-Based Approach**: Drawing inspiration from Cal.com (layout simplicity), Stripe (form clarity), and Apple (spacing precision) to create an ultra-minimal invoicing platform optimized for speed and clarity.

**Core Principle**: Every interaction should feel effortless. The user should complete tasks in seconds, not minutes.

---

## Typography System

**Font Family**: 
- Primary: Inter (Google Fonts) for all interface text
- Headings: Inter SemiBold (600) and Bold (700)
- Body: Inter Regular (400) and Medium (500)

**Type Scale**:
- Hero/Dashboard Headers: text-4xl font-bold (36px)
- Page Titles: text-2xl font-semibold (24px)
- Section Headers: text-lg font-semibold (18px)
- Body Text: text-base (16px)
- Labels/Metadata: text-sm text-gray-600 (14px)
- Tiny Text (invoice numbers, dates): text-xs text-gray-500 (12px)

**Line Heights**: Use generous leading (leading-relaxed) for readability across all text blocks.

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, 8, 12, 16, 20, 24** for consistent rhythm.

**Page Structure**:
- Dashboard max-width: max-w-7xl mx-auto
- Forms/Invoice Creator: max-w-4xl mx-auto
- Content padding: px-6 md:px-8 lg:px-12
- Vertical spacing between sections: py-12 md:py-16

**Grid Systems**:
- Dashboard stats: 3-column grid (grid-cols-1 md:grid-cols-3 gap-6)
- Invoice table: Full-width with generous cell padding (px-6 py-4)
- Form layouts: Single column with logical grouping

---

## Component Library

### Navigation
- Top navbar: Fixed header, h-16, subtle bottom border
- Logo + App name on left, user menu on right
- "Create Invoice" CTA button prominent in header (primary button style)
- Clean, minimal sidebar for larger screens with icon + label navigation

### Buttons
- Primary: Rounded-lg, px-6 py-3, font-medium, solid background
- Secondary: Rounded-lg, px-6 py-3, border-2, transparent background
- Icon buttons: Rounded-full, p-2, subtle hover background
- All buttons use smooth transitions (transition-all duration-200)

### Forms
- Input fields: Large and spacious (h-12, px-4, rounded-lg)
- Labels: text-sm font-medium, mb-2
- Field groups have mb-6 spacing
- Inline validation with subtle error states
- Select dropdowns match input styling
- Textareas: min-h-32, same padding as inputs

### Cards
- Rounded-xl with subtle shadow (shadow-sm hover:shadow-md)
- Soft edges with border or very light background
- Padding: p-6 or p-8 for larger cards
- Dashboard stat cards: Clean number display with label below

### Tables
- Modern, clean aesthetic with alternating row backgrounds
- Header row: font-semibold, text-sm, uppercase tracking-wide
- Cell padding: px-6 py-4
- Hover states: Subtle background change
- Status badges: Small rounded-full pills with color-coded backgrounds
- Row actions: Dropdown menu on right (icon-based)

### Invoice Preview
- Clean, professional layout matching traditional invoice aesthetics
- Business logo top-left (max-h-20)
- Two-column layout: Sender info (left) / Client info (right)
- Line items table: Clean borders, right-aligned numbers
- Totals section: Right-aligned, bold final total
- Footer: Payment instructions, notes section
- Download/Send actions prominent at top

### Modals/Overlays
- Centered modal with max-w-2xl
- Backdrop: Semi-transparent dark overlay
- Close button: Top-right corner
- Smooth enter/exit animations

---

## Page-Specific Layouts

### Landing Page
**Structure** (7 sections):
1. **Hero**: Full-width with centered content, generous py-20 md:py-32. Headline, subheadline, dual CTAs (Sign Up + View Demo). Clean screenshot mockup of dashboard below headline.
2. **How It Works**: 3-step process with numbered cards (grid-cols-1 md:grid-cols-3)
3. **Features Grid**: 6 feature cards with icons, 2-column on mobile, 3-column desktop
4. **Screenshots/Demo**: Large product screenshots showing invoice creation flow
5. **Pricing**: Simple 2-column comparison (Free vs Pro)
6. **Social Proof**: 3-column testimonial cards with customer photos
7. **Final CTA**: Centered section with bold headline + primary CTA

**Hero Image**: Yes - Product screenshot showing clean dashboard interface, centered below headline with subtle shadow and rounded corners

### Dashboard
- Header with greeting + quick stats (3 cards: Total Paid, Unpaid, Overdue)
- Large "Create Invoice" button prominently placed
- Invoice table below with filters (All, Paid, Unpaid, Overdue) as pills
- Empty state: Centered illustration + "Create your first invoice" message

### Invoice Creator
- Left-aligned form with logical sections
- Autofill business details at top (read-only preview card)
- Client selector/add inline
- Line items: Dynamic table with "Add Line Item" button
- Tax toggle: Clean switch component
- Subtotal/Tax/Total: Right-aligned calculation box (updates live)
- Actions footer: Save Draft, Preview, Send (sticky bottom bar on mobile)

### Invoice Preview Page (Public)
- Centered, clean invoice layout (max-w-3xl)
- Print-friendly design
- "Pay Now" button prominent (blurred background if over header image)
- Download PDF link subtle but accessible

---

## Images

**Landing Hero**: Dashboard screenshot showing invoice table with data, clean UI visible. Centered, max-w-5xl, rounded-xl, subtle shadow.

**Feature Sections**: Product UI screenshots showing:
- Invoice creation interface
- Payment received notification
- Mobile invoice view

**Testimonials**: Professional headshots (80x80, rounded-full)

**Empty States**: Custom illustrations (simple line art style, single accent color)

---

## Interaction Patterns

- Smooth page transitions (no jarring jumps)
- Inline validation with immediate feedback
- Optimistic UI updates (mark as paid, send invoice)
- Toast notifications for success/error states (top-right, auto-dismiss)
- Loading states: Skeleton screens for tables, spinner for buttons
- Hover states: Subtle elevation changes, slight color shifts

**Animation Philosophy**: Use sparingly. Only animate state changes and micro-interactions. No decorative animations that slow workflow.

---

## Accessibility

- All form inputs have visible labels
- Focus states: 2px ring with offset
- Keyboard navigation supported throughout
- ARIA labels on icon-only buttons
- Contrast ratios meet WCAG AA standards
- Error messages clearly associated with fields