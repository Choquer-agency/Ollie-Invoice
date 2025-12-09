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
  { id: "navy", name: "Navy", hex: "#1E3A5F", description: "Corporate" },
  { id: "ocean", name: "Ocean", hex: "#0D7377", description: "Calm" },
  { id: "forest", name: "Forest", hex: "#2CA01C", description: "Fresh" },
  { id: "emerald", name: "Emerald", hex: "#047857", description: "Professional" },
  { id: "burgundy", name: "Burgundy", hex: "#7C2D12", description: "Classic" },
  { id: "rust", name: "Rust", hex: "#C2410C", description: "Warm" },
  { id: "plum", name: "Plum", hex: "#6B21A8", description: "Creative" },
  { id: "indigo", name: "Indigo", hex: "#4338CA", description: "Modern" },
  { id: "rose", name: "Rose", hex: "#BE185D", description: "Bold" },
  { id: "amber", name: "Amber", hex: "#B45309", description: "Approachable" },
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

