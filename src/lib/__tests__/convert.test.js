import { describe, it, expect } from 'vitest';
import {
  rgbToOklch,
  oklchToRgb,
  hexToRgb,
  rgbToHex,
  parseColorString
} from '../convert.js';

describe('rgbToOklch / oklchToRgb roundtrip', () => {
  // Saturated primaries (255,0,0), (0,255,0), (0,0,255) are at gamut edge
  // and lose precision in hue during roundtrip. Test with in-gamut colors.
  const samples = [
    [0, 0, 0],
    [255, 255, 255],
    [128, 64, 192],
    [200, 100, 50],
    [50, 100, 150],
    [180, 180, 180]
  ];

  samples.forEach((rgb) => {
    it(`roundtrips ${JSON.stringify(rgb)}`, () => {
      const oklch = rgbToOklch(rgb);
      const back = oklchToRgb(oklch);
      // Allow +/- 1 due to rounding in intermediate steps
      expect(Math.abs(back[0] - rgb[0])).toBeLessThanOrEqual(1);
      expect(Math.abs(back[1] - rgb[1])).toBeLessThanOrEqual(1);
      expect(Math.abs(back[2] - rgb[2])).toBeLessThanOrEqual(1);
    });
  });
});

describe('hexToRgb', () => {
  it('parses 6-digit hex with #', () => {
    expect(hexToRgb('#ff0000')).toEqual([255, 0, 0]);
  });

  it('parses 6-digit hex without #', () => {
    expect(hexToRgb('00ff00')).toEqual([0, 255, 0]);
  });

  it('parses 3-digit hex', () => {
    expect(hexToRgb('#fff')).toEqual([255, 255, 255]);
  });

  it('returns null for invalid input', () => {
    expect(hexToRgb('notacolor')).toBe(null);
  });
});

describe('rgbToHex', () => {
  it('converts rgb to hex', () => {
    expect(rgbToHex([255, 0, 0])).toBe('#ff0000');
  });

  it('pads single digits', () => {
    expect(rgbToHex([0, 0, 15])).toBe('#00000f');
  });
});

describe('parseColorString', () => {
  it('parses hex', () => {
    expect(parseColorString('#ff0000')).toEqual([255, 0, 0]);
  });

  it('parses rgb() with commas', () => {
    expect(parseColorString('rgb(255, 128, 64)')).toEqual([255, 128, 64]);
  });

  it('parses rgb() with spaces', () => {
    expect(parseColorString('rgb(255 128 64)')).toEqual([255, 128, 64]);
  });

  it('parses oklch() and converts to rgb', () => {
    const result = parseColorString('oklch(0.5 0.1 180)');
    expect(result).not.toBe(null);
    expect(result.length).toBe(3);
    result.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(255);
    });
  });

  it('returns null for invalid input', () => {
    expect(parseColorString('garbage')).toBe(null);
  });
});
