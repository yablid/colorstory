/**
 * Low-level color math primitives
 * Used by both colors.js and convert.js
 */

/**
 * Convert sRGB component (0-255) to linear RGB (0-1)
 * @param {number} val
 * @returns {number}
 */
export function srgbToLinear(val) {
  const v = val / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/**
 * Convert linear RGB (0-1) to sRGB component (0-255)
 * @param {number} val
 * @returns {number}
 */
export function linearToSrgb(val) {
  const v = val <= 0.0031308 ? val * 12.92 : 1.055 * Math.pow(val, 1 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(255, v * 255)));
}

/**
 * Calculate relative luminance from RGB
 * @param {number[]} rgb - [r, g, b] values 0-255
 * @returns {number} Relative luminance 0-1
 */
export function relativeLuminance(rgb) {
  const [r, g, b] = rgb.map(srgbToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate WCAG contrast ratio between two colors
 * @param {number[]} rgb1
 * @param {number[]} rgb2
 * @returns {number} Contrast ratio (1 to 21)
 */
export function contrastRatio(rgb1, rgb2) {
  const l1 = relativeLuminance(rgb1);
  const l2 = relativeLuminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast meets minimum threshold
 * @param {number[]} rgb1
 * @param {number[]} rgb2
 * @param {number} threshold - Default 4.5 for normal text
 * @returns {boolean}
 */
export function meetsContrast(rgb1, rgb2, threshold = 4.5) {
  return contrastRatio(rgb1, rgb2) >= threshold;
}

/**
 * Calculate hue distance (shortest arc)
 * @param {number} h1
 * @param {number} h2
 * @returns {number} 0-180
 */
export function hueDifference(h1, h2) {
  const diff = Math.abs(h1 - h2);
  return diff > 180 ? 360 - diff : diff;
}
