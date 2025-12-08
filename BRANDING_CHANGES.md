# Branding Changes (Dec 6, 2025)

## How to Revert
To revert all changes, simply copy `client/src/index.css.backup` over `client/src/index.css`:
```bash
cp client/src/index.css.backup client/src/index.css
```

Then remove `font-heading` class from all heading elements in these files:
- `client/src/pages/Dashboard.tsx` (2 places)
- `client/src/pages/Invoices.tsx`
- `client/src/pages/Clients.tsx`
- `client/src/pages/Settings.tsx`
- `client/src/pages/CreateInvoice.tsx`
- `client/src/pages/not-found.tsx`

## Changes Made

### Colors
| Original | New | Usage |
|----------|-----|-------|
| `#F6F6F4` | `#FAF9F5` | Background |
| `#F9F8F7` | `#FFFFFF` | Background alt, cards |
| Black (`#1A1A1A`) | `#484848` | Foreground/text |
| `#EBEAE8` | `#F6F5F1` | Borders |
| Black | `#00C020` | Primary buttons (green) |

### Font
- Using `P22 Mackinac Pro` font for headings via Adobe Typekit
- Font family: `"p22-mackinac-pro", serif`
- Available weights:
  - 400 (Book)
  - 500 (Medium)
  - 700 (Bold)

### Files Modified
1. `client/index.html` - Adobe Typekit stylesheet link
2. `client/src/index.css` - Color variables and font family reference
3. `tailwind.config.ts` - Added `font-heading` family
4. Page headings - Added `font-heading` class

## Font Setup (Adobe Typekit)
The P22 Mackinac Pro font is loaded via Adobe Typekit. The stylesheet link in `client/index.html`:
```html
<link rel="stylesheet" href="https://use.typekit.net/heu7uej.css">
```

