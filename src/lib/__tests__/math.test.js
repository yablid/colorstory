import { describe, it, expect } from 'vitest';
import {
  relativeLuminance,
  contrastRatio,
  meetsContrast,
  hueDifference
} from '../math.js';

describe('relativeLuminance', () => {
  it('returns 0 for black', () => {
    expect(relativeLuminance([0, 0, 0])).toBe(0);
  });

  it('returns 1 for white', () => {
    expect(relativeLuminance([255, 255, 255])).toBe(1);
  });

  it('returns ~0.2126 for pure red', () => {
    expect(relativeLuminance([255, 0, 0])).toBeCloseTo(0.2126, 4);
  });
});

describe('contrastRatio', () => {
  it('returns 21:1 for black on white', () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBe(21);
  });

  it('returns 1:1 for same color', () => {
    expect(contrastRatio([128, 128, 128], [128, 128, 128])).toBe(1);
  });

  it('is symmetric', () => {
    const a = [50, 100, 150];
    const b = [200, 180, 160];
    expect(contrastRatio(a, b)).toBe(contrastRatio(b, a));
  });
});

describe('meetsContrast', () => {
  it('returns true for black/white at 4.5', () => {
    expect(meetsContrast([0, 0, 0], [255, 255, 255], 4.5)).toBe(true);
  });

  it('returns false for low contrast pair', () => {
    expect(meetsContrast([128, 128, 128], [140, 140, 140], 4.5)).toBe(false);
  });
});

describe('hueDifference', () => {
  it('returns 0 for same hue', () => {
    expect(hueDifference(180, 180)).toBe(0);
  });

  it('returns 90 for quarter circle', () => {
    expect(hueDifference(0, 90)).toBe(90);
  });

  it('takes shortest path across 0', () => {
    expect(hueDifference(350, 10)).toBe(20);
  });

  it('never exceeds 180', () => {
    expect(hueDifference(0, 270)).toBe(90);
  });
});
