/**
 * Color space conversion utilities
 * RGB <-> OKLCH conversions
 */

import { srgbToLinear, linearToSrgb } from './math.js';

/**
 * Convert RGB to Oklab
 * @param {number[]} rgb - [R, G, B] 0-255
 * @returns {number[]} [L, a, b]
 */
function rgbToOklab(rgb) {
  const r = srgbToLinear(rgb[0]);
  const g = srgbToLinear(rgb[1]);
  const b = srgbToLinear(rgb[2]);

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return [
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
  ];
}

/**
 * Convert Oklab to RGB
 * @param {number[]} lab - [L, a, b]
 * @returns {number[]} [R, G, B] 0-255
 */
function oklabToRgb(lab) {
  const [L, a, b] = lab;

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  return [linearToSrgb(r), linearToSrgb(g), linearToSrgb(bl)];
}

/**
 * Convert RGB to OKLCH
 * @param {number[]} rgb - [R, G, B] 0-255
 * @returns {number[]} [L, C, H] where L is 0-1, C is 0-0.4ish, H is 0-360
 */
export function rgbToOklch(rgb) {
  const [L, a, b] = rgbToOklab(rgb);
  const C = Math.sqrt(a * a + b * b);
  let H = Math.atan2(b, a) * 180 / Math.PI;
  if (H < 0) H += 360;

  return [
    Math.round(L * 1000) / 1000,
    Math.round(C * 1000) / 1000,
    Math.round(H)
  ];
}

/**
 * Convert OKLCH to RGB
 * @param {number[]} oklch - [L, C, H]
 * @returns {number[]} [R, G, B] 0-255
 */
export function oklchToRgb(oklch) {
  const [L, C, H] = oklch;
  const hRad = H * Math.PI / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);
  return oklabToRgb([L, a, b]);
}

/**
 * Parse hex color to RGB
 * @param {string} hex - "#RRGGBB" or "#RGB"
 * @returns {number[] | null} [R, G, B] or null if invalid
 */
export function hexToRgb(hex) {
  const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (match) {
    return [
      parseInt(match[1], 16),
      parseInt(match[2], 16),
      parseInt(match[3], 16)
    ];
  }

  const shortMatch = hex.match(/^#?([a-f\d])([a-f\d])([a-f\d])$/i);
  if (shortMatch) {
    return [
      parseInt(shortMatch[1] + shortMatch[1], 16),
      parseInt(shortMatch[2] + shortMatch[2], 16),
      parseInt(shortMatch[3] + shortMatch[3], 16)
    ];
  }

  return null;
}

/**
 * Convert RGB to hex
 * @param {number[]} rgb - [R, G, B] 0-255
 * @returns {string} "#RRGGBB"
 */
export function rgbToHex(rgb) {
  const toHex = (n) => n.toString(16).padStart(2, '0');
  return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`;
}

/**
 * Parse color string (hex, rgb(), or oklch()) to RGB array
 * @param {string} str
 * @returns {number[] | null}
 */
export function parseColorString(str) {
  str = str.trim();

  // Try hex
  const hexResult = hexToRgb(str);
  if (hexResult) return hexResult;

  // Try rgb(r, g, b) - supports both comma and space separators
  const rgbMatch = str.match(/^rgb\s*\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)\s*\)$/i);
  if (rgbMatch) {
    return [
      parseInt(rgbMatch[1], 10),
      parseInt(rgbMatch[2], 10),
      parseInt(rgbMatch[3], 10)
    ];
  }

  // Try oklch(L C H) - L is 0-1, C is ~0-0.4, H is 0-360
  const oklchMatch = str.match(/^oklch\s*\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*\)$/i);
  if (oklchMatch) {
    const L = parseFloat(oklchMatch[1]);
    const C = parseFloat(oklchMatch[2]);
    const H = parseFloat(oklchMatch[3]);
    if (!isNaN(L) && !isNaN(C) && !isNaN(H)) {
      return oklchToRgb([L, C, H]);
    }
  }

  return null;
}
