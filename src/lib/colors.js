/**
 * Color utility functions for OKLCH-based scheme generation
 */

/** @typedef {import('../components/palette-bar.js').Color} Color */

import { contrastRatio, meetsContrast } from './math.js';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Tone thresholds (by OKLCH L) */
export const TONE = {
  DARK_MAX: 0.35,
  LIGHT_MIN: 0.75
};

/** Chroma thresholds (by OKLCH C) */
export const CHROMA = {
  NEUTRAL_MAX: 0.04,
  STRONG_MIN: 0.08
};

// =============================================================================
// DISPLAY SWATCH CONSTANTS
// =============================================================================

/** Hues for accent display swatches (warm, green, purple) */
export const ACCENT_DISPLAY_HUES = [30, 150, 270];

/** Fixed lightness for accent display swatches */
export const ACCENT_DISPLAY_L = 0.6;

/**
 * Get lightness midpoint for a neutral tone category
 * @param {'dark' | 'mid' | 'light'} tone
 * @returns {number}
 */
export function getNeutralMidpointL(tone) {
  if (tone === 'dark') return TONE.DARK_MAX / 2;
  if (tone === 'light') return (TONE.LIGHT_MIN + 1) / 2;
  return (TONE.DARK_MAX + TONE.LIGHT_MIN) / 2;
}

/**
 * Get chroma midpoint for an accent category
 * @param {'strong' | 'muted'} chromaClass
 * @returns {number}
 */
export function getAccentMidpointC(chromaClass) {
  if (chromaClass === 'strong') return 0.15;
  return (CHROMA.NEUTRAL_MAX + CHROMA.STRONG_MIN) / 2;
}

/** Destructive color hue range (reds/bricks) */
export const DESTRUCTIVE_HUE = { min: 350, max: 40, wrap: true };

// =============================================================================
// CLASSIFICATION
// =============================================================================

/**
 * @typedef {'dark' | 'mid' | 'light'} Tone
 * @typedef {'neutral' | 'muted' | 'vivid'} ChromaClass
 */

/**
 * Get tone classification from lightness
 * @param {number} L - OKLCH lightness 0-1
 * @returns {Tone}
 */
export function getTone(L) {
  if (L <= TONE.DARK_MAX) return 'dark';
  if (L > TONE.LIGHT_MIN) return 'light';
  return 'mid';
}

/**
 * Get chroma classification
 * @param {number} C - OKLCH chroma
 * @returns {ChromaClass}
 */
export function getChromaClass(C) {
  if (C < CHROMA.NEUTRAL_MAX) return 'neutral';
  if (C < CHROMA.STRONG_MIN) return 'muted';
  return 'vivid';
}

/**
 * Check if hue is in a status range
 * @param {number} h - OKLCH hue in degrees
 * @param {{min: number, max: number, wrap: boolean}} range
 * @returns {boolean}
 */
export function hueInRange(h, range) {
  if (range.wrap) {
    // Handles wrap-around (e.g., 350-40 for reds)
    return h >= range.min || h <= range.max;
  }
  return h >= range.min && h <= range.max;
}

// =============================================================================
// PALETTE CLASSIFICATION
// =============================================================================

/**
 * @typedef {Object} ClassifiedPalette
 * @property {Color[]} darkNeutrals
 * @property {Color[]} midNeutrals
 * @property {Color[]} lightNeutrals
 * @property {Color[]} darkMuted
 * @property {Color[]} midMuted
 * @property {Color[]} lightMuted
 * @property {Color[]} darkVivid
 * @property {Color[]} midVivid
 * @property {Color[]} lightVivid
 * @property {Color[]} destructiveCandidates
 * @property {Color[]} all
 */

/**
 * Classify all colors in a palette into buckets
 * @param {Color[]} colors
 * @returns {ClassifiedPalette}
 */
export function classifyPalette(colors) {
  const result = {
    darkNeutrals: [],
    midNeutrals: [],
    lightNeutrals: [],
    darkMuted: [],
    midMuted: [],
    lightMuted: [],
    darkVivid: [],
    midVivid: [],
    lightVivid: [],
    destructiveCandidates: [],
    all: colors
  };

  for (const color of colors) {
    const [L, C, h] = color.oklch;
    const tone = getTone(L);
    const chroma = getChromaClass(C);

    // Tone + Chroma buckets
    const bucketName = `${tone}${chroma.charAt(0).toUpperCase() + chroma.slice(1)}s`;
    if (bucketName === 'darkNeutrals') result.darkNeutrals.push(color);
    else if (bucketName === 'midNeutrals') result.midNeutrals.push(color);
    else if (bucketName === 'lightNeutrals') result.lightNeutrals.push(color);
    else if (bucketName === 'darkMuteds') result.darkMuted.push(color);
    else if (bucketName === 'midMuteds') result.midMuted.push(color);
    else if (bucketName === 'lightMuteds') result.lightMuted.push(color);
    else if (bucketName === 'darkVivids') result.darkVivid.push(color);
    else if (bucketName === 'midVivids') result.midVivid.push(color);
    else if (bucketName === 'lightVivids') result.lightVivid.push(color);

    // Destructive candidates (red/brick hues, minimum chroma required)
    // Achromatic colors (C < 0.02) have meaningless hue, exclude them
    if (C >= 0.02 && hueInRange(h, DESTRUCTIVE_HUE)) {
      result.destructiveCandidates.push(color);
    }
  }

  return result;
}

