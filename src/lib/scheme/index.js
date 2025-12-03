/**
 * Color scheme generation
 *
 * TOKEN CONTRACT (10 tokens)
 * --------------------------
 * A valid ColorScheme always contains exactly these 10 tokens:
 *
 * Backgrounds:
 *   - bgApp: Main application background
 *   - bgSurface: Card/panel surfaces
 *   - bgElevated: Elevated elements (modals, dropdowns)
 *
 * Text:
 *   - textPrimary: Primary readable text (must pass 4.5:1 on bgApp)
 *   - textMuted: Secondary/muted text (must pass 3:1 on bgApp)
 *
 * Borders:
 *   - borderSubtle: Subtle dividers (1.5-3:1 contrast)
 *   - borderStrong: Prominent borders (3:1+ contrast)
 *
 * Accent:
 *   - accentSolid: Primary accent color (buttons, links)
 *   - accentSoft: Muted accent (hover states, backgrounds)
 *
 * Status:
 *   - destructive: Error/danger actions (always present, uses global default if palette lacks candidate)
 *
 * GENERATION MODES
 * ----------------
 * - Canonical: Uses constraint-based enumeration (enumerateConfigurations)
 *   Only produces schemes that satisfy all contrast/lightness rules.
 *
 * - Playful: Uses heuristic-based generation (generateScheme)
 *   May produce suboptimal combinations for exploration.
 */

export { generateScheme } from './playful.js';
export {
  getValidConfigurations,
  clearConfigCache,
  applyConfiguration,
  validatePaletteForScheme
} from './canonical.js';

/** @typedef {import('./playful.js').ColorScheme} ColorScheme */
