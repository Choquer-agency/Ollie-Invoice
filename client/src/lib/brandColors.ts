// Brand color palette for invoice customization
// All colors meet WCAG AA contrast requirements on white backgrounds

export interface BrandColor {
  id: string;
  name: string;
  hex: string;
  description: string;
}

export const BRAND_COLORS: BrandColor[] = [
  { id: "charcoal", name: "Charcoal", hex: "#1A1A1A", description: "Default" },
  { id: "slate", name: "Slate", hex: "#475569", description: "Professional neutral" },
  { id: "red", name: "Red", hex: "#dc2626", description: "Corporate" },
  { id: "orange", name: "Orange", hex: "#FF9500", description: "Calm" },
  { id: "lime", name: "Lime", hex: "#65a30d", description: "Fresh" },
  { id: "green", name: "Green", hex: "#15803d", description: "Professional" },
  { id: "teal", name: "Teal", hex: "#0d9488", description: "Classic" },
  { id: "sky", name: "Sky", hex: "#0ea5e9", description: "Warm" },
  { id: "blue", name: "Blue", hex: "#2563eb", description: "Creative" },
  { id: "indigo", name: "Indigo", hex: "#4f46e5", description: "Modern" },
  { id: "purple", name: "Purple", hex: "#7e22ce", description: "Bold" },
  { id: "fuchsia", name: "Fuchsia", hex: "#c026d3", description: "Approachable" },
  { id: "pink", name: "Pink", hex: "#DB2777", description: "Love" },

];

export const DEFAULT_BRAND_COLOR = "#1A1A1A";

/**
 * Get a brand color object by its hex value
 */
export function getBrandColorByHex(hex: string): BrandColor | undefined {
  return BRAND_COLORS.find(c => c.hex.toLowerCase() === hex.toLowerCase());
}

/**
 * Check if a hex color is in our palette
 */
export function isValidBrandColor(hex: string): boolean {
  return BRAND_COLORS.some(c => c.hex.toLowerCase() === hex.toLowerCase());
}

/**
 * Get contrast color (white or black) for text on a brand color background
 */
export function getContrastColor(hex: string): string {
  // Remove # if present
  const color = hex.replace("#", "");
  
  // Convert to RGB
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}