// =============================================================================
// SELECTION HELPERS
// =============================================================================

/**
 * Pick a random item from an array
 * @template T
 * @param {T[]} arr
 * @returns {T | undefined}
 */
export function pickRandom(arr) {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Shuffle array in place (Fisher-Yates)
 * @template T
 * @param {T[]} arr
 * @returns {T[]}
 */
export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Filter colors by lightness range
 * @param {Color[]} colors
 * @param {number} minL
 * @param {number} maxL
 * @returns {Color[]}
 */
export function filterByLightness(colors, minL, maxL) {
  return colors.filter(c => c.oklch[0] >= minL && c.oklch[0] <= maxL);
}

/**
 * Filter colors that pass contrast check against a reference
 * @param {Color[]} colors
 * @param {Color} reference
 * @param {number} threshold
 * @returns {Color[]}
 */
export function filterByContrast(colors, reference, threshold = 4.5) {
  return colors.filter(c => meetsContrast(c.rgb, reference.rgb, threshold));
}

/**
 * Find color with closest lightness to target
 * @param {Color[]} colors
 * @param {number} targetL
 * @returns {Color | undefined}
 */
export function findClosestByLightness(colors, targetL) {
  if (colors.length === 0) return undefined;
  return colors.reduce((closest, c) => {
    const closestDiff = Math.abs(closest.oklch[0] - targetL);
    const currentDiff = Math.abs(c.oklch[0] - targetL);
    return currentDiff < closestDiff ? c : closest;
  });
}

/**
 * Find color with closest hue to target
 * @param {Color[]} colors
 * @param {number} targetH
 * @returns {Color | undefined}
 */
export function findClosestByHue(colors, targetH) {
  if (colors.length === 0) return undefined;
  return colors.reduce((closest, c) => {
    const closestDiff = hueDifference(closest.oklch[2], targetH);
    const currentDiff = hueDifference(c.oklch[2], targetH);
    return currentDiff < closestDiff ? c : closest;
  });
}

/**
 * Sort colors by lightness
 * @param {Color[]} colors
 * @param {'asc' | 'desc'} direction
 * @returns {Color[]}
 */
export function sortByLightness(colors, direction = 'asc') {
  return [...colors].sort((a, b) => {
    const diff = a.oklch[0] - b.oklch[0];
    return direction === 'asc' ? diff : -diff;
  });
}

/**
 * Sort colors by chroma (saturation)
 * @param {Color[]} colors
 * @param {'asc' | 'desc'} direction
 * @returns {Color[]}
 */
export function sortByChroma(colors, direction = 'desc') {
  return [...colors].sort((a, b) => {
    const diff = a.oklch[1] - b.oklch[1];
    return direction === 'asc' ? diff : -diff;
  });
}

/**
 * Pick a border color based on contrast ratio against background.
 * @param {Color} bg - Background color to contrast against
 * @param {Color[]} candidates - Colors to choose from
 * @param {Object} options
 * @param {number} options.minRatio - Minimum contrast ratio (e.g. 1.5)
 * @param {number} options.maxRatio - Maximum contrast ratio (e.g. 3.0)
 * @param {number} options.targetRatio - Ideal contrast ratio to get closest to
 * @returns {Color | undefined}
 */
export function pickBorderColor(bg, candidates, { minRatio, maxRatio, targetRatio }) {
  if (candidates.length === 0) return undefined;

  const withContrast = candidates.map(c => ({
    color: c,
    ratio: contrastRatio(bg.rgb, c.rgb)
  }));

  // Find candidates within the desired contrast window
  const inWindow = withContrast.filter(c => c.ratio >= minRatio && c.ratio <= maxRatio);

  if (inWindow.length > 0) {
    // Pick randomly from those closest to target ratio
    const sorted = inWindow.sort((a, b) =>
      Math.abs(a.ratio - targetRatio) - Math.abs(b.ratio - targetRatio)
    );
    // Take top 3 closest and pick randomly for variety
    const topCandidates = sorted.slice(0, Math.min(3, sorted.length));
    return pickRandom(topCandidates.map(c => c.color));
  }

  // Fallback: pick the one with highest contrast
  const best = withContrast.reduce((a, b) => a.ratio > b.ratio ? a : b);
  return best.color;
}
