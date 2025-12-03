/**
 * Enumeration of valid color scheme configurations
 *
 * Uses backtracking to find all valid token assignments from a palette
 * that satisfy the constraint rules (lightness, chroma, contrast).
 */

import { contrastRatio, hueDifference } from './math.js';
import { DARK_MODE_CONSTRAINTS, LIGHT_MODE_CONSTRAINTS, TOKEN_ORDER } from './constraints.js';

const MAX_CONFIGURATIONS = 12;
// Candidates per token are capped and shuffled for performance. This means
// enumeration is non-exhaustive for large palettes; not all mathematically
// possible configurations are guaranteed to be found.
const MAX_CANDIDATES_PER_TOKEN = 6;

/**
 * @typedef {import('../components/palette-bar.js').Color} Color
 */

/**
 * @typedef {Object} Configuration
 * @property {Object.<string, Color>} tokens - Token name to Color mapping
 * @property {string} id - Unique identifier
 */

/**
 * Filter colors matching a constraint given current dependencies
 * @param {Color[]} colors
 * @param {Object} constraint
 * @param {Object.<string, Color>} deps
 * @returns {Color[]}
 */
function filterByConstraint(colors, constraint, deps) {
  return colors.filter(color => {
    const [L, C, h] = color.oklch;

    // Chroma bounds
    if (constraint.maxChroma !== undefined && C >= constraint.maxChroma) {
      return false;
    }
    if (constraint.minChroma !== undefined && C < constraint.minChroma) {
      return false;
    }

    // Lightness bounds
    const lRange = typeof constraint.lightness === 'function'
      ? constraint.lightness(deps)
      : constraint.lightness;

    if (lRange.min > lRange.max) {
      // Invalid range from dependencies - no candidates possible
      return false;
    }
    if (L < lRange.min || L > lRange.max) {
      return false;
    }

    // Contrast requirements
    for (const req of constraint.contrast || []) {
      const against = deps[req.against];
      if (!against) continue;
      const ratio = contrastRatio(color.rgb, against.rgb);
      if (ratio < req.min) return false;
      if (req.max !== undefined && ratio > req.max) return false;
    }

    // Hue matching
    if (constraint.hueSameAs) {
      for (const tokenName of constraint.hueSameAs) {
        const ref = deps[tokenName];
        if (ref && hueDifference(h, ref.oklch[2]) > 30) {
          return false;
        }
      }
    }

    // Chroma ratio (for accentSoft)
    if (constraint.chromaRange) {
      const ref = deps[constraint.chromaRange.of];
      if (ref) {
        const refC = ref.oklch[1];
        const minC = refC * constraint.chromaRange.minRatio;
        const maxC = refC * constraint.chromaRange.maxRatio;
        if (C < minC || C > maxC) return false;
      }
    }

    // textMuted contrast ratio relative to textPrimary
    if (constraint.contrastRatioToPrimary) {
      const bg = deps[constraint.contrastRatioToPrimary.against];
      const primary = deps.textPrimary;
      if (bg && primary) {
        const primaryRatio = contrastRatio(primary.rgb, bg.rgb);
        const thisRatio = contrastRatio(color.rgb, bg.rgb);
        const relativeRatio = thisRatio / primaryRatio;
        if (relativeRatio < constraint.contrastRatioToPrimary.min ||
            relativeRatio > constraint.contrastRatioToPrimary.max) {
          return false;
        }
      }
    }

    return true;
  });
}

/**
 * Generate unique ID for a configuration based on color assignments
 * @param {Object.<string, Color>} assigned
 * @returns {string}
 */
function generateConfigId(assigned) {
  return TOKEN_ORDER
    .map(token => `${token}:${assigned[token]?.name || '?'}`)
    .join('|');
}

/**
 * Shuffle array in place (Fisher-Yates)
 * @param {any[]} arr
 * @returns {any[]}
 */
function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Enumerate all valid token configurations from a palette
 * @param {Color[]} colors - Palette colors
 * @param {'light' | 'dark'} mode
 * @returns {Configuration[]}
 */
export function enumerateConfigurations(colors, mode) {
  const constraints = mode === 'dark' ? DARK_MODE_CONSTRAINTS : LIGHT_MODE_CONSTRAINTS;
  const configurations = [];
  const seenIds = new Set();

  function backtrack(tokenIndex, assigned) {
    if (configurations.length >= MAX_CONFIGURATIONS) return;

    if (tokenIndex >= TOKEN_ORDER.length) {
      const id = generateConfigId(assigned);
      if (!seenIds.has(id)) {
        seenIds.add(id);
        configurations.push({
          tokens: { ...assigned },
          id
        });
      }
      return;
    }

    const tokenName = TOKEN_ORDER[tokenIndex];
    const constraint = constraints[tokenName];

    // Filter candidates
    let candidates = filterByConstraint(colors, constraint, assigned);

    // Limit candidates for performance
    if (candidates.length > MAX_CANDIDATES_PER_TOKEN) {
      shuffleInPlace(candidates);
      candidates = candidates.slice(0, MAX_CANDIDATES_PER_TOKEN);
    } else {
      shuffleInPlace(candidates);
    }

    // Try each candidate
    for (const candidate of candidates) {
      assigned[tokenName] = candidate;
      backtrack(tokenIndex + 1, assigned);
      delete assigned[tokenName];

      if (configurations.length >= MAX_CONFIGURATIONS) return;
    }
  }

  backtrack(0, {});
  return configurations;
}

/**
 * Check if a configuration is valid against the full contrast matrix
 * @param {Configuration} config
 * @param {'light' | 'dark'} mode
 * @returns {boolean}
 */
export function validateConfiguration(config, mode) {
  const constraints = mode === 'dark' ? DARK_MODE_CONSTRAINTS : LIGHT_MODE_CONSTRAINTS;

  for (const tokenName of TOKEN_ORDER) {
    const color = config.tokens[tokenName];
    const constraint = constraints[tokenName];
    if (!color) return false;

    // Check all contrast requirements
    for (const req of constraint.contrast || []) {
      const against = config.tokens[req.against];
      if (!against) continue;
      const ratio = contrastRatio(color.rgb, against.rgb);
      if (ratio < req.min) return false;
      if (req.max !== undefined && ratio > req.max) return false;
    }
  }

  return true;
}
