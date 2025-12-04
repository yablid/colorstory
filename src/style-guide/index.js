/**
 * Style guide page - displays UI components using selected palette
 */

import { rgbToString } from '../lib/format.js';
import { generateScheme, getValidConfigurations, applyConfiguration, clearConfigCache } from '../lib/scheme/index.js';
import { applyScheme, getColorString, copyToClipboard } from './render.js';

/** @typedef {import('../components/palette-bar.js').Palette} Palette */
/** @typedef {import('../lib/scheme/index.js').ColorScheme} ColorScheme */

/** @type {Palette | null} */
let palette = null;

/** @type {'light' | 'dark'} */
let mode = 'light';

/** @type {'oklch' | 'hex' | 'rgb'} */
let copyFormat = 'oklch';

/** @type {Set<number>} - Indices of disabled colors */
let disabledColors = new Set();

/** @type {import('../lib/enumerate.js').Configuration[]} */
let validConfigurations = [];

/** @type {number | null} - Index of selected config, null = unconstrained */
let selectedConfigIndex = null;

/** @type {'side-by-side' | 'column'} */
let layoutMode = 'side-by-side';

/** @type {boolean} */
let schemeCollapsed = false;

/** @type {Object<string, import('../components/palette-bar.js').Color>} - Manual overrides for scheme slots */
let schemeOverrides = {};

/** @type {import('../lib/scheme/index.js').ColorScheme | null} - Cached base scheme */
let cachedScheme = null;

/**
 * Regenerate the base scheme from current colors and config.
 * Only call this when explicitly needed (randomize, config select, mode change).
 */
function regenerateScheme() {
  if (!palette) return;
  const activeColors = palette.colors.filter((_, i) => !disabledColors.has(i));
  const colors = activeColors.length > 0 ? activeColors : palette.colors;

  validConfigurations = getValidConfigurations(colors, mode);

  if (selectedConfigIndex !== null && validConfigurations[selectedConfigIndex]) {
    cachedScheme = applyConfiguration(validConfigurations[selectedConfigIndex], colors);
  } else {
    cachedScheme = generateScheme(colors, mode);
  }
}

/**
 * Remove overrides that reference a specific color index.
 * @param {number} colorIndex
 */
function clearOverridesForColor(colorIndex) {
  if (!palette) return;
  const color = palette.colors[colorIndex];
  for (const [slot, overrideColor] of Object.entries(schemeOverrides)) {
    if (overrideColor === color) {
      delete schemeOverrides[slot];
    }
  }
}

function applyMode() {
  document.documentElement.dataset.mode = mode;
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  const paletteId = params.get('palette');

  if (!paletteId) {
    document.getElementById('app').innerHTML = '<p>No palette specified. <a href="/">Go back</a></p>';
    return;
  }

  try {
    const res = await fetch(`/palettes/${paletteId}.json`);
    palette = await res.json();
  } catch (err) {
    document.getElementById('app').innerHTML = `<p>Failed to load palette: ${paletteId}. <a href="/">Go back</a></p>`;
    return;
  }

  // Detect system preference
  mode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  applyMode();

  setupControls();
  render();
}

