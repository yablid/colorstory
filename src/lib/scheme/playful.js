/**
 * Playful (heuristic-based) scheme generation
 *
 * Uses heuristics to pick colors from a palette. May produce suboptimal
 * combinations but useful for exploration.
 */

import {
  TONE,
  CHROMA,
  classifyPalette,
  filterByLightness,
  filterByContrast,
  findClosestByLightness,
  sortByLightness,
  sortByChroma,
  pickRandom,
  pickBorderColor
} from '../colors.js';
import { hueDifference } from '../math.js';

/** @typedef {import('../../components/palette-bar.js').Color} Color */
/** @typedef {import('../colors.js').ClassifiedPalette} ClassifiedPalette */

/**
 * @typedef {Object} ColorScheme
 * @property {Color} bgApp
 * @property {Color} bgSurface
 * @property {Color} bgElevated
 * @property {Color} textPrimary
 * @property {Color} textMuted
 * @property {Color} borderSubtle
 * @property {Color} borderStrong
 * @property {Color} accentSolid
 * @property {Color} accentSoft
 * @property {Color} destructive
 */

/**
 * Generate a color scheme from palette colors
 * @param {Color[]} colors
 * @param {'light' | 'dark'} mode
 * @returns {ColorScheme}
 */
export function generateScheme(colors, mode) {
  const classified = classifyPalette(colors);

  if (mode === 'dark') {
    return generateDarkScheme(classified);
  } else {
    return generateLightScheme(classified);
  }
}

/**
 * Generate dark theme scheme
 * @param {ClassifiedPalette} p
 * @returns {ColorScheme}
 */
function generateDarkScheme(p) {
  // Background: darkest neutral, or darkest color overall
  const bgCandidates = p.darkNeutrals.length > 0
    ? p.darkNeutrals
    : sortByLightness(p.all, 'asc').slice(0, 3);
  const bgApp = pickRandom(bgCandidates) || p.all[0];
  const bgL = bgApp.oklch[0];

  // Surface: neutral slightly lighter than bg
  const surfaceCandidates = filterByLightness(
    [...p.darkNeutrals, ...p.midNeutrals],
    bgL + 0.06,
    bgL + 0.16
  );
  const bgSurface = pickRandom(surfaceCandidates)
    || findClosestByLightness([...p.darkNeutrals, ...p.midNeutrals, ...p.all], bgL + 0.10)
    || bgApp;
  const surfaceL = bgSurface.oklch[0];

  // Elevated: neutral slightly lighter than surface
  const elevatedCandidates = filterByLightness(
    [...p.midNeutrals, ...p.darkNeutrals],
    surfaceL + 0.06,
    surfaceL + 0.16
  );
  const bgElevated = pickRandom(elevatedCandidates)
    || findClosestByLightness([...p.midNeutrals, ...p.all], surfaceL + 0.10)
    || bgSurface;

  // Text primary: light color with good contrast
  const textCandidates = filterByLightness(p.all, 0.80, 1.0)
    .filter(c => Math.abs(c.oklch[0] - bgL) >= 0.40);
  const textWithContrast = filterByContrast(textCandidates, bgApp, 4.5);
  let textPrimary = pickRandom(textWithContrast.length > 0 ? textWithContrast : textCandidates);
  if (!textPrimary) {
    // Fallback: find any light color with at least 3:1 contrast
    const fallbackText = filterByContrast(
      sortByLightness(p.all, 'desc').slice(0, 5),
      bgApp,
      3.0
    );
    textPrimary = pickRandom(fallbackText) || sortByLightness(p.all, 'desc')[0] || p.all[p.all.length - 1];
  }

  // Text muted: between bg and text
  const mutedCandidates = filterByLightness(p.all, bgL + 0.20, textPrimary.oklch[0] - 0.10);
  const mutedWithContrast = filterByContrast(mutedCandidates, bgApp, 3.0);
  const textMuted = pickRandom(mutedWithContrast.length > 0 ? mutedWithContrast : mutedCandidates)
    || findClosestByLightness(p.all, (bgL + textPrimary.oklch[0]) / 2)
    || textPrimary;

  // Border subtle: contrast-driven, ban dark neutrals in dark mode
  // Target ~2:1 contrast (range 1.5-3:1), L >= TONE.DARK_MAX
  const subtleCandidates = [
    ...p.midNeutrals, ...p.lightNeutrals,
    ...p.midMuted, ...p.lightMuted
  ].filter(c => c.oklch[0] >= TONE.DARK_MAX);
  const borderSubtle = pickBorderColor(bgApp, subtleCandidates, {
    minRatio: 1.5,
    maxRatio: 3.0,
    targetRatio: 2.0
  }) || findClosestByLightness(p.all.filter(c => c.oklch[0] >= TONE.DARK_MAX), 0.45) // 0.45 = midpoint target
     || bgSurface;

  // Border strong: contrast-driven, must pass 3:1 minimum
  // Target ~4:1 contrast (range 3-7:1), L >= 0.45 (midpoint for readable border)
  const strongCandidates = [
    ...p.midNeutrals, ...p.lightNeutrals,
    ...p.midMuted, ...p.lightMuted
  ].filter(c => c.oklch[0] >= 0.45);
  const borderStrong = pickBorderColor(bgApp, strongCandidates, {
    minRatio: 3.0,
    maxRatio: 7.0,
    targetRatio: 4.0
  }) || findClosestByLightness(p.all.filter(c => c.oklch[0] >= 0.45), 0.55)
     || bgElevated;

  // Accent solid: vivid mid-tone with hue separation from bg
  const accentCandidates = [...p.midVivid, ...p.darkVivid, ...p.lightVivid]
    .filter(c => Math.abs(c.oklch[0] - bgL) >= 0.15)
    .filter(c => hueDifference(c.oklch[2], bgApp.oklch[2]) > 15);
  let accentSolid = pickRandom(accentCandidates);
  if (!accentSolid) {
    // Fallback: any high-chroma color
    const chromaSorted = sortByChroma(p.all, 'desc');
    accentSolid = chromaSorted[0] || p.all[Math.floor(p.all.length / 2)];
  }

  // Accent soft: muted color with similar hue
  const softCandidates = [...p.midMuted, ...p.lightMuted, ...p.darkMuted]
    .filter(c => hueDifference(c.oklch[2], accentSolid.oklch[2]) < 30);
  const accentSoft = pickRandom(softCandidates)
    || pickRandom([...p.midMuted, ...p.lightMuted])
    || findClosestByLightness(p.all, 0.5)
    || accentSolid;

  // Destructive color
  const destructive = pickDestructiveColor(p);

  return {
    bgApp,
    bgSurface,
    bgElevated,
    textPrimary,
    textMuted,
    borderSubtle,
    borderStrong,
    accentSolid,
    accentSoft,
    destructive
  };
}

