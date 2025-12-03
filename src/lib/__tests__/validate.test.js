import { describe, it, expect } from 'vitest';
import { validatePalette, getValidationSummary } from '../validate.js';

// Helper to create a minimal color
const color = (L, C, H = 0) => ({ name: 'test', rgb: [128, 128, 128], oklch: [L, C, H] });

describe('validatePalette', () => {
  it('returns error for missing colors array', () => {
    const result = validatePalette({});
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Palette has no colors array');
  });

  it('returns error for too few colors', () => {
    const result = validatePalette({ colors: [color(0.5, 0.1)] });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Need 12 colors'))).toBe(true);
  });

  it('validates a minimal valid palette', () => {
    // Construct exactly what's needed:
    // 2 dark neutrals, 2 mid neutrals, 2 light neutrals, 1 strong accent
    // + 5 more to reach 12
    const palette = {
      colors: [
        // Dark neutrals (L <= 0.35, C < 0.04)
        color(0.2, 0.02),
        color(0.3, 0.03),
        // Mid neutrals (0.35 < L < 0.75, C < 0.04)
        color(0.5, 0.02),
        color(0.6, 0.03),
        // Light neutrals (L >= 0.75, C < 0.04)
        color(0.8, 0.02),
        color(0.9, 0.03),
        // Strong accent (C >= 0.08)
        color(0.5, 0.15),
        // Muted accent (0.04 <= C < 0.08)
        color(0.5, 0.05),
        // Filler to reach 12
        color(0.5, 0.1),
        color(0.5, 0.1),
        color(0.5, 0.1),
        color(0.5, 0.1)
      ]
    };

    const result = validatePalette(palette);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails when missing dark neutrals', () => {
    const palette = {
      colors: [
        // No dark neutrals
        color(0.5, 0.02),
        color(0.6, 0.02),
        color(0.8, 0.02),
        color(0.9, 0.02),
        color(0.5, 0.15),
        color(0.5, 0.05),
        color(0.5, 0.1),
        color(0.5, 0.1),
        color(0.5, 0.1),
        color(0.5, 0.1),
        color(0.5, 0.1),
        color(0.5, 0.1)
      ]
    };

    const result = validatePalette(palette);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('dark neutrals'))).toBe(true);
  });

  it('fails when missing strong accents', () => {
    const palette = {
      colors: [
        color(0.2, 0.02),
        color(0.3, 0.02),
        color(0.5, 0.02),
        color(0.6, 0.02),
        color(0.8, 0.02),
        color(0.9, 0.02),
        // All neutrals, no strong accents
        color(0.5, 0.02),
        color(0.5, 0.02),
        color(0.5, 0.02),
        color(0.5, 0.02),
        color(0.5, 0.02),
        color(0.5, 0.02)
      ]
    };

    const result = validatePalette(palette);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('strong accent'))).toBe(true);
  });

  it('warns when missing muted accents but remains valid', () => {
    const palette = {
      colors: [
        color(0.2, 0.02),
        color(0.3, 0.02),
        color(0.5, 0.02),
        color(0.6, 0.02),
        color(0.8, 0.02),
        color(0.9, 0.02),
        // Strong accents only, no muted
        color(0.5, 0.15),
        color(0.5, 0.15),
        color(0.5, 0.15),
        color(0.5, 0.15),
        color(0.5, 0.15),
        color(0.5, 0.15)
      ]
    };

    const result = validatePalette(palette);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes('muted accent'))).toBe(true);
  });

  it('counts are accurate', () => {
    const palette = {
      colors: [
        color(0.2, 0.02),
        color(0.3, 0.02),
        color(0.5, 0.02),
        color(0.6, 0.02),
        color(0.8, 0.02),
        color(0.9, 0.02),
        color(0.5, 0.15),
        color(0.5, 0.05),
        color(0.5, 0.1),
        color(0.5, 0.1),
        color(0.5, 0.1),
        color(0.5, 0.1)
      ]
    };

    const result = validatePalette(palette);
    expect(result.counts.total).toBe(12);
    expect(result.counts.darkNeutrals).toBe(2);
    expect(result.counts.midNeutrals).toBe(2);
    expect(result.counts.lightNeutrals).toBe(2);
    expect(result.counts.strongAccents).toBe(5); // 1 + 4 filler vivids
    expect(result.counts.mutedAccents).toBe(1);
  });
});

describe('getValidationSummary', () => {
  it('returns structured summary with ok flags', () => {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      counts: {
        total: 12,
        darkNeutrals: 2,
        midNeutrals: 2,
        lightNeutrals: 2,
        strongAccents: 3,
        mutedAccents: 1
      }
    };

    const summary = getValidationSummary(result);
    expect(summary.neutrals.dark.ok).toBe(true);
    expect(summary.neutrals.mid.ok).toBe(true);
    expect(summary.neutrals.light.ok).toBe(true);
    expect(summary.accents.strong.ok).toBe(true);
    expect(summary.total.ok).toBe(true);
  });
});
