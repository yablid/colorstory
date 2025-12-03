/**
 * Palette bar component
 * Renders a horizontal bar of color swatches for a single palette
 */

import { rgbToString } from '../lib/format.js';
import { shuffle } from '../lib/colors.js';

/**
 * @typedef {Object} Color
 * @property {string} name
 * @property {number[]} rgb
 * @property {number[]} oklch
 */

/**
 * @typedef {Object} Palette
 * @property {string} id
 * @property {string} name
 * @property {string} created
 * @property {string|null} tags
 * @property {Color[]} colors
 */

/**
 * @typedef {Object} PaletteBarOptions
 * @property {boolean} [noCanonicalSchemes] - True if palette has no valid configurations
 */

/**
 * Create a palette bar element
 * @param {Palette} palette
 * @param {PaletteBarOptions} [options]
 * @returns {HTMLElement}
 */
export function createPaletteBar(palette, options = {}) {
  const container = document.createElement('a');
  container.className = 'palette-bar';
  container.href = `/style-guide.html?palette=${palette.id}`;
  container.setAttribute('data-palette-id', palette.id);

  // Header bar with palette name
  const header = document.createElement('div');
  header.className = 'palette-bar__header';

  const nameSpan = document.createElement('span');
  nameSpan.className = 'palette-bar__name';
  nameSpan.textContent = palette.name;
  header.appendChild(nameSpan);

  if (options.noCanonicalSchemes) {
    const badge = document.createElement('span');
    badge.className = 'palette-bar__badge';
    badge.textContent = 'No canonical schemes';
    badge.title = 'This palette has no valid configurations in the current mode';
    header.appendChild(badge);
  }

  // Shuffle colors for display (copy to avoid mutating original)
  const displayColors = shuffle([...palette.colors]);

  // Split into two rows
  const midpoint = Math.ceil(displayColors.length / 2);
  const topRow = displayColors.slice(0, midpoint);
  const bottomRow = displayColors.slice(midpoint);

  const topRowEl = createRow(topRow);
  const bottomRowEl = createRow(bottomRow);

  container.appendChild(header);
  container.appendChild(topRowEl);
  container.appendChild(bottomRowEl);

  return container;
}

/**
 * Create a row of color swatches
 * @param {Color[]} colors
 * @returns {HTMLElement}
 */
function createRow(colors) {
  const row = document.createElement('div');
  row.className = 'palette-bar__row';

  for (const color of colors) {
    const swatch = document.createElement('div');
    swatch.className = 'palette-bar__swatch';
    swatch.style.backgroundColor = rgbToString(color.rgb);
    swatch.title = color.name;
    row.appendChild(swatch);
  }

  return row;
}
