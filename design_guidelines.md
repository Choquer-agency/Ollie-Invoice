# Design Guidelines: Invoy Invoice App

## Design Approach

**Plumb Aesthetic**: Inspired by the Plumb design language - soft pastel colors, elegant serif headlines, high whitespace, and gentle animations. Creating a warm, approachable invoicing experience that feels premium yet simple.

**Core Principle**: Every interaction should feel effortless and delightful. The interface should be calming, not overwhelming.

---

## Color Palette

### Primary Colors
- **Primary Green**: `hsl(145 50% 42%)` - Used for CTAs, success states, and primary actions
- **Primary Foreground**: Pure white for text on primary backgrounds

### Pastel Feature Colors
- **Pastel Yellow**: `hsl(48 100% 92%)` - Warm, inviting card backgrounds
- **Pastel Lavender**: `hsl(259 60% 92%)` - Soft purple for analytics/data sections
- **Pastel Mint**: `hsl(156 50% 90%)` - Fresh green for success/payment sections
- **Pastel Peach**: `hsl(23 100% 92%)` - Warm accent for hero and highlights
- **Pastel Cream**: `hsl(45 50% 96%)` - Subtle background variation

### Background Colors
- **Background**: Pure white `hsl(0 0% 100%)`
- **Background Alt**: Warm cream `hsl(45 33% 97%)` for alternating sections
- **Card**: Pure white with soft shadows

### Text Colors
- **Foreground**: Near-black `hsl(0 0% 15%)` for primary text
- **Muted Foreground**: `hsl(0 0% 45%)` for secondary text

### Dark Mode
Dark mode uses warmer, muted versions of the pastel colors with adjusted background tones for comfortable viewing.

---

## Typography System

**Serif Headlines**: 
- Font: Cormorant Garamond (Google Fonts)
- Usage: Hero headlines, section titles, pricing headers
- Style: Medium weight (500-600), with occasional italic for emphasis

**Sans-Serif Body**: 
- Font: Inter (system default)
- Usage: Body text, buttons, labels, navigation
- Style: Regular (400) and Medium (500)

**Type Scale**:
- Hero Headlines: `text-5xl md:text-7xl lg:text-8xl font-serif font-medium`
- Section Titles: `text-3xl md:text-5xl font-serif font-medium`
- Feature Titles: `text-xl md:text-2xl font-serif font-medium`
- Body Text: `text-base` (16px)
- Labels/Meta: `text-sm text-muted-foreground`
- Tiny Text: `text-xs uppercase tracking-wider`

---

## Layout System

**Spacing Philosophy**: Generous whitespace is key to the Plumb aesthetic. Let elements breathe.

**Container Widths**:
- Hero sections: `max-w-4xl mx-auto`
- Content sections: `max-w-5xl mx-auto` or `max-w-6xl mx-auto`
- Full-width elements: `max-w-7xl mx-auto`

**Section Spacing**:
- Hero: `pt-32 pb-20 md:pt-40 md:pb-32`
- Regular sections: `py-16 md:py-20`
- Between elements: `gap-6 md:gap-8`

**Alternating Backgrounds**:
Alternate between `bg-background` (white) and `bg-background-alt` (cream) for visual rhythm.

---

## Component Library

### Navigation
- Minimal, fixed top navigation
- Logo (serif wordmark) on left
- Sparse links + primary CTA on right
- Uses backdrop blur for scroll transparency
- Height: `h-16`

### Buttons
- **Primary**: Rounded-full, primary green background, white text
- **Outline**: Rounded-full, transparent with border
- **Ghost**: No background, subtle hover
- All buttons use `rounded-full` for pill shape
- Standard padding: `px-8` for large, `px-5` for small

### Cards (Feature Cards)
- Pastel background colors (yellow, mint, lavender, peach)
- Large rounded corners: `rounded-2xl`
- Soft shadow: `shadow-soft` utility
- Subtle tilt effects for visual interest:
  - `card-tilt-left` (rotate -2deg)
  - `card-tilt-right` (rotate +2deg)
  - `card-tilt-up` (translateY -8px)
- Padding: `p-6 md:p-8`

### Glow Effects
- Hero sections use gradient orb behind headline
- CSS class: `glow-orb glow-orb-peach` (or mint, lavender, yellow)
- Creates soft, ambient glow effect
- Filter blur: 80px, opacity: 0.6

### Pills/Badges
- Used for testimonials and social proof
- Pastel backgrounds matching feature cards
- Rounded-full shape
- Avatar + name + role format

### Pricing Cards
- Clean, minimal design
- One with pastel background (featured)
- One with white background + border (standard)
- Serif font for price display
- Checkmark lists for features

---

## Animation Guidelines

**Philosophy**: Use animations sparingly and meaningfully. Every animation should enhance understanding or provide feedback.

### Scroll Animations (Framer Motion)
- Fade in + slide up: `{ opacity: 0, y: 20 } → { opacity: 1, y: 0 }`
- Stagger children: 0.1s delay between items
- Viewport trigger: `once: true, margin: "-100px"`

### Hover Interactions
- Cards: Subtle scale `hover:scale-[1.02]`
- Use built-in `hover-elevate` for buttons
- No layout shifts on hover

### Transitions
- Duration: 200-300ms for UI interactions
- 500ms for scroll reveals
- Easing: default ease-out

---

## Page-Specific Layouts

### Landing Page Structure
1. **Hero**: Serif headline, gradient orb, centered CTA
2. **Feature Cards**: 3-column grid with tilted pastel cards
3. **Social Proof**: Horizontal pills with testimonial excerpts
4. **Feature Highlight 1**: 2-column with text + pastel image box
5. **Feature Highlight 2**: 2-column reversed layout
6. **Pricing**: 2-column cards (free + pro)
7. **Final CTA**: Pastel yellow background
8. **Footer**: Minimal, single line

### Dashboard
- Clean header with greeting
- Stat cards in 3-column grid
- Invoice table with status badges
- Prominent "Create Invoice" CTA

### Invoice Creator
- Left-aligned form
- Live preview card on right (desktop)
- Sticky footer with actions

### Public Invoice View
- Centered, clean invoice layout
- Prominent "Pay Now" button
- Download PDF link

---

## Shadows

**Soft Shadows**: Key to the Plumb aesthetic
- `.shadow-soft`: Light, subtle shadow for cards
- `.shadow-soft-lg`: Slightly deeper for featured elements
- No harsh drop shadows

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

**Wordmark**: "invoy" in Cormorant Garamond serif font
- Font size: `text-xl` in nav, `text-lg` in footer
- Font weight: semibold (600)
- No icon, just clean typography
