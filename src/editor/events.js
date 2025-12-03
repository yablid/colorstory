/**
 * Editor event handlers
 */

import { parseColorString } from '../lib/convert.js';
import { rgbToHex } from '../lib/format.js';
import {
  state,
  createEmptyPalette,
  loadPaletteById,
  addColor,
  saveDraft,
  clearDraft,
  toggleMode
} from './state.js';
import { render, formatExport } from './render.js';

/**
 * Set up all event listeners
 */
export function setupEventListeners() {
  document.addEventListener('change', (e) => {
    const target = e.target;

    if (target.id === 'load-palette') {
      const selectedId = target.value;
      if (selectedId) {
        if (state.palette.colors.length > 0 && !confirm('Load existing palette? Current changes will be replaced.')) {
          target.value = state.palette.id || '';
          return;
        }
        loadPaletteById(selectedId, render);
      } else {
        if (state.palette.colors.length > 0 && !confirm('Start new palette? Current changes will be cleared.')) {
          target.value = state.palette.id || '';
          return;
        }
        state.palette = createEmptyPalette();
        saveDraft();
        render();
      }
    }
  });

  document.addEventListener('input', (e) => {
    const target = e.target;

    if (target.id === 'palette-name') {
      state.palette.name = target.value;
      // ID is always derived from name. For loaded palettes, this overwrites the
      // original ID on any name change. This is intentional: the editor is for
      // creating new palettes, not editing deployed ones in-place.
      state.palette.id = target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
      saveDraft();
      const preview = document.getElementById('export-preview');
      if (preview) preview.textContent = formatExport(state.palette);
    } else if (target.id === 'color-picker') {
      document.getElementById('color-hex').value = target.value;
    } else if (target.id === 'color-hex') {
      const rgb = parseColorString(target.value);
      if (rgb) {
        document.getElementById('color-picker').value = rgbToHex(rgb);
      }
    }
  });

  document.addEventListener('click', (e) => {
    const target = e.target;

    if (target.id === 'add-color') {
      handleAddColor();
    } else if (target.id === 'toggle-mode') {
      toggleMode();
      render();
    } else if (target.id === 'clear-draft') {
      if (confirm('Clear all colors and start fresh?')) {
        state.palette = createEmptyPalette();
        clearDraft();
        render();
      }
    } else if (target.id === 'export-preview') {
      copyExport();
    } else if (target.classList.contains('export-tab')) {
      state.exportFormat = target.dataset.format;
      render();
    } else if (target.classList.contains('color-swatch__delete')) {
      const index = parseInt(target.dataset.index, 10);
      state.palette.colors.splice(index, 1);
      saveDraft();
      render();
    }
  });
}

/**
 * Handle add color button click
 */
function handleAddColor() {
  const nameInput = document.getElementById('color-name');
  const hexInput = document.getElementById('color-hex');

  const name = nameInput.value.trim();
  const rgb = parseColorString(hexInput.value);

  if (addColor(name, rgb)) {
    nameInput.value = '';
    render();
  }
}

/**
 * Copy export text to clipboard
 */
function copyExport() {
  const text = formatExport(state.palette);
  navigator.clipboard.writeText(text).then(() => {
    const preview = document.getElementById('export-preview');
    if (preview) {
      preview.classList.add('export-preview--copied');
      setTimeout(() => preview.classList.remove('export-preview--copied'), 1000);
    }
  });
}
