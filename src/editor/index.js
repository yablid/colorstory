/**
 * Palette Editor - create and validate palettes with localStorage drafts
 */

import {
  state,
  loadExistingPalettes,
  loadPaletteById,
  loadDraft,
  findAllDuplicates,
  applyMode
} from './state.js';
import { render } from './render.js';
import { setupEventListeners } from './events.js';

async function init() {
  // Detect system preference
  state.mode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  applyMode();

  await loadExistingPalettes();

  const params = new URLSearchParams(window.location.search);
  const loadId = params.get('load');

  if (loadId) {
    await loadPaletteById(loadId, render);
  } else {
    const draft = loadDraft();
    if (draft) {
      state.palette = draft;

      const duplicates = findAllDuplicates(state.palette.colors);
      if (duplicates.length > 0) {
        console.warn('[ColorStory] Draft contains duplicate colors:', duplicates);
      }
    }
    render();
  }
  setupEventListeners();
}

init();
