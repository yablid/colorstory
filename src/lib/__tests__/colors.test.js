import { describe, it, expect } from 'vitest';
import {
  TONE,
  CHROMA,
  getTone,
  getChromaClass,
  hueInRange,
  DESTRUCTIVE_HUE
} from '../colors.js';

describe('getTone', () => {
  it('returns dark for L <= 0.35', () => {
    expect(getTone(0)).toBe('dark');
    expect(getTone(0.35)).toBe('dark');
  });

  it('returns light for L > 0.75', () => {
    expect(getTone(0.76)).toBe('light');
    expect(getTone(1)).toBe('light');
  });

  it('returns mid for values in between', () => {
    expect(getTone(0.36)).toBe('mid');
    expect(getTone(0.55)).toBe('mid');
    expect(getTone(0.75)).toBe('mid');
  });

  it('uses TONE constants correctly', () => {
    expect(getTone(TONE.DARK_MAX)).toBe('dark');
    expect(getTone(TONE.DARK_MAX + 0.01)).toBe('mid');
    expect(getTone(TONE.LIGHT_MIN)).toBe('mid');
    expect(getTone(TONE.LIGHT_MIN + 0.01)).toBe('light');
  });
});

describe('getChromaClass', () => {
  it('returns neutral for C < 0.04', () => {
    expect(getChromaClass(0)).toBe('neutral');
    expect(getChromaClass(0.039)).toBe('neutral');
  });

  it('returns muted for 0.04 <= C < 0.08', () => {
    expect(getChromaClass(0.04)).toBe('muted');
    expect(getChromaClass(0.079)).toBe('muted');
  });

  it('returns vivid for C >= 0.08', () => {
    expect(getChromaClass(0.08)).toBe('vivid');
    expect(getChromaClass(0.2)).toBe('vivid');
  });

  it('uses CHROMA constants correctly', () => {
    expect(getChromaClass(CHROMA.NEUTRAL_MAX - 0.001)).toBe('neutral');
    expect(getChromaClass(CHROMA.NEUTRAL_MAX)).toBe('muted');
    expect(getChromaClass(CHROMA.STRONG_MIN - 0.001)).toBe('muted');
    expect(getChromaClass(CHROMA.STRONG_MIN)).toBe('vivid');
  });
});

describe('hueInRange', () => {
  describe('non-wrapping range', () => {
    const range = { min: 90, max: 180, wrap: false };

    it('returns true for hue in range', () => {
      expect(hueInRange(90, range)).toBe(true);
      expect(hueInRange(135, range)).toBe(true);
      expect(hueInRange(180, range)).toBe(true);
    });

    it('returns false for hue outside range', () => {
      expect(hueInRange(89, range)).toBe(false);
      expect(hueInRange(181, range)).toBe(false);
    });
  });

  describe('wrapping range (destructive hues)', () => {
    it('detects reds near 0', () => {
      expect(hueInRange(0, DESTRUCTIVE_HUE)).toBe(true);
      expect(hueInRange(20, DESTRUCTIVE_HUE)).toBe(true);
      expect(hueInRange(40, DESTRUCTIVE_HUE)).toBe(true);
    });

    it('detects reds near 360', () => {
      expect(hueInRange(350, DESTRUCTIVE_HUE)).toBe(true);
      expect(hueInRange(359, DESTRUCTIVE_HUE)).toBe(true);
    });

    it('rejects non-red hues', () => {
      expect(hueInRange(180, DESTRUCTIVE_HUE)).toBe(false);
      expect(hueInRange(100, DESTRUCTIVE_HUE)).toBe(false);
    });
  });
});