function render() {
  const app = document.getElementById('app');
  if (!app || !palette) return;

  const activeColors = palette.colors.filter((_, i) => !disabledColors.has(i));
  const colors = activeColors.length > 0 ? activeColors : palette.colors;

  // Get valid configurations (for sidebar display)
  validConfigurations = getValidConfigurations(colors, mode);

  // Generate scheme only if not cached
  if (!cachedScheme) {
    regenerateScheme();
  }

  // Apply manual overrides to a copy of the cached scheme
  const scheme = { ...cachedScheme };
  for (const [slot, color] of Object.entries(schemeOverrides)) {
    if (scheme[slot] !== undefined) {
      scheme[slot] = color;
    }
  }

  applyScheme(scheme);

  app.innerHTML = `
    <header class="navbar">
      <div class="navbar__left">
        <a href="/" class="navbar__back">Back</a>
      </div>
      <h1 class="navbar__title"><a href="/editor.html?load=${palette.id}">${palette.name}</a></h1>
      <div class="navbar__right">
        <button id="toggle-mode">${mode === 'light' ? 'Dark' : 'Light'}</button>
      </div>
    </header>

    <div class="sg-layout">
    <main class="sg-main" data-layout="${layoutMode}">
      <div class="sg-main__scheme${schemeCollapsed ? ' collapsed' : ''}">
        <section class="sg-section">
          <h2 id="toggle-scheme">${schemeCollapsed ? 'Generated Scheme +' : 'Generated Scheme'}</h2>
          <div class="sg-scheme-grid">
            <div class="sg-scheme-group">
              <h3>Backgrounds</h3>
              <div class="sg-scheme-row">
                <div class="sg-scheme-swatch" data-scheme-slot="bgApp" style="background: var(--scheme-bg-app)"><span>bg-app</span></div>
                <div class="sg-scheme-swatch" data-scheme-slot="bgSurface" style="background: var(--scheme-bg-surface)"><span>bg-surface</span></div>
                <div class="sg-scheme-swatch" data-scheme-slot="bgElevated" style="background: var(--scheme-bg-elevated)"><span>bg-elevated</span></div>
              </div>
            </div>
            <div class="sg-scheme-group">
              <h3>Text</h3>
              <div class="sg-scheme-row">
                <div class="sg-scheme-swatch" data-scheme-slot="textPrimary" style="background: var(--scheme-text-primary)"><span>text-primary</span></div>
                <div class="sg-scheme-swatch" data-scheme-slot="textMuted" style="background: var(--scheme-text-muted)"><span>text-muted</span></div>
                <div class="sg-scheme-swatch" data-scheme-slot="textOnAccent" style="background: var(--scheme-text-on-accent)"><span>text-on-accent</span></div>
              </div>
            </div>
            <div class="sg-scheme-group">
              <h3>Borders</h3>
              <div class="sg-scheme-row">
                <div class="sg-scheme-swatch" data-scheme-slot="borderSubtle" style="background: var(--scheme-border-subtle)"><span>border-subtle</span></div>
                <div class="sg-scheme-swatch" data-scheme-slot="borderStrong" style="background: var(--scheme-border-strong)"><span>border-strong</span></div>
              </div>
            </div>
            <div class="sg-scheme-group">
              <h3>Accent</h3>
              <div class="sg-scheme-row">
                <div class="sg-scheme-swatch" data-scheme-slot="accentSolid" style="background: var(--scheme-accent-solid)"><span>accent-solid</span></div>
                <div class="sg-scheme-swatch" data-scheme-slot="accentSoft" style="background: var(--scheme-accent-soft)"><span>accent-soft</span></div>
              </div>
            </div>
            <div class="sg-scheme-group">
              <h3>Destructive</h3>
              <div class="sg-scheme-row">
                <div class="sg-scheme-swatch" data-scheme-slot="destructive" style="background: var(--scheme-destructive)"><span>destructive</span></div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div class="sg-main__content">
        <div class="sg-main__palette">
          <section class="sg-section">
            <div class="sg-palette-header">
              <h2>Palette Colors</h2>
              <div class="sg-format-toggles">
                <button class="sg-format-btn${copyFormat === 'oklch' ? ' active' : ''}" data-format="oklch">oklch</button>
                <button class="sg-format-btn${copyFormat === 'hex' ? ' active' : ''}" data-format="hex">hex</button>
                <button class="sg-format-btn${copyFormat === 'rgb' ? ' active' : ''}" data-format="rgb">rgb</button>
              </div>
            </div>
            <div class="sg-swatches">
              ${palette.colors.map((c, i) => {
                if (disabledColors.has(i)) return '';
                return `
                <div class="sg-swatch" draggable="true" data-color-index="${i}" style="background: ${rgbToString(c.rgb)}">
                  <span class="sg-swatch__name">${c.name}</span>
                  <button class="sg-swatch__remove" data-remove-index="${i}" title="Remove from palette">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                  </button>
                </div>
              `;
              }).join('')}
            </div>
          </section>
        </div>

        <div class="sg-main__guide">
          <div class="sg-guide-sections">
            <!-- Left column: typography, buttons, alerts -->
            <div class="sg-guide-column">
              <section class="sg-guide-section">
                <h2 class="sg-section-title">Typography</h2>
                <div class="sg-section-body sg-typography">
                  <h1>Heading 1 – Primary</h1>
                  <p>Primary body text using <code>text-primary</code>. Readable on <code>bg-surface</code> and <code>bg-elevated</code>.</p>
                  <h2>Heading 2 – Section</h2>
                  <p class="sg-text-muted">Muted text for descriptions, timestamps, and secondary information.</p>
                  <h3>Heading 3 – Subheading</h3>
                  <p>Links use <a href="#">accent-solid</a> for navigation and inline actions.</p>
                </div>
              </section>

              <section class="sg-guide-section">
                <h2 class="sg-section-title">Buttons & Messages</h2>
                <div class="sg-section-body">
                  <div class="sg-button-row">
                    <button class="btn btn-primary">Primary</button>
                    <button class="btn btn-subtle">Subtle</button>
                    <button class="btn btn-outline">Outline</button>
                    <button class="btn btn-destructive">Delete</button>
                    <button class="btn btn-ghost">Ghost</button>
                  </div>

                  <div class="sg-badge-row">
                    <span class="badge">Accent soft chip</span>
                    <span class="badge">Selected filter</span>
                    <span class="badge">Tag / label</span>
                  </div>

                  <div class="sg-alert">
                    <p class="sg-alert-title">Informational message</p>
                    <p class="sg-alert-body">Uses border-subtle and border-strong to establish hierarchy without new colors.</p>
                  </div>

                  <div class="sg-alert sg-alert--error">
                    <p class="sg-alert-title">Error: Something went wrong</p>
                    <p class="sg-alert-body">Destructive color for border and title makes error states immediately recognizable.</p>
                  </div>
                </div>
              </section>
            </div>

            <!-- Right column: cards, forms, table, popover -->
            <div class="sg-guide-column">
              <section class="sg-guide-section">
                <h2 class="sg-section-title">Cards & Surfaces</h2>
                <div class="sg-section-body">
                  <div class="sg-card-grid">
                    <article class="card card-surface">
                      <h3>Surface card</h3>
                      <p>Uses bg-surface and border-subtle. Good for main content panels and lists.</p>
                      <p class="card-meta">Card meta text</p>
                      <div class="sg-button-row">
                        <button class="btn btn-primary">Primary</button>
                        <button class="btn btn-subtle">Secondary</button>
                      </div>
                    </article>
                    <article class="card card-elevated">
                      <h3>Elevated card</h3>
                      <p>Uses bg-elevated with stronger shadow. For featured info, side panels, or overlays.</p>
                      <p class="card-meta">Card meta text</p>
                      <div class="sg-button-row">
                        <button class="btn btn-outline">Dismiss</button>
                        <button class="btn btn-primary">Confirm</button>
                      </div>
                    </article>
                  </div>
                </div>
              </section>

              <section class="sg-guide-section">
                <h2 class="sg-section-title">Form & Data</h2>
                <div class="sg-section-body sg-columns">
                  <form class="sg-form" onsubmit="return false">
                    <div class="sg-field">
                      <label for="sg-name">Text input</label>
                      <input id="sg-name" class="sg-input" type="text" placeholder="Enter a project name…">
                    </div>
                    <div class="sg-field">
                      <label for="sg-status">Select</label>
                      <select id="sg-status" class="sg-select">
                        <option>Draft</option>
                        <option>In review</option>
                        <option>Approved</option>
                      </select>
                    </div>
                    <div class="sg-checkbox-row">
                      <input id="sg-notify" type="checkbox" checked>
                      <label for="sg-notify">Send me notifications</label>
                    </div>
                    <div class="sg-button-row">
                      <button class="btn btn-primary">Save</button>
                      <button class="btn btn-ghost" type="button">Cancel</button>
                    </div>
                  </form>

                  <div class="sg-table-wrapper">
                    <table>
                      <thead>
                        <tr><th>Item</th><th>Status</th><th>Owner</th></tr>
                      </thead>
                      <tbody>
                        <tr><td>Palette explorer</td><td>Active</td><td>You</td></tr>
                        <tr><td>Theme randomizer</td><td>Draft</td><td>System</td></tr>
                        <tr><td>Export pipeline</td><td>In review</td><td>Design</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              <section class="sg-guide-section">
                <h2 class="sg-section-title">Elevated Popover</h2>
                <div class="sg-section-body">
                  <div class="sg-popover-demo">
                    <div class="sg-popover-anchor">
                      <button class="btn btn-outline">Show popover</button>
                      <div class="sg-popover">
                        <h4>Popover using bg-elevated</h4>
                        <p>Demonstrates bg-elevated for menus, tooltips, and floating panels.</p>
                        <div class="sg-popover-footer">
                          <button class="btn btn-ghost">Later</button>
                          <button class="btn btn-primary">Do it</button>
                        </div>
                      </div>
                    </div>
                    <p class="sg-text-muted">Always visible to show token usage.</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

    </main>

    <aside class="sg-sidebar sg-sidebar--left">
      <h3>Layout</h3>
      <button id="toggle-layout" class="btn btn--outline sg-layout-toggle">
        ${layoutMode === 'side-by-side' ? 'Column View' : 'Side-By-Side View'}
      </button>

      <h3>Scheme Generation</h3>
      ${validConfigurations.length === 0 && selectedConfigIndex === null
        ? '<p class="sg-config-notice">No canonical schemes found. Using playful mode (may have contrast issues).</p>'
        : ''}
      <button id="randomize-unconstrained" class="btn btn--outline sg-config-wild${selectedConfigIndex === null ? ' active' : ''}">
        Randomize (Playful)
      </button>
      <div class="sg-config-divider">Valid Configurations</div>
      <button id="reload-configs" class="btn btn--subtle sg-config-reload">Reload</button>
      <div class="sg-config-list">
        ${validConfigurations.length === 0
          ? `<p class="sg-config-empty">No valid configurations for this palette in ${mode} mode</p>`
          : validConfigurations.map((config, i) => `
            <button class="sg-config-btn${selectedConfigIndex === i ? ' active' : ''}" data-config-index="${i}">
              <span class="sg-config-label">Config ${i + 1}</span>
              <span class="sg-config-preview">
                <span style="background: ${rgbToString(config.tokens.bgApp.rgb)}"></span>
                <span style="background: ${rgbToString(config.tokens.accentSolid.rgb)}"></span>
                <span style="background: ${rgbToString(config.tokens.textPrimary.rgb)}"></span>
              </span>
            </button>
          `).join('')
        }
      </div>
    </aside>

    <aside class="sg-sidebar sg-sidebar--right">
      <h3 id="reset-all-colors" class="sg-sidebar__header${disabledColors.size > 0 ? ' clickable' : ''}">All Colors</h3>
      <div class="sg-sidebar__list">
        ${palette.colors.map((c, i) => `
          <div class="sg-sidebar__item${disabledColors.has(i) ? ' disabled' : ''}" data-sidebar-index="${i}">
            <span class="sg-sidebar__swatch" style="background: ${rgbToString(c.rgb)}"></span>
            <span class="sg-sidebar__name">${c.name}</span>
          </div>
        `).join('')}
      </div>
    </aside>
    </div>
  `;
}

