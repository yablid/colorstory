/**
 * Editor rendering and templates
 */

import {
  TONE,
  CHROMA,
  ACCENT_DISPLAY_L,
  getNeutralMidpointL,
  getAccentMidpointC
} from '../lib/colors.js';
import { oklchToRgb } from '../lib/convert.js';
import { rgbToHex } from '../lib/format.js';
import { validatePalette, getValidationSummary } from '../lib/validate.js';
import { state } from './state.js';

/** @typedef {import('../components/palette-bar.js').Color} Color */

/**
 * Render the editor UI
 */
export function render() {
  const app = document.getElementById('app');
  if (!app) return;

  const { palette, existingPalettes, exportFormat } = state;
  const validation = validatePalette(palette);
  const summary = getValidationSummary(validation);

  app.innerHTML = `
    <header class="navbar">
      <div class="navbar__left">
        <a href="/" class="navbar__back">Back</a>
      </div>
      <h1 class="navbar__title">PALETTE EDITOR</h1>
      <div class="navbar__right">
        <button id="toggle-mode">${state.mode === 'light' ? 'Dark' : 'Light'}</button>
        <button id="clear-draft">Clear</button>
      </div>
    </header>

    <main class="editor-main">
      <div class="editor-layout">
        <section class="editor-panel editor-panel--form">
          <div class="editor-form">
            ${existingPalettes.length > 0 ? `
            <label>
              Load Palette
              <select id="load-palette">
                <option value="">-- New Palette --</option>
                ${existingPalettes.map(p => `<option value="${p.id}" ${palette.id === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
              </select>
            </label>
            ` : ''}
            <label>
              Name
              <input type="text" id="palette-name" value="${escapeHtml(palette.name)}" placeholder="My Palette">
            </label>
          </div>

          <h2>Add Color</h2>
          <div class="editor-form">
            <label>
              Color Name
              <input type="text" id="color-name" placeholder="e.g. deep blue">
            </label>
            <label>
              Color Value
              <div class="color-input-row">
                <input type="color" id="color-picker" value="#3b82f6">
                <input type="text" id="color-hex" placeholder="#3b82f6" value="#3b82f6">
              </div>
            </label>
            <button id="add-color" class="btn btn--accent">Add Color</button>
          </div>
        </section>

        <section class="editor-panel editor-panel--colors">
          <h2>Colors (${palette.colors.length})</h2>
          ${palette.colors.length === 0 ? '<p class="color-list__empty">No colors added yet</p>' : renderColorsByCategory(palette.colors)}
        </section>

        <section class="editor-panel editor-panel--validation">
          <h2>Colors ${summary.total.have}/${summary.total.need} ${!validation.valid ? '<span class="badge badge--error">Incomplete</span>' : ''}</h2>
          ${renderValidationSummary(summary)}
        </section>

        <section class="editor-panel editor-panel--export">
          <div class="export-header">
            <div class="export-tabs">
              <button class="export-tab${exportFormat === 'json' ? ' export-tab--active' : ''}" data-format="json">JSON</button>
              <button class="export-tab${exportFormat === 'css-hex' ? ' export-tab--active' : ''}" data-format="css-hex">CSS-HEX</button>
              <button class="export-tab${exportFormat === 'css-rgb' ? ' export-tab--active' : ''}" data-format="css-rgb">CSS-RGB</button>
              <button class="export-tab${exportFormat === 'css-oklch' ? ' export-tab--active' : ''}" data-format="css-oklch">CSS-OKLCH</button>
            </div>
            <span class="export-hint">(click to copy)</span>
          </div>
          <pre id="export-preview" class="export-preview"></pre>
        </section>
      </div>
    </main>
  `;

  const exportPreview = document.getElementById('export-preview');
  if (exportPreview) {
    exportPreview.textContent = formatExport(palette);
  }
}

/**
 * Classify a color into a category
 * @param {Color} color
 * @returns {string}
 */
function classifyColor(color) {
  const [L, C] = color.oklch;

  if (C < CHROMA.NEUTRAL_MAX) {
    if (L <= TONE.DARK_MAX) return 'dark-neutral';
    if (L >= TONE.LIGHT_MIN) return 'light-neutral';
    return 'mid-neutral';
  }

  if (C >= CHROMA.STRONG_MIN) {
    return 'strong-accent';
  }

  return 'muted-accent';
}

/**
 * Render colors grouped by category
 * @param {Color[]} colors
 */
function renderColorsByCategory(colors) {
  const categories = {
    'neutrals': { label: 'Neutrals', colors: [] },
    'accents': { label: 'Accents', strong: [], muted: [] }
  };

  colors.forEach((color, index) => {
    const category = classifyColor(color);
    if (category === 'dark-neutral' || category === 'mid-neutral' || category === 'light-neutral') {
      categories['neutrals'].colors.push({ color, index });
    } else if (category === 'strong-accent') {
      categories['accents'].strong.push({ color, index });
    } else if (category === 'muted-accent') {
      categories['accents'].muted.push({ color, index });
    }
  });

  categories['neutrals'].colors.sort((a, b) => a.color.oklch[0] - b.color.oklch[0]);
  categories['accents'].colors = [...categories['accents'].strong, ...categories['accents'].muted];

  return Object.entries(categories)
    .filter(([_, cat]) => cat.colors.length > 0)
    .map(([key, cat]) => `
      <div class="color-category">
        <div class="color-category__header">${cat.label}</div>
        <div class="color-category__swatches">
          ${cat.colors.map(({ color, index }) => renderSwatch(color, index)).join('')}
        </div>
      </div>
    `).join('');
}

/**
 * Render a single color swatch
 * @param {Color} color
 * @param {number} index
 */
function renderSwatch(color, index) {
  const hex = rgbToHex(color.rgb);

  return `
    <div class="color-swatch" data-index="${index}">
      <div class="color-swatch__color" style="background: ${hex}">
        <button class="color-swatch__delete" data-index="${index}">x</button>
      </div>
      <span class="color-swatch__name">${escapeHtml(color.name)}</span>
    </div>
  `;
}

/**
 * Render validation summary table
 */
function renderValidationSummary(summary) {
  const neutralSwatch = (tone) => {
    const L = getNeutralMidpointL(tone);
    const rgb = oklchToRgb([L, 0, 0]);
    return `<div class="validation-swatch validation-swatch--neutral" style="background: rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})"></div>`;
  };

  const accentSwatch = (chromaClass) => {
    const C = getAccentMidpointC(chromaClass);
    const rgb = oklchToRgb([ACCENT_DISPLAY_L, C, 270]);
    return `<div class="validation-swatch validation-swatch--accent" style="background: rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})"></div>`;
  };

  const renderNeutralRow = (label, data, tone, position = '') => {
    const haveStyle = data.have < data.need ? ' style="color: #ef4444"' : '';
    const posClass = position ? ` validation-row--${position}` : '';
    return `<tr class="validation-row${posClass}">
      <td class="validation-row__swatch">${neutralSwatch(tone)}</td>
      <td>${label}</td>
      <td><span${haveStyle}>${data.have}</span>/${data.need}</td>
    </tr>`;
  };

  const renderAccentRow = (label, data, chromaClass, position = '') => {
    const haveStyle = data.have < data.need ? ' style="color: #ef4444"' : '';
    const posClass = position ? ` validation-row--${position}` : '';
    return `<tr class="validation-row${posClass}">
      <td class="validation-row__swatch">${accentSwatch(chromaClass)}</td>
      <td>${label}</td>
      <td><span${haveStyle}>${data.have}</span>/${data.need}</td>
    </tr>`;
  };

  const renderSection = (label, data) => {
    const haveStyle = data.have < data.need ? ' style="color: #ef4444"' : '';
    return `<tr class="validation-section">
      <td colspan="2">${label}</td>
      <td><span${haveStyle}>${data.have}</span>/${data.need}</td>
    </tr>`;
  };

  return `
    <table class="validation-table">
      <tbody>
        ${renderSection('Neutrals', summary.neutrals.total)}
        ${renderNeutralRow('Dark', summary.neutrals.dark, 'dark', 'first')}
        ${renderNeutralRow('Mid', summary.neutrals.mid, 'mid')}
        ${renderNeutralRow('Light', summary.neutrals.light, 'light', 'last')}
        ${renderSection('Accents', summary.accents.total)}
        ${renderAccentRow('Strong', summary.accents.strong, 'strong', 'first')}
        ${renderAccentRow('Muted', summary.accents.muted, 'muted', 'last')}
      </tbody>
    </table>
  `;
}

/**
 * Format palette as JSON
 */
function formatPaletteJson(p) {
  const colorLines = p.colors.map(c => {
    const rgb = `[${c.rgb.join(', ')}]`;
    const oklch = `[${c.oklch.join(', ')}]`;
    return `    { "name": ${JSON.stringify(c.name)}, "rgb": ${rgb}, "oklch": ${oklch} }`;
  });

  return `{
  "id": ${JSON.stringify(p.id)},
  "name": ${JSON.stringify(p.name)},
  "created": ${JSON.stringify(p.created)},
  "tags": ${JSON.stringify(p.tags)},
  "colors": [
${colorLines.join(',\n')}
  ]
}`;
}

/**
 * Format palette as CSS hex variables
 */
function formatCssHex(p) {
  const varName = (name) => '--' + name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return p.colors.map(c => `${varName(c.name)}: ${rgbToHex(c.rgb)};`).join('\n');
}

/**
 * Format palette as CSS rgb variables
 */
function formatCssRgb(p) {
  const varName = (name) => '--' + name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return p.colors.map(c => `${varName(c.name)}: rgb(${c.rgb.join(', ')});`).join('\n');
}

/**
 * Format palette as CSS oklch variables
 */
function formatCssOklch(p) {
  const varName = (name) => '--' + name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return p.colors.map(c => `${varName(c.name)}: oklch(${c.oklch[0]} ${c.oklch[1]} ${c.oklch[2]});`).join('\n');
}

/**
 * Format palette in current export format
 */
export function formatExport(p) {
  const { exportFormat } = state;
  if (exportFormat === 'css-hex') return formatCssHex(p);
  if (exportFormat === 'css-rgb') return formatCssRgb(p);
  if (exportFormat === 'css-oklch') return formatCssOklch(p);
  return formatPaletteJson(p);
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
