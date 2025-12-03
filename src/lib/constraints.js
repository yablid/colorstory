/**
 * Authoritative constraint definitions for scheme generation.
 * docs/randomizer.md provides a human-readable description of these values.
 *
 * Spec version tracks: shape of constraints object, color classification rules,
 * and randomizer picking logic. Bump when any of these change.
 *
 * Each token has constraints for:
 * - maxChroma / minChroma: chroma bounds
 * - lightness: static range or function of dependencies
 * - contrast: required ratios against other tokens
 * - hueSameAs: tokens that should have similar hue (within 30 degrees)
 * - chromaRange: for derived tokens like accentSoft
 * - contrastRatioToPrimary: for textMuted relative to textPrimary
 */

export const CONSTRAINTS_SPEC_VERSION = 'randomizer-constraints-v1';

/**
 * @typedef {Object} LightnessRange
 * @property {number} min
 * @property {number} max
 */

/**
 * @typedef {Object} ContrastRequirement
 * @property {string} against - Token name
 * @property {number} min - Minimum contrast ratio
 * @property {number} [max] - Maximum contrast ratio
 */

/**
 * @typedef {Object} TokenConstraint
 * @property {number} [maxChroma]
 * @property {number} [minChroma]
 * @property {LightnessRange | ((deps: Object) => LightnessRange)} lightness
 * @property {ContrastRequirement[]} contrast
 * @property {string[]} [hueSameAs]
 * @property {{minRatio: number, maxRatio: number, of: string}} [chromaRange]
 * @property {{min: number, max: number, against: string}} [contrastRatioToPrimary]
 */

/** Token ordering for dependency resolution */
export const TOKEN_ORDER = [
  'bgApp',
  'bgSurface',
  'bgElevated',
  'textPrimary',
  'textMuted',
  'borderSubtle',
  'borderStrong',
  'accentSolid',
  'accentSoft'
];

/** @type {Object.<string, TokenConstraint>} */
export const DARK_MODE_CONSTRAINTS = {
  bgApp: {
    maxChroma: 0.04,
    lightness: { min: 0.08, max: 0.16 },
    contrast: []
  },

  bgSurface: {
    maxChroma: 0.04,
    lightness: (deps) => ({
      min: deps.bgApp.oklch[0] + 0.04,
      max: deps.bgApp.oklch[0] + 0.12
    }),
    contrast: []
  },

  bgElevated: {
    maxChroma: 0.04,
    lightness: (deps) => ({
      min: deps.bgSurface.oklch[0] + 0.04,
      max: deps.bgSurface.oklch[0] + 0.10
    }),
    contrast: []
  },

  textPrimary: {
    maxChroma: 0.05,
    lightness: { min: 0.85, max: 1.0 },
    contrast: [
      { against: 'bgApp', min: 7 },
      { against: 'bgSurface', min: 7 },
      { against: 'bgElevated', min: 4.5 }
    ]
  },

  textMuted: {
    maxChroma: 0.05,
    hueSameAs: ['textPrimary'],
    lightness: (deps) => ({
      min: deps.bgApp.oklch[0] + 0.30,
      max: deps.textPrimary.oklch[0] - 0.10
    }),
    contrast: [
      { against: 'bgApp', min: 4.5 },
      { against: 'bgSurface', min: 3 }
    ],
    contrastRatioToPrimary: { min: 0.6, max: 0.85, against: 'bgApp' }
  },

  borderSubtle: {
    maxChroma: 0.04,
    lightness: (deps) => ({
      min: deps.bgApp.oklch[0] + 0.05,
      max: deps.textPrimary.oklch[0] - 0.30
    }),
    contrast: [
      { against: 'bgApp', min: 1.2, max: 3.0 },
      { against: 'bgSurface', min: 1.2, max: 3.0 },
      { against: 'bgElevated', min: 1.2, max: 3.0 }
    ]
  },

  borderStrong: {
    maxChroma: 0.04,
    lightness: (deps) => ({
      min: deps.borderSubtle.oklch[0] + 0.05,
      max: deps.textPrimary.oklch[0] - 0.15
    }),
    contrast: [
      { against: 'bgApp', min: 3.0 }
    ]
  },

  accentSolid: {
    minChroma: 0.08,
    lightness: { min: 0.45, max: 0.80 },
    contrast: []
  },

  accentSoft: {
    minChroma: 0.04,
    chromaRange: { minRatio: 0.5, maxRatio: 0.8, of: 'accentSolid' },
    hueSameAs: ['accentSolid'],
    lightness: (deps) => ({
      min: deps.bgApp.oklch[0],
      max: deps.bgApp.oklch[0] + 0.25
    }),
    contrast: [
      { against: 'bgApp', min: 1.5, max: 3.0 }
    ]
  }
};

/** @type {Object.<string, TokenConstraint>} */
export const LIGHT_MODE_CONSTRAINTS = {
  bgApp: {
    maxChroma: 0.04,
    lightness: { min: 0.92, max: 1.0 },
    contrast: []
  },

  bgSurface: {
    maxChroma: 0.04,
    lightness: (deps) => ({
      min: deps.bgApp.oklch[0] - 0.12,
      max: deps.bgApp.oklch[0] - 0.04
    }),
    contrast: []
  },

  bgElevated: {
    maxChroma: 0.04,
    lightness: (deps) => ({
      min: deps.bgSurface.oklch[0] - 0.10,
      max: deps.bgSurface.oklch[0] - 0.04
    }),
    contrast: []
  },

  textPrimary: {
    maxChroma: 0.05,
    lightness: { min: 0, max: 0.20 },
    contrast: [
      { against: 'bgApp', min: 7 },
      { against: 'bgSurface', min: 7 },
      { against: 'bgElevated', min: 4.5 }
    ]
  },

  textMuted: {
    maxChroma: 0.05,
    hueSameAs: ['textPrimary'],
    lightness: (deps) => ({
      min: deps.textPrimary.oklch[0] + 0.10,
      max: deps.bgApp.oklch[0] - 0.30
    }),
    contrast: [
      { against: 'bgApp', min: 4.5 },
      { against: 'bgSurface', min: 3 }
    ],
    contrastRatioToPrimary: { min: 0.6, max: 0.85, against: 'bgApp' }
  },

  borderSubtle: {
    maxChroma: 0.04,
    lightness: (deps) => ({
      min: deps.textPrimary.oklch[0] + 0.30,
      max: deps.bgApp.oklch[0] - 0.05
    }),
    contrast: [
      { against: 'bgApp', min: 1.2, max: 3.0 },
      { against: 'bgSurface', min: 1.2, max: 3.0 },
      { against: 'bgElevated', min: 1.2, max: 3.0 }
    ]
  },

  borderStrong: {
    maxChroma: 0.04,
    lightness: (deps) => ({
      min: deps.textPrimary.oklch[0] + 0.15,
      max: deps.borderSubtle.oklch[0] - 0.05
    }),
    contrast: [
      { against: 'bgApp', min: 3.0 }
    ]
  },

  accentSolid: {
    minChroma: 0.08,
    lightness: { min: 0.45, max: 0.80 },
    contrast: []
  },

  accentSoft: {
    minChroma: 0.04,
    chromaRange: { minRatio: 0.5, maxRatio: 0.8, of: 'accentSolid' },
    hueSameAs: ['accentSolid'],
    lightness: (deps) => ({
      min: deps.bgApp.oklch[0] - 0.25,
      max: deps.bgApp.oklch[0]
    }),
    contrast: [
      { against: 'bgApp', min: 1.5, max: 3.0 }
    ]
  }
};