/**
 * Generate light theme scheme
 * @param {ClassifiedPalette} p
 * @returns {ColorScheme}
 */
function generateLightScheme(p) {
  // Background: lightest neutral (L >= 0.90)
  const bgCandidates = filterByLightness(p.lightNeutrals, 0.90, 1.0);
  const bgFallback = bgCandidates.length > 0
    ? bgCandidates
    : sortByLightness(p.all, 'desc').slice(0, 3);
  const bgApp = pickRandom(bgFallback) || p.all[p.all.length - 1];
  const bgL = bgApp.oklch[0];

  // Surface: slightly darker than bg
  const surfaceCandidates = filterByLightness(
    [...p.lightNeutrals, ...p.midNeutrals, ...p.lightMuted],
    bgL - 0.16,
    bgL - 0.06
  );
  const bgSurface = pickRandom(surfaceCandidates)
    || findClosestByLightness([...p.lightNeutrals, ...p.midNeutrals, ...p.all], bgL - 0.10)
    || bgApp;
  const surfaceL = bgSurface.oklch[0];

  // Elevated: slightly darker than surface
  const elevatedCandidates = filterByLightness(
    [...p.midNeutrals, ...p.lightNeutrals, ...p.midMuted],
    surfaceL - 0.16,
    surfaceL - 0.06
  );
  const bgElevated = pickRandom(elevatedCandidates)
    || findClosestByLightness([...p.midNeutrals, ...p.all], surfaceL - 0.10)
    || bgSurface;

  // Text primary: dark color with good contrast
  const textCandidates = filterByLightness(p.all, 0, 0.25)
    .filter(c => Math.abs(c.oklch[0] - bgL) >= 0.40);
  const textWithContrast = filterByContrast(textCandidates, bgApp, 4.5);
  let textPrimary = pickRandom(textWithContrast.length > 0 ? textWithContrast : textCandidates);
  if (!textPrimary) {
    const fallbackText = filterByContrast(
      sortByLightness(p.all, 'asc').slice(0, 5),
      bgApp,
      3.0
    );
    textPrimary = pickRandom(fallbackText) || sortByLightness(p.all, 'asc')[0] || p.all[0];
  }

  // Text muted: between text and bg
  const mutedCandidates = filterByLightness(p.all, textPrimary.oklch[0] + 0.10, bgL - 0.20);
  const mutedWithContrast = filterByContrast(mutedCandidates, bgApp, 3.0);
  const textMuted = pickRandom(mutedWithContrast.length > 0 ? mutedWithContrast : mutedCandidates)
    || findClosestByLightness(p.all, (bgL + textPrimary.oklch[0]) / 2)
    || textPrimary;

  // Border subtle: contrast-driven, ban light neutrals in light mode
  // Target ~2:1 contrast (range 1.5-3:1), L <= 0.65
  const subtleCandidates = [
    ...p.midNeutrals, ...p.darkNeutrals,
    ...p.midMuted, ...p.darkMuted
  ].filter(c => c.oklch[0] <= 0.65);
  const borderSubtle = pickBorderColor(bgApp, subtleCandidates, {
    minRatio: 1.5,
    maxRatio: 3.0,
    targetRatio: 2.0
  }) || findClosestByLightness(p.all.filter(c => c.oklch[0] <= 0.65), 0.55)
     || bgSurface;

  // Border strong: contrast-driven, must pass 3:1 minimum
  // Target ~4:1 contrast (range 3-7:1), L <= 0.55
  const strongCandidates = [
    ...p.midNeutrals, ...p.darkNeutrals,
    ...p.midMuted, ...p.darkMuted
  ].filter(c => c.oklch[0] <= 0.55);
  const borderStrong = pickBorderColor(bgApp, strongCandidates, {
    minRatio: 3.0,
    maxRatio: 7.0,
    targetRatio: 4.0
  }) || findClosestByLightness(p.all.filter(c => c.oklch[0] <= 0.55), 0.45)
     || bgElevated;

  // Accent solid: vivid mid-tone with hue separation
  const accentCandidates = [...p.midVivid, ...p.darkVivid, ...p.lightVivid]
    .filter(c => Math.abs(c.oklch[0] - bgL) >= 0.15)
    .filter(c => hueDifference(c.oklch[2], bgApp.oklch[2]) > 15);
  let accentSolid = pickRandom(accentCandidates);
  if (!accentSolid) {
    const chromaSorted = sortByChroma(p.all, 'desc');
    accentSolid = chromaSorted[0] || p.all[Math.floor(p.all.length / 2)];
  }

  // Accent soft: muted color with similar hue
  const softCandidates = [...p.midMuted, ...p.lightMuted, ...p.darkMuted]
    .filter(c => hueDifference(c.oklch[2], accentSolid.oklch[2]) < 30);
  const accentSoft = pickRandom(softCandidates)
    || pickRandom([...p.midMuted, ...p.lightMuted])
    || findClosestByLightness(p.all, 0.5)
    || accentSolid;

  // Destructive color
  const destructive = pickDestructiveColor(p);

  return {
    bgApp,
    bgSurface,
    bgElevated,
    textPrimary,
    textMuted,
    borderSubtle,
    borderStrong,
    accentSolid,
    accentSoft,
    destructive
  };
}

/** Default destructive color: muted brick red */
const DEFAULT_DESTRUCTIVE = {
  name: 'default-destructive',
  rgb: [140, 82, 72],
  oklch: [0.45, CHROMA.STRONG_MIN, 25] // L=midpoint, C=strong accent threshold, H=red
};

/**
 * Pick a destructive color from palette or provide default
 * Prefers muted red/brick colors (lower chroma)
 * @param {ClassifiedPalette} p
 * @returns {Color}
 */
export function pickDestructiveColor(p) {
  const candidates = p.destructiveCandidates;

  if (!candidates || candidates.length === 0) {
    return DEFAULT_DESTRUCTIVE;
  }

  // Prefer lower chroma (more muted) for desaturated look
  const sorted = sortByChroma(candidates, 'asc');
  // Pick from the more muted half
  const mutedHalf = sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 2)));
  const picked = pickRandom(mutedHalf) || candidates[0];

  // Ensure we return a valid color with rgb array
  if (!picked || !picked.rgb || !Array.isArray(picked.rgb)) {
    return DEFAULT_DESTRUCTIVE;
  }

  return picked;
}
