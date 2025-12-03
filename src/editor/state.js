/**
 * Editor state management and domain operations
 */

import { rgbToOklch } from '../lib/convert.js';

/** @typedef {import('../components/palette-bar.js').Color} Color */
/** @typedef {import('../components/palette-bar.js').Palette} Palette */

const STORAGE_KEY = 'colorstory_draft';

/** Shared editor state */
export const state = {
  /** @type {Palette} */
  palette: null,
  /** @type {{id: string, name: string}[]} */
  existingPalettes: [],
  /** @type {'json' | 'css-hex' | 'css-rgb' | 'css-oklch'} */
  exportFormat: 'json',
  /** @type {'light' | 'dark'} */
  mode: 'dark'
};

/**
 * Apply mode to document root
 */
export function applyMode() {
  document.documentElement.dataset.mode = state.mode;
}

/**
 * Toggle between light and dark mode
 */
export function toggleMode() {
  state.mode = state.mode === 'light' ? 'dark' : 'light';
  applyMode();
}

// Initialize palette
state.palette = createEmptyPalette();

/**
 * Create a new empty palette
 * @returns {Palette}
 */
export function createEmptyPalette() {
  return {
    id: '',
    name: '',
    created: new Date().toISOString().split('T')[0],
    tags: null,
    colors: []
  };
}

/**
 * Check if a color with the same RGB values already exists in the palette
 * @param {number[]} rgb - RGB values to check
 * @returns {{ exists: boolean, name?: string }}
 */
export function findDuplicateColor(rgb) {
  const existing = state.palette.colors.find(c =>
    c.rgb[0] === rgb[0] && c.rgb[1] === rgb[1] && c.rgb[2] === rgb[2]
  );
  return existing
    ? { exists: true, name: existing.name }
    : { exists: false };
}

/**
 * Find all duplicate colors in a palette
 * @param {Color[]} colors
 * @returns {string[]} Names of duplicate colors
 */
export function findAllDuplicates(colors) {
  const seen = new Map();
  const duplicates = [];

  for (const color of colors) {
    const key = color.rgb.join(',');
    if (seen.has(key)) {
      duplicates.push(`"${color.name}" duplicates "${seen.get(key)}"`);
    } else {
      seen.set(key, color.name);
    }
  }

  return duplicates;
}

/**
 * Load list of existing palettes from server
 */
export async function loadExistingPalettes() {
  try {
    const indexRes = await fetch('/palettes/_index.json');
    const index = await indexRes.json();

    const palettePromises = index.palettes.map(async (id) => {
      const res = await fetch(`/palettes/${id}.json`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      return { indexId: id, id: data.id, name: data.name };
    });

    const results = await Promise.allSettled(palettePromises);

    state.existingPalettes = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled') {
        state.existingPalettes.push({ id: result.value.id, name: result.value.name });
      } else {
        const failedId = index.palettes[i];
        console.warn(`[ColorStory] Skipped palette "${failedId}": ${result.reason.message}`);
      }
    }
  } catch (err) {
    console.warn('[ColorStory] Could not load palette index:', err);
    state.existingPalettes = [];
  }
}

/**
 * Load a specific palette by ID
 * @param {string} id
 * @param {() => void} onSuccess - Called after successful load
 */
export async function loadPaletteById(id, onSuccess) {
  try {
    const res = await fetch(`/palettes/${id}.json`);
    const data = await res.json();
    state.palette = data;

    const duplicates = findAllDuplicates(state.palette.colors);
    if (duplicates.length > 0) {
      console.warn(`[ColorStory] Palette "${id}" contains duplicate colors:`, duplicates);
      alert(`Warning: This palette contains duplicate colors:\n${duplicates.join('\n')}`);
    }

    saveDraft();
    if (onSuccess) onSuccess();
  } catch (err) {
    alert(`Failed to load palette: ${id}`);
  }
}

/**
 * Add a color to the current palette
 * @param {string} name
 * @param {number[]} rgb
 * @returns {boolean} Whether the color was added
 */
export function addColor(name, rgb) {
  if (!name) {
    alert('Please enter a color name');
    return false;
  }

  if (!rgb) {
    alert('Invalid color value');
    return false;
  }

  const duplicate = findDuplicateColor(rgb);
  if (duplicate.exists) {
    alert(`This color already exists in the palette as "${duplicate.name}"`);
    return false;
  }

  const oklch = rgbToOklch(rgb);
  state.palette.colors.push({ name, rgb, oklch });
  saveDraft();
  return true;
}

/**
 * Save current palette to localStorage
 */
export function saveDraft() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.palette));
}

/**
 * Load palette from localStorage
 * @returns {Palette | null}
 */
export function loadDraft() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Clear localStorage draft
 */
export function clearDraft() {
  localStorage.removeItem(STORAGE_KEY);
}
