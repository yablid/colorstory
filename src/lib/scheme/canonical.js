/**
 * Canonical (constraint-based) scheme generation
 *
 * Uses constraint enumeration to produce schemes that satisfy all
 * contrast/lightness rules defined in constraints.js.
 */

import { classifyPalette } from '../colors.js';
import { enumerateConfigurations } from '../enumerate.js';
import { pickDestructiveColor } from './playful.js';

/** @typedef {import('../../components/palette-bar.js').Color} Color */
/** @typedef {import('./playful.js').ColorScheme} ColorScheme */

/** Cache for enumerated configurations */
let configCache = {
  paletteHash: null,
  mode: null,
  configurations: []
};

/**
 * Hash palette by color names for cache invalidation
 * @param {Color[]} colors
 * @returns {string}
 */
function hashPalette(colors) {
  return colors.map(c => c.name).sort().join(',');
}

/**
 * Get all valid constrained configurations for a palette
 * @param {Color[]} colors
 * @param {'light' | 'dark'} mode
 * @returns {import('../enumerate.js').Configuration[]}
 */
export function getValidConfigurations(colors, mode) {
  const hash = hashPalette(colors);

  if (configCache.paletteHash !== hash || configCache.mode !== mode) {
    configCache.paletteHash = hash;
    configCache.mode = mode;
    configCache.configurations = enumerateConfigurations(colors, mode);
  }

  return configCache.configurations;
}

/**
 * Clear the configuration cache (call when palette changes)
 */
export function clearConfigCache() {
  configCache.paletteHash = null;
  configCache.mode = null;
  configCache.configurations = [];
}

/**
 * Generate scheme from a specific configuration
 * @param {import('../enumerate.js').Configuration} config
 * @param {Color[]} colors - For destructive color fallback
 * @returns {ColorScheme}
 */
export function applyConfiguration(config, colors) {
  const classified = classifyPalette(colors);
  return {
    ...config.tokens,
    destructive: pickDestructiveColor(classified)
  };
}

/**
 * Check if a palette can produce at least one valid scheme configuration.
 * This is distinct from validatePalette() which checks raw material counts.
 * A palette may have enough colors but still fail to produce a valid scheme
 * if no combination satisfies all contrast/lightness constraints.
 *
 * @param {Color[]} colors
 * @param {'light' | 'dark'} mode
 * @returns {{ valid: boolean, configCount: number }}
 */
export function validatePaletteForScheme(colors, mode) {
  const configs = getValidConfigurations(colors, mode);
  return {
    valid: configs.length > 0,
    configCount: configs.length
  };
}
