/**
 * Style guide rendering helpers
 */

import { rgbToString, oklchToString, rgbToHex } from '../lib/format.js';
import { contrastRatio } from '../lib/math.js';

/** @typedef {import('../lib/scheme/index.js').ColorScheme} ColorScheme */
/** @typedef {import('../components/palette-bar.js').Color} Color */

/**
 * Apply color scheme as CSS custom properties
 * @param {ColorScheme} scheme
 */
export function applyScheme(scheme) {
  const root = document.documentElement;

  // Backgrounds
  root.style.setProperty('--color-bg-app', rgbToString(scheme.bgApp.rgb));
  root.style.setProperty('--color-bg-surface', rgbToString(scheme.bgSurface.rgb));
  root.style.setProperty('--color-bg-elevated', rgbToString(scheme.bgElevated.rgb));

  // Text
  root.style.setProperty('--color-text-primary', rgbToString(scheme.textPrimary.rgb));
  root.style.setProperty('--color-text-muted', rgbToString(scheme.textMuted.rgb));

  // Contrast fallback: if textMuted fails 3:1 on elevated, use textPrimary
  const mutedOnElevatedRatio = contrastRatio(scheme.textMuted.rgb, scheme.bgElevated.rgb);
  const textOnElevated = mutedOnElevatedRatio >= 3 ? scheme.textMuted : scheme.textPrimary;
  root.style.setProperty('--color-text-on-elevated', rgbToString(textOnElevated.rgb));

  // Borders
  root.style.setProperty('--color-border-subtle', rgbToString(scheme.borderSubtle.rgb));
  root.style.setProperty('--color-border-strong', rgbToString(scheme.borderStrong.rgb));

  // Accent
  root.style.setProperty('--color-accent-solid', rgbToString(scheme.accentSolid.rgb));
  root.style.setProperty('--color-accent-soft', rgbToString(scheme.accentSoft.rgb));

  // Destructive - fallback to muted brick if missing
  const destructiveRgb = scheme.destructive?.rgb || [140, 82, 72];
  root.style.setProperty('--color-destructive', rgbToString(destructiveRgb));
}

/**
 * Get color string in the specified format
 * @param {Color} color
 * @param {'oklch' | 'hex' | 'rgb'} format
 * @returns {string}
 */
export function getColorString(color, format) {
  switch (format) {
    case 'hex': return rgbToHex(color.rgb);
    case 'rgb': return rgbToString(color.rgb);
    case 'oklch': return oklchToString(color.oklch);
    default: return oklchToString(color.oklch);
  }
}

/**
 * Copy text to clipboard
 * @param {string} text
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error('Failed to copy:', err);
  }
}
