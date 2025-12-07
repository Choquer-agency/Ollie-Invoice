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
- Added `P22 Mackinac` font for headings
- Font file needed: Place your font file in `client/public/fonts/`
- Supported formats: `.otf`, `.woff2`, `.woff`, `.ttf`
- File should be named: `Fontspring-DEMO-P22Mackinac-Book.[extension]`

### Files Modified
1. `client/src/index.css` - Color variables and font-face
2. `tailwind.config.ts` - Added `font-heading` family
3. Page headings - Added `font-heading` class

## Font Installation
Place your P22 Mackinac font file(s) in:
```
client/public/fonts/Fontspring-DEMO-P22Mackinac-Book.otf
```

The CSS will try to load these formats in order:
1. `.otf` (OpenType)
2. `.woff2` (Web Open Font Format 2)
3. `.woff` (Web Open Font Format)
4. `.ttf` (TrueType)

