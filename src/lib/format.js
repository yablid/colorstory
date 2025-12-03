/**
 * Color string formatting utilities
 */

/**
 * Convert RGB array to CSS rgb() string
 * @param {number[]} rgb - [r, g, b] values 0-255
 * @returns {string}
 */
export function rgbToString(rgb) {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

/**
 * Convert OKLCH array to CSS oklch() string
 * @param {number[]} oklch - [L, C, H] values
 * @returns {string}
 */
export function oklchToString(oklch) {
  return `oklch(${oklch[0]} ${oklch[1]} ${oklch[2]})`;
}

/**
 * Convert RGB array to hex string
 * @param {number[]} rgb - [r, g, b] values 0-255
 * @returns {string}
 */
export function rgbToHex(rgb) {
  return '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('');
}
