# Color Scheme Constraint System

Spec version: `randomizer-constraints-v1`

## Overview

Constraint-based algorithm for generating valid color schemes from palettes. We pre-computes all valid token configurations that satisfy a contrast matrix. Automatic fallback when tokens fail contrast on certain backgrounds.

---

## Token Constraints

### Dark Mode

| Token | Chroma | Lightness | Contrast Requirements |
|-------|--------|-----------|----------------------|
| bgApp | C < 0.04 | L: 0.08 - 0.16 | - |
| bgSurface | C < 0.04 | L: Lbg + 0.04 to + 0.12 | - |
| bgElevated | C < 0.04 | L: Lsurface + 0.04 to + 0.10 | - |
| textPrimary | C < 0.05 | L >= 0.85 | >= 7:1 vs bg, >= 7:1 vs surface, >= 4.5:1 vs elevated |
| textMuted | C < 0.05 | between bg+0.30 and textPrimary-0.10 | >= 4.5:1 vs bg, >= 3:1 vs surface, same hue as textPrimary, 0.6-0.85× textPrimary contrast |
| borderSubtle | C < 0.04 | between bg and text | 1.2-3:1 vs all backgrounds |
| borderStrong | C < 0.04 | between borderSubtle and text | >= 3:1 vs bg |
| accentSolid | C >= 0.08 | L: 0.45 - 0.80 | - |
| accentSoft | C: 0.5-0.8 * accentSolid.C | L: bg to bg+0.25 | 1.5-3:1 vs bg, same hue as accentSolid |
| textOnAccent | C < 0.04 | L: 0.85-1.0 if accent dark, 0.0-0.25 if accent light | >= 4.5:1 vs accentSolid |

### Light Mode

| Token | Chroma | Lightness | Contrast Requirements |
|-------|--------|-----------|----------------------|
| bgApp | C < 0.04 | L: 0.92 - 1.0 | - |
| bgSurface | C < 0.04 | L: Lbg - 0.12 to - 0.04 | - |
| bgElevated | C < 0.04 | L: Lsurface - 0.10 to - 0.04 | - |
| textPrimary | C < 0.05 | L <= 0.20 | >= 7:1 vs bg, >= 7:1 vs surface, >= 4.5:1 vs elevated |
| textMuted | C < 0.05 | between textPrimary+0.10 and bg-0.30 | >= 4.5:1 vs bg, >= 3:1 vs surface, same hue as textPrimary, 0.6-0.85× textPrimary contrast |
| borderSubtle | C < 0.04 | between text and bg | 1.2-3:1 vs all backgrounds |
| borderStrong | C < 0.04 | between text and borderSubtle | >= 3:1 vs bg |
| accentSolid | C >= 0.08 | L: 0.45 - 0.80 | - |
| accentSoft | C: 0.5-0.8 * accentSolid.C | L: bg-0.25 to bg | 1.5-3:1 vs bg, same hue as accentSolid |
| textOnAccent | C < 0.04 | L: 0.85-1.0 if accent dark, 0.0-0.25 if accent light | >= 4.5:1 vs accentSolid |

---

## Contrast Matrix

Required contrast ratios for valid schemes:

| Pair | Required Ratio |
|------|----------------|
| bg ↔ textPrimary | >= 7:1 |
| bg ↔ textMuted | >= 4.5:1 |
| surface ↔ textPrimary | >= 7:1 |
| surface ↔ textMuted | >= 3:1 |
| elevated ↔ textPrimary | >= 4.5:1 |
| elevated ↔ textMuted | >= 3:1 (with fallback) |
| bg ↔ borderSubtle | 1.2-3:1 |
| bg ↔ borderStrong | >= 3:1 |
| bg ↔ accentSoft | 1.5-3:1 |
| accentSolid ↔ textOnAccent | >= 4.5:1 |

---

## Derived Constraints

Beyond absolute contrast ratios, some tokens have relative constraints:

### Hue Locking

Tokens that must share hue (within 30° difference):

| Token | Must match hue of |
|-------|-------------------|
| textMuted | textPrimary |
| accentSoft | accentSolid |

This ensures visual cohesion - muted text doesn't shift to a different color family, and soft accents remain recognizable variants of the solid accent.

### Relative Contrast

textMuted has an additional constraint: its contrast ratio against bgApp must be 60-85% of textPrimary's contrast ratio against bgApp. This prevents muted text from being either too similar to primary text (defeating its purpose) or too washed out (becoming hard to read).

```
Example (dark mode):
  textPrimary vs bgApp = 12:1
  textMuted vs bgApp must be 7.2:1 to 10.2:1 (0.6-0.85 × 12)
```

---

## Enumeration Algorithm

Valid configurations are enumerated using backtracking:

```
1. For each token in dependency order:
   [bgApp, bgSurface, bgElevated, textPrimary, textMuted,
    borderSubtle, borderStrong, accentSolid, accentSoft]

2. Filter palette colors by constraint:
   - Chroma bounds (maxChroma/minChroma)
   - Lightness range (static or computed from dependencies)
   - Contrast requirements vs already-assigned tokens
   - Hue locking (textMuted → textPrimary, accentSoft → accentSolid)
   - Relative contrast (textMuted must be 0.6-0.85× of textPrimary's contrast vs bg)
   - Chroma ratio (accentSoft: 0.5-0.8× accentSolid's chroma)

3. Shuffle candidates for variety

4. Try each candidate via backtracking:
   - Assign color to token
   - Recurse to next token
   - If all tokens assigned, save configuration
   - Backtrack and try next candidate

5. Stop when 12 configurations found or exhausted
```

---

## Contrast Fallbacks

When textMuted fails 3:1 contrast on bgElevated:
- CSS variable `--color-text-on-elevated` is set to textPrimary instead
- Use this variable for muted text on elevated surfaces (e.g., card descriptions)

---

## UI Modes

### Valid Configurations
- Pre-computed schemes satisfying all constraints
- Listed as selectable buttons with color previews
- Clicking applies that exact token assignment

### Unconstrained Randomization
- "Playful" mode ignoring constraint rules
- Uses original random selection algorithm
- May produce schemes with contrast issues

---

## WCAG Contrast Calculation

```
Relative luminance:
  L = 0.2126 * R + 0.7152 * G + 0.0722 * B
  where R/G/B = (val/255)^2.4 if val > 0.04045 else val/255/12.92

Contrast ratio:
  CR = (L1 + 0.05) / (L2 + 0.05)  where L1 > L2
```

---

## Status Colors

Status colors (error/warning/success) have been removed from the scheme. Only `destructive` remains as an auto-assigned fallback color outside the constraint system.