function setupControls() {
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (target.id === 'toggle-mode') {
      mode = mode === 'light' ? 'dark' : 'light';
      applyMode();
      selectedConfigIndex = null;
      cachedScheme = null;
      schemeOverrides = {};
      clearConfigCache();
      render();
    } else if (target.id === 'toggle-layout') {
      layoutMode = layoutMode === 'side-by-side' ? 'column' : 'side-by-side';
      render();
    } else if (target.id === 'toggle-scheme') {
      schemeCollapsed = !schemeCollapsed;
      render();
    } else if (target.id === 'randomize-unconstrained') {
      selectedConfigIndex = null;
      cachedScheme = null;
      schemeOverrides = {};
      render();
    } else if (target.id === 'reload-configs') {
      cachedScheme = null;
      schemeOverrides = {};
      clearConfigCache();
      render();
    } else if (target.id === 'reset-all-colors' && disabledColors.size > 0) {
      disabledColors.clear();
      selectedConfigIndex = null;
      cachedScheme = null;
      schemeOverrides = {};
      clearConfigCache();
      render();
    } else if (target.closest('.sg-config-btn')) {
      const btn = target.closest('.sg-config-btn');
      const idx = parseInt(btn.dataset.configIndex, 10);
      selectedConfigIndex = idx;
      cachedScheme = null;
      schemeOverrides = {};
      render();
    } else if (target.classList.contains('sg-format-btn')) {
      const format = target.dataset.format;
      if (format) {
        copyFormat = format;
        document.querySelectorAll('.sg-format-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.format === format);
        });
      }
    } else if (target.closest('.sg-swatch__remove')) {
      const btn = target.closest('.sg-swatch__remove');
      const idx = parseInt(btn.dataset.removeIndex, 10);
      disabledColors.add(idx);
      clearOverridesForColor(idx);
      clearConfigCache();
      render();
    } else if (target.closest('.sg-sidebar__item')) {
      const item = target.closest('.sg-sidebar__item');
      const idx = parseInt(item.dataset.sidebarIndex, 10);
      if (disabledColors.has(idx)) {
        disabledColors.delete(idx);
      } else {
        disabledColors.add(idx);
        clearOverridesForColor(idx);
      }
      clearConfigCache();
      render();
    } else {
      const swatch = target.closest('.sg-swatch');
      if (swatch && swatch.dataset.colorIndex !== undefined && palette) {
        const idx = parseInt(swatch.dataset.colorIndex, 10);
        const color = palette.colors[idx];
        if (color) {
          const colorStr = getColorString(color, copyFormat);
          copyToClipboard(colorStr);
        }
      }
    }
  });

  // Drag and drop for scheme overrides
  document.addEventListener('dragstart', (e) => {
    const swatch = e.target.closest('.sg-swatch[draggable="true"]');
    if (swatch && swatch.dataset.colorIndex !== undefined) {
      e.dataTransfer.setData('text/plain', swatch.dataset.colorIndex);
      e.dataTransfer.effectAllowed = 'copy';
      swatch.classList.add('dragging');
    }
  });

  document.addEventListener('dragend', (e) => {
    const swatch = e.target.closest('.sg-swatch');
    if (swatch) {
      swatch.classList.remove('dragging');
    }
    document.querySelectorAll('.sg-scheme-swatch').forEach(el => {
      el.classList.remove('drag-over');
    });
  });

  document.addEventListener('dragover', (e) => {
    const target = e.target.closest('.sg-scheme-swatch[data-scheme-slot]');
    if (target) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  });

  document.addEventListener('dragenter', (e) => {
    const target = e.target.closest('.sg-scheme-swatch[data-scheme-slot]');
    if (target) {
      target.classList.add('drag-over');
    }
  });

  document.addEventListener('dragleave', (e) => {
    const target = e.target.closest('.sg-scheme-swatch[data-scheme-slot]');
    if (target && !target.contains(e.relatedTarget)) {
      target.classList.remove('drag-over');
    }
  });

  document.addEventListener('drop', (e) => {
    const target = e.target.closest('.sg-scheme-swatch[data-scheme-slot]');
    if (target && palette) {
      e.preventDefault();
      const colorIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
      const slot = target.dataset.schemeSlot;
      const color = palette.colors[colorIndex];
      if (color && slot) {
        schemeOverrides[slot] = color;
        render();
      }
    }
  });
}

init();
