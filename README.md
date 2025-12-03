# ColorStory

A three-page color palette viewer:

[Main](#main-page-) page displays palletes in a simple infinite scroll.

[Style Guide](#style-guide-style-guidehtmlpaletteid) shows individual palette and example web elements.

[Editor](#palette-editor-editorhtml) for palette creation and generating `json`,`hex`, `rgb`, or `oklch`.

## Usage

```bash
npm install
npm run dev      # Start development server (default: http://localhost:5173)
npm run build    # Build for production
npm run preview  # Preview production build
npm test         # Run tests in watch mode (re-runs on changes)
npm run test:run # Run tests once and exit
```

## Pages

### Main Page (`/`)

Displays palettes in an infinite-scroll grid. Colors are arranged in two shuffled rows.
Click a palette row -> style guide page

Controls:
- **Randomize**: Shuffles palette order
- **Light/Dark**: Toggles UI theme (respects system preference on load)

### Style Guide (`/style-guide.html?palette=<id>`)

Shows a single palette applied to a full UI component library:
- Palette swatches (click to copy hex/rgb/oklch)
- 10 Generated scheme tokens: [token contract](#token-contract-10-tokens)
- Typography samples
- Buttons (accent, subtle, outline, destructive variants)
- Cards (surface and elevated)
- Form elements
- Alerts

Controls:
- **Valid Configurations**: Buttons showing schemes that satisfy contrast/lightness constraints (limit six, reload button to re-calculate)
- **Randomize (Playful)**: Unconstrained mode that may produce suboptimal combinations for exploration
- **Light/Dark**: Switches between light and dark scheme generation

### Palette Editor (`/editor.html`)

Visual tool for building palettes:
- Add colors via color picker or hex input
- Real-time validation against 12-color guidelines
- Auto-saves to localStorage (crash-safe)
- Automatically generates json and css (scroll down)

## How It Works

### Palette Loading

1. `public/palettes/_index.json` lists palette IDs and sort order
2. Each palette is a JSON file in `public/palettes/<id>.json`
3. Palettes are loaded at startup and sorted per `_index.json` settings

### Scheme Generation

The scheme generator (`src/lib/scheme.js`) produces a 10-token color scheme from any palette.

#### Token Contract (10 tokens)

| Token | Role | Constraints |
|-------|------|-------------|
| `bgApp` | Main background | Dark neutral (dark mode) or light neutral (light mode) |
| `bgSurface` | Card/panel surfaces | Slightly offset from bgApp |
| `bgElevated` | Modals, dropdowns | Slightly offset from bgSurface |
| `textPrimary` | Primary text | 4.5:1+ contrast on bgApp |
| `textMuted` | Secondary text | 3:1+ contrast on bgApp |
| `borderSubtle` | Subtle dividers | 1.5-3:1 contrast on backgrounds |
| `borderStrong` | Prominent borders | 3:1+ contrast on bgApp |
| `accentSolid` | Buttons, links | Vivid color with hue separation |
| `accentSoft` | Hover states | Muted version of accent hue |
| `destructive` | Error/danger | Falls back to global default if palette lacks candidate |

#### Generation Modes

1. **Canonical (Valid Configurations)**: Uses constraint-based enumeration (`enumerateConfigurations`). Only produces schemes that satisfy all contrast/lightness rules defined in `constraints.js`.

2. **Playful (Randomize)**: Uses heuristic-based generation (`generateScheme`). May produce suboptimal combinations. Useful for exploration.

#### Constraints Specification

Canonical schemes use a formal constraints system:
- Implementation: `src/lib/constraints.js`
- Spec: `docs/randomizer.md` (version: `randomizer-constraints-v1`)

#### Classification

Colors are bucketed by OKLCH properties:
- Tone: dark (`L ≤ 0.35`), mid (`0.35-0.75`), light (`L > 0.75`)
- Chroma: neutral (`C < 0.04`), muted (`0.04-0.10`), vivid (`C ≥ 0.10`)
- Destructive hues: reds (`h: 350-40`, wrapping)

### Key Files

```
src/
  main.js              # Main page: infinite scroll, palette grid
  style-guide.js       # Style guide page: component showcase
  editor.js            # Palette editor with localStorage drafts
  lib/
    colors.js          # Color utilities, WCAG contrast, classification
    scheme.js          # Scheme generation algorithm
    validate.js        # Palette validation against guidelines
    convert.js         # RGB/OKLCH/hex conversions
  components/
    palette-bar.js     # Palette row component
  styles/
    main.css           # Shared styles, navbar, palette grid
    style-guide.css    # Style guide component styles
    editor.css         # Editor page styles
```

## Adding a Palette

Use the **Palette Editor** (`/editor.html`) to build palettes visually with real-time validation, then download the JSON.

Alternatively, create files manually:

### 1. Create the palette file

Create `public/palettes/<id>.json`:

```json
{
  "id": "my_palette",
  "name": "My Palette",
  "created": "2025-01-15",
  "tags": null,
  "colors": [
    { "name": "color name", "rgb": [255, 255, 255], "oklch": [1.0, 0.0, 0] }
  ]
}
```

### 2. Register in index

Add the ID to `public/palettes/_index.json`:

```json
{
  "sort": "manual",
  "palettes": ["my_palette", "existing_palette"]
}
```

### Index Options

- `"sort": "manual"` - Order from palettes array
- `"sort": "alphabetical"` - Sort by name
- `"sort": "created"` - Sort by created date (newest first)

## Palette Guidelines (12 colors minimum)

A valid palette needs at least 12 colors to ensure scheme generation can find suitable candidates. Incomplete palettes are hidden from the main page (check console for warnings).

### Neutrals (6 required)

| Count | Type | Lightness | Chroma | Purpose |
|-------|------|-----------|--------|---------|
| 2 | Dark | `L ≤ 0.35` | `C < 0.04` | Dark backgrounds, surfaces |
| 2 | Mid | `0.35 < L < 0.75` | `C < 0.04` | Surfaces, muted text, borders |
| 2 | Light | `L ≥ 0.75` | `C < 0.04` | Light backgrounds |

### Accents (1 required, 1 recommended)

| Count | Type | Chroma | Purpose | Required |
|-------|------|--------|---------|----------|
| 1+ | Strong | `C ≥ 0.08` | Primary accent colors | Yes |
| 1+ | Muted | `0.04 ≤ C < 0.08` | Soft accent variants | No (warning) |

### Destructive (optional)

If the palette contains a red-hue color (h: 350-40, wrapping), it will be used for destructive actions. Otherwise, a global default is used. Lack of a destructive candidate does not invalidate the palette.

### Minimum Requirements

The validator (`src/lib/validate.js`) enforces these as **errors** (palette excluded from main page):

```
Neutrals:  dark >= 2, mid >= 2, light >= 2
Accents:   strong (C >= 0.08) >= 1
Total:     >= 12 colors
```

These produce **warnings** (palette still valid, logged to console):

```
Accents:   muted (`0.04 <= C < 0.08`) >= 1
```

Palettes failing validation are logged to console and excluded from the main page.

## Color Space

The project uses OKLCH for classification:
- L (lightness) maps directly to perceived brightness
- C (chroma) indicates saturation uniformly across hues
- H (hue) is perceptually uniform

RGB is used for display output. Both are stored in palette files.

## Color Classification Constants

All classification thresholds are defined in `src/lib/colors.js`. To change classification behavior, edit these values:

| Constant | Value | Purpose |
|----------|-------|---------|
| `TONE.DARK_MAX` | 0.35 | Maximum L for dark neutrals |
| `TONE.LIGHT_MIN` | 0.75 | Minimum L for light neutrals |
| `CHROMA.NEUTRAL_MAX` | 0.04 | Maximum C for neutrals |
| `CHROMA.STRONG_MIN` | 0.08 | Minimum C for strong accents |

Derived values (midpoints for display swatches, etc.) are computed from these constants rather than hardcoded.

## Contrast

WCAG contrast ratios are calculated from RGB luminance:
- Primary text targets 4.5:1 against background
- UI elements and muted text target 3:1
- The algorithm filters candidates by contrast before random selection
