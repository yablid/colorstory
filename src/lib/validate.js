/**
 * Palette validation against 12-color guidelines
 */

/** @typedef {import('../components/palette-bar.js').Color} Color */
/** @typedef {import('../components/palette-bar.js').Palette} Palette */

import { TONE, CHROMA } from './colors.js';

// Minimum requirements
const MINIMUMS = {
  darkNeutrals: 2,
  midNeutrals: 2,
  lightNeutrals: 2,
  totalNeutrals: 6,
  strongAccents: 1,
  mutedAccents: 1,
  totalAccents: 2,
  totalColors: 12
};

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid
 * @property {string[]} errors - Critical failures
 * @property {string[]} warnings - Non-critical issues
 * @property {Object} counts - Actual counts per category
 */

/**
 * Classify a single color
 * @param {Color} color
 * @returns {Object}
 */
function classifyColor(color) {
  const [L, C] = color.oklch;

  const isDark = L <= TONE.DARK_MAX;
  const isLight = L >= TONE.LIGHT_MIN;
  const isMid = !isDark && !isLight;

  const isNeutral = C < CHROMA.NEUTRAL_MAX;
  const isMuted = C >= CHROMA.NEUTRAL_MAX && C < CHROMA.STRONG_MIN;
  const isStrong = C >= CHROMA.STRONG_MIN;

  return {
    isDark, isMid, isLight,
    isNeutral, isMuted, isStrong
  };
}

/**
 * Validate a palette against the 12-color guidelines
 * @param {Palette} palette
 * @returns {ValidationResult}
 */
export function validatePalette(palette) {
  const errors = [];
  const warnings = [];

  if (!palette.colors || !Array.isArray(palette.colors)) {
    return {
      valid: false,
      errors: ['Palette has no colors array'],
      warnings: [],
      counts: {}
    };
  }

  const counts = {
    total: palette.colors.length,
    darkNeutrals: 0,
    midNeutrals: 0,
    lightNeutrals: 0,
    strongAccents: 0,
    mutedAccents: 0
  };

  // Colors missing oklch are skipped for classification but still count toward
  // counts.total. Category counts may sum to less than total if entries are invalid.
  for (const color of palette.colors) {
    if (!color.oklch || color.oklch.length !== 3) {
      warnings.push(`Color "${color.name}" missing valid oklch values`);
      continue;
    }

    const c = classifyColor(color);

    if (c.isNeutral) {
      if (c.isDark) counts.darkNeutrals++;
      else if (c.isMid) counts.midNeutrals++;
      else if (c.isLight) counts.lightNeutrals++;
    } else if (c.isStrong) {
      counts.strongAccents++;
    } else if (c.isMuted) {
      counts.mutedAccents++;
    }
  }

  // Check minimums
  if (counts.total < MINIMUMS.totalColors) {
    errors.push(`Need ${MINIMUMS.totalColors} colors, have ${counts.total}`);
  }

  if (counts.darkNeutrals < MINIMUMS.darkNeutrals) {
    errors.push(`Need ${MINIMUMS.darkNeutrals} dark neutrals (L<=0.35, C<0.04), have ${counts.darkNeutrals}`);
  }

  if (counts.midNeutrals < MINIMUMS.midNeutrals) {
    errors.push(`Need ${MINIMUMS.midNeutrals} mid neutrals (0.35<L<0.75, C<0.04), have ${counts.midNeutrals}`);
  }

  if (counts.lightNeutrals < MINIMUMS.lightNeutrals) {
    errors.push(`Need ${MINIMUMS.lightNeutrals} light neutrals (L>=0.75, C<0.04), have ${counts.lightNeutrals}`);
  }

  if (counts.strongAccents < MINIMUMS.strongAccents) {
    errors.push(`Need ${MINIMUMS.strongAccents} strong accent (C>=0.08), have ${counts.strongAccents}`);
  }

  if (counts.mutedAccents < MINIMUMS.mutedAccents) {
    warnings.push(`Recommend ${MINIMUMS.mutedAccents} muted accent (0.04<=C<0.08), have ${counts.mutedAccents}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    counts
  };
}

/**
 * Log validation results to console
 * @param {Palette} palette
 * @param {ValidationResult} result
 */
export function logValidationResult(palette, result) {
  const name = palette.name || palette.id || 'Unknown';

  if (!result.valid) {
    console.warn(`[ColorStory] Palette "${name}" is incomplete:`);
    result.errors.forEach(e => console.warn(`  - ${e}`));
    if (result.warnings.length > 0) {
      result.warnings.forEach(w => console.warn(`  - ${w}`));
    }
  } else if (result.warnings.length > 0) {
    console.info(`[ColorStory] Palette "${name}" has warnings:`);
    result.warnings.forEach(w => console.info(`  - ${w}`));
  }
}

/**
 * Get validation summary for display
 * @param {ValidationResult} result
 * @returns {Object}
 */
export function getValidationSummary(result) {
  const { counts } = result;

  const totalNeutrals = (counts.darkNeutrals || 0) + (counts.midNeutrals || 0) + (counts.lightNeutrals || 0);
  const totalAccents = (counts.strongAccents || 0) + (counts.mutedAccents || 0);

  return {
    neutrals: {
      total: { have: totalNeutrals, need: MINIMUMS.totalNeutrals, ok: totalNeutrals >= MINIMUMS.totalNeutrals },
      dark: { have: counts.darkNeutrals || 0, need: MINIMUMS.darkNeutrals, ok: (counts.darkNeutrals || 0) >= MINIMUMS.darkNeutrals },
      mid: { have: counts.midNeutrals || 0, need: MINIMUMS.midNeutrals, ok: (counts.midNeutrals || 0) >= MINIMUMS.midNeutrals },
      light: { have: counts.lightNeutrals || 0, need: MINIMUMS.lightNeutrals, ok: (counts.lightNeutrals || 0) >= MINIMUMS.lightNeutrals }
    },
    accents: {
      total: { have: totalAccents, need: MINIMUMS.totalAccents, ok: totalAccents >= MINIMUMS.totalAccents },
      strong: { have: counts.strongAccents || 0, need: MINIMUMS.strongAccents, ok: (counts.strongAccents || 0) >= MINIMUMS.strongAccents },
      muted: { have: counts.mutedAccents || 0, need: MINIMUMS.mutedAccents, ok: (counts.mutedAccents || 0) >= MINIMUMS.mutedAccents }
    },
    total: { have: counts.total || 0, need: MINIMUMS.totalColors, ok: (counts.total || 0) >= MINIMUMS.totalColors }
  };
}
