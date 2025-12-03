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

  // Get valid configurations
  validConfigurations = getValidConfigurations(colors, mode);

  // Generate scheme from selected config or unconstrained
  let scheme;
  if (selectedConfigIndex !== null && validConfigurations[selectedConfigIndex]) {
    scheme = applyConfiguration(validConfigurations[selectedConfigIndex], colors);
  } else {
    scheme = generateScheme(colors, mode);
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
    <main class="sg-main">
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
            <div class="sg-swatch" data-color-index="${i}" style="background: ${rgbToString(c.rgb)}">
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

      <section class="sg-section">
        <h2>Generated Scheme</h2>
        <div class="sg-scheme-grid">
          <div class="sg-scheme-group">
            <h3>Backgrounds</h3>
            <div class="sg-scheme-row">
              <div class="sg-scheme-swatch" style="background: var(--color-bg-app)"><span>bg-app</span></div>
              <div class="sg-scheme-swatch" style="background: var(--color-bg-surface)"><span>bg-surface</span></div>
              <div class="sg-scheme-swatch" style="background: var(--color-bg-elevated)"><span>bg-elevated</span></div>
            </div>
          </div>
          <div class="sg-scheme-group">
            <h3>Text</h3>
            <div class="sg-scheme-row">
              <div class="sg-scheme-swatch" style="background: var(--color-text-primary)"><span>text-primary</span></div>
              <div class="sg-scheme-swatch" style="background: var(--color-text-muted)"><span>text-muted</span></div>
            </div>
          </div>
          <div class="sg-scheme-group">
            <h3>Borders</h3>
            <div class="sg-scheme-row">
              <div class="sg-scheme-swatch" style="background: var(--color-border-subtle)"><span>border-subtle</span></div>
              <div class="sg-scheme-swatch" style="background: var(--color-border-strong)"><span>border-strong</span></div>
            </div>
          </div>
          <div class="sg-scheme-group">
            <h3>Accent</h3>
            <div class="sg-scheme-row">
              <div class="sg-scheme-swatch" style="background: var(--color-accent-solid)"><span>accent-solid</span></div>
              <div class="sg-scheme-swatch" style="background: var(--color-accent-soft)"><span>accent-soft</span></div>
            </div>
          </div>
          <div class="sg-scheme-group">
            <h3>Destructive</h3>
            <div class="sg-scheme-row">
              <div class="sg-scheme-swatch" style="background: var(--color-destructive)"><span>destructive</span></div>
            </div>
          </div>
        </div>
      </section>

      <section class="sg-section">
        <h2>Typography</h2>
        <h1>Heading 1</h1>
        <h2>Heading 2</h2>
        <h3>Heading 3</h3>
        <p>Body text paragraph. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
        <p><a href="#">This is a link</a></p>
        <p class="text-muted">Muted text for secondary information.</p>
      </section>

      <section class="sg-section">
        <h2>Buttons</h2>
        <div class="sg-buttons">
          <button class="btn btn--accent">Accent</button>
          <button class="btn btn--subtle">Subtle</button>
          <button class="btn btn--outline">Outline</button>
          <button class="btn btn--destructive">Destructive</button>
        </div>
      </section>

      <section class="sg-section">
        <h2>Cards</h2>
        <div class="sg-cards">
          <div class="card card--surface">
            <h3>Surface Card</h3>
            <p>This card uses the surface background color.</p>
            <button class="btn btn--accent">Action</button>
          </div>
          <div class="card card--elevated">
            <h3>Elevated Card</h3>
            <p>This card uses the elevated background color.</p>
            <button class="btn btn--subtle">Action</button>
          </div>
        </div>
      </section>

      <section class="sg-section">
        <h2>Form Elements</h2>
        <form class="sg-form" onsubmit="return false">
          <label>
            Text Input
            <input type="text" placeholder="Enter text...">
          </label>
          <label>
            Select
            <select>
              <option>Option 1</option>
              <option>Option 2</option>
              <option>Option 3</option>
            </select>
          </label>
          <label class="checkbox">
            <input type="checkbox"> Checkbox option
          </label>
        </form>
      </section>

    </main>

    <aside class="sg-sidebar sg-sidebar--left">
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
      <h3>All Colors</h3>
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
      clearConfigCache();
      render();
    } else if (target.id === 'randomize-unconstrained') {
      selectedConfigIndex = null;
      render();
    } else if (target.id === 'reload-configs') {
      clearConfigCache();
      render();
    } else if (target.closest('.sg-config-btn')) {
      const btn = target.closest('.sg-config-btn');
      const idx = parseInt(btn.dataset.configIndex, 10);
      selectedConfigIndex = idx;
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
      selectedConfigIndex = null;
      clearConfigCache();
      render();
    } else if (target.closest('.sg-sidebar__item')) {
      const item = target.closest('.sg-sidebar__item');
      const idx = parseInt(item.dataset.sidebarIndex, 10);
      if (disabledColors.has(idx)) {
        disabledColors.delete(idx);
        selectedConfigIndex = null;
        clearConfigCache();
        render();
      }
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
}

init();
