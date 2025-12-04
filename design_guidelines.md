# Design Guidelines: Invoy Invoice App

## Design Approach

**Notion-Inspired Aesthetic**: Clean, minimal, and calm. Soft neutral colors, generous whitespace, and understated styling. The interface should feel breathable and focused, letting content take center stage.

**Core Principle**: Simplicity and clarity. Every element should serve a purpose with nothing extraneous. The design should feel effortless and professional.

---

## Color Palette

### Backgrounds
- **Background**: Soft off-white `#F7F7F5` → `hsl(40 14% 96%)`
- **Card/Panel Background**: Pure white `#FFFFFF`
- **Alternate Background**: Very light cream `#FAFAF8`

### Borders
- **Border**: Ultra-light grey `#E8E8E4` → `hsl(60 6% 91%)`
- **Card Border**: Slightly lighter `#EFEFED`

### Text Colors
- **Foreground**: Deep grey `#1A1A1A` → `hsl(0 0% 10%)`
- **Muted Foreground**: Medium grey `#6B6B6B` for secondary text
- **Light Text**: Light grey `#9B9B9B` for tertiary/meta text

### Primary Color
- **Primary**: Dark grey/black `#1A1A1A` for CTAs and emphasis
- **Primary Foreground**: White for text on dark buttons

### Dark Mode
Dark mode uses inverted neutrals with the same calm, minimal feel:
- Background: Deep charcoal `#191919`
- Cards: Slightly lighter `#242424`
- Text: Light grey `#E5E5E5`

---

## Typography System

**Sans-Serif Only**: 
- Font: Inter (primary)
- No serif fonts
- Clean, readable, modern

**Font Weights**:
- Headlines: Medium (500)
- Body: Regular (400)
- Labels: Medium (500)

**Type Scale**:
- Hero Headlines: `text-4xl md:text-5xl lg:text-6xl font-medium`
- Section Titles: `text-2xl md:text-3xl font-medium`
- Card Titles: `text-lg md:text-xl font-medium`
- Body Text: `text-base` (16px)
- Secondary Text: `text-sm text-muted-foreground`
- Small/Meta: `text-xs text-muted-foreground`

**Line Height**: Generous line height for readability (`leading-relaxed`)

---

## Layout System

**Massive Whitespace**: The key to Notion-like design. Let everything breathe.

**Container Widths**:
- Main content: `max-w-5xl mx-auto`
- Wide sections: `max-w-6xl mx-auto`
- Full bleed: `max-w-7xl mx-auto`

**Section Spacing**:
- Hero: `pt-24 pb-16 md:pt-32 md:pb-24`
- Regular sections: `py-16 md:py-24`
- Between cards: `gap-4 md:gap-6`

**Padding**:
- Page padding: `px-6 md:px-8`
- Card padding: `p-6 md:p-8`
- Small elements: `p-4`

---

## Component Library

### Navigation
- Clean, minimal fixed navigation
- Logo on left (sans-serif wordmark)
- Sparse links on right
- Height: `h-14` or `h-16`
- Background: transparent with blur on scroll
- Separator: subtle bottom border

### Cards / Panels
- **Background**: Pure white
- **Border**: Ultra-light grey `border border-neutral-200`
- **Shadow**: Very soft `shadow-[0_1px_4px_rgba(0,0,0,0.04)]`
- **Border Radius**: `rounded-2xl`
- **Padding**: `p-6 md:p-8`

### Buttons
**Primary Button (CTA)**:
- Solid black/dark background
- White text
- `rounded-full` pill shape
- Padding: `px-6 py-2.5`

**Secondary/Outline Button**:
- White background
- Dark border
- Black text
- `rounded-full`

**Ghost Button**:
- No background
- Subtle hover state
- Use for navigation links

### Tags / Pills (Notion-style)
- Light grey background `bg-neutral-100`
- Dark text
- Small icon beside text
- Rounded: `rounded-full`
- Padding: `px-3 py-1.5`
- Border: subtle `border border-neutral-200`
- Font size: `text-sm`

### Icons
- Use Lucide icons (thin line style)
- Standard size: `h-4 w-4` or `h-5 w-5`
- Color: inherit from text
- Stroke width: default (2px) or thinner

### Testimonial Cards
- White background with subtle border
- Blockquote styling
- Avatar + name + role at bottom
- Clean, minimal layout

---

## Animation Guidelines

**Philosophy**: Minimal animations. Let the content speak.

### Interactions
- Hover: Subtle background color change only
- Use built-in `hover-elevate` utility
- No transforms or scale changes
- Transition: `duration-200`

### Page Transitions
- Fade in only if needed
- Keep animations under 300ms
- Prefer no animation over unnecessary animation

---

## Page-Specific Layouts

### Landing Page Structure
1. **Hero**: Clean headline, short tagline, primary CTA button
2. **Feature Cards**: 2-3 column grid, white cards with border
3. **Pill Tags**: Show capabilities/services
4. **Testimonials**: Simple quote cards
5. **How It Works**: Numbered steps or icon + text
6. **Pricing**: Clean comparison cards
7. **Final CTA**: Simple centered section
8. **Footer**: Minimal, single line

### Dashboard
- Clean header with user greeting
- Stats in simple bordered cards
- Invoice table with minimal styling
- Clear action buttons

### Invoice Creator
- Form on left, preview on right
- Clean input styling
- Clear section separation

---

## Shadows

**Minimal Shadows**: 
- Standard: `shadow-[0_1px_4px_rgba(0,0,0,0.04)]`
- Hover: `shadow-[0_2px_8px_rgba(0,0,0,0.06)]`
- Elevated: `shadow-[0_4px_12px_rgba(0,0,0,0.08)]`

Use shadows sparingly - borders are preferred for separation.

---

## Spacing Reference

| Use Case | Tailwind |
|----------|----------|
| Tiny | `gap-1`, `p-1` |
| Small | `gap-2`, `p-2` |
| Medium | `gap-4`, `p-4` |
| Large | `gap-6`, `p-6` |
| XL | `gap-8`, `p-8` |
| Section | `py-16`, `py-24` |

---

## Accessibility

- All form inputs have visible labels
- Focus states: 2px ring with offset
- Keyboard navigation supported
- ARIA labels on icon-only buttons
- Minimum contrast ratios met (WCAG AA)
- Error messages clearly associated with fields

---

## Logo

**Wordmark**: "invoy" in Inter font
- Font size: `text-lg` in nav, `text-base` in footer
- Font weight: semibold (600)
- No icon, clean typography
