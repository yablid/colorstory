/**
 * Main entry point - infinite scroll palette viewer
 */

import { createPaletteBar } from './components/palette-bar.js';
import { shuffle } from './lib/colors.js';
import { validatePalette, logValidationResult } from './lib/validate.js';
import { validatePaletteForScheme, clearConfigCache } from './lib/scheme/index.js';

/** @type {import('./components/palette-bar.js').Palette[]} */
let palettes = [];
let currentIndex = 0;
let isLoading = false;

/** @type {'light' | 'dark'} */
let mode = 'dark';

/** @type {IntersectionObserver | null} */
let scrollObserver = null;

const PALETTES_PER_LOAD = 6;

async function init() {
  const app = document.getElementById('app');
  if (!app) return;

  // Detect system preference
  mode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  applyMode();

  await loadPaletteIndex();
  render();
  setupInfiniteScroll();
  setupControls();
}

function render() {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <header class="navbar">
      <div class="navbar__left">
        <a href="/editor.html" class="navbar__link">Editor</a>
      </div>
      <h1 class="navbar__title">COLOR STORY</h1>
      <div class="navbar__right">
        <button id="randomize">Randomize</button>
        <button id="toggle-mode">${mode === 'light' ? 'Dark' : 'Light'}</button>
      </div>
    </header>
    <div class="palette-grid" id="palette-grid"></div>
  `;

  currentIndex = 0;
  loadMorePalettes();
}

async function loadPaletteIndex() {
  try {
    const indexRes = await fetch('/palettes/_index.json');
    const index = await indexRes.json();

    // Load each palette file with individual error handling
    const palettePromises = index.palettes.map(async (id) => {
      const res = await fetch(`/palettes/${id}.json`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      return { id, data };
    });

    const results = await Promise.allSettled(palettePromises);

    // Filter fulfilled results and log failures
    const loadedPalettes = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        loadedPalettes.push(result.value.data);
      } else {
        // Extract palette ID from the rejection
        const failedIndex = results.indexOf(result);
        const failedId = index.palettes[failedIndex];
        console.warn(`[ColorStory] Skipped palette "${failedId}": ${result.reason.message}`);
      }
    }

    // Validate palettes and filter out incomplete ones
    const validPalettes = [];
    const invalidPalettes = [];

    for (const palette of loadedPalettes) {
      const result = validatePalette(palette);
      if (result.valid) {
        validPalettes.push(palette);
        // Log warnings even for valid palettes
        if (result.warnings.length > 0) {
          logValidationResult(palette, result);
        }
      } else {
        invalidPalettes.push({ palette, result });
      }
    }

    // Log all invalid palettes to console
    if (invalidPalettes.length > 0) {
      console.warn(`[ColorStory] ${invalidPalettes.length} palette(s) hidden due to incomplete color sets:`);
      for (const { palette, result } of invalidPalettes) {
        logValidationResult(palette, result);
      }
    }

    palettes = validPalettes;

    // Sort based on index preference
    if (index.sort === 'alphabetical') {
      palettes.sort((a, b) => a.name.localeCompare(b.name));
    } else if (index.sort === 'created') {
      palettes.sort((a, b) => new Date(b.created) - new Date(a.created));
    }
    // 'manual' keeps the order from _index.json
  } catch (err) {
    console.error('[ColorStory] Failed to load palette index:', err);
  }
}

function loadMorePalettes() {
  if (isLoading || currentIndex >= palettes.length) return;

  isLoading = true;
  const grid = document.getElementById('palette-grid');
  if (!grid) return;

  const end = Math.min(currentIndex + PALETTES_PER_LOAD, palettes.length);

  for (let i = currentIndex; i < end; i++) {
    const palette = palettes[i];
    const schemeValid = validatePaletteForScheme(palette.colors, mode);
    const bar = createPaletteBar(palette, {
      noCanonicalSchemes: !schemeValid.valid
    });
    grid.appendChild(bar);
  }

  currentIndex = end;
  isLoading = false;
}

function setupInfiniteScroll() {
  // Disconnect previous observer to prevent leaks
  if (scrollObserver) {
    scrollObserver.disconnect();
  }

  scrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        loadMorePalettes();
      }
    },
    { rootMargin: '200px' }
  );

  // Create sentinel element at bottom
  const sentinel = document.createElement('div');
  sentinel.id = 'scroll-sentinel';
  document.getElementById('app')?.appendChild(sentinel);
  scrollObserver.observe(sentinel);
}

function applyMode() {
  document.documentElement.setAttribute('data-mode', mode);
}

function setupControls() {
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (target.id === 'toggle-mode') {
      mode = mode === 'light' ? 'dark' : 'light';
      applyMode();
      clearConfigCache(); // Clear cache for new mode
      render(); // Re-render to update badges
      setupInfiniteScroll();
    } else if (target.id === 'randomize') {
      shuffle(palettes);
      render();
      setupInfiniteScroll();
    }
  });
}

init();
