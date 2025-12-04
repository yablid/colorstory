import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { enumerateConfigurations, validateConfiguration } from '../enumerate.js';

// Load test palette
const testPalette = JSON.parse(
  readFileSync(new URL('../../../public/palettes/edwardian.json', import.meta.url), 'utf-8')
);

describe('enumerateConfigurations', () => {
  describe('dark mode', () => {
    const configs = enumerateConfigurations(testPalette.colors, 'dark');

    it('returns an array', () => {
      expect(Array.isArray(configs)).toBe(true);
    });

    it('returns at most 12 configurations', () => {
      expect(configs.length).toBeLessThanOrEqual(12);
    });

    it('each configuration has required token structure', () => {
      // Skip if no configs (palette may not satisfy constraints)
      if (configs.length === 0) return;

      const requiredTokens = [
        'bgApp',
        'bgSurface',
        'bgElevated',
        'textPrimary',
        'textMuted',
        'borderSubtle',
        'borderStrong',
        'accentSolid',
        'accentSoft',
        'textOnAccent'
      ];

      configs.forEach((config) => {
        expect(config).toHaveProperty('tokens');
        requiredTokens.forEach((token) => {
          expect(config.tokens).toHaveProperty(token);
        });
      });
    });
  });

  describe('light mode', () => {
    const configs = enumerateConfigurations(testPalette.colors, 'light');

    it('returns an array', () => {
      expect(Array.isArray(configs)).toBe(true);
    });

    it('returns at most 12 configurations', () => {
      expect(configs.length).toBeLessThanOrEqual(12);
    });
  });
});

describe('validateConfiguration', () => {
  const darkConfigs = enumerateConfigurations(testPalette.colors, 'dark');
  const lightConfigs = enumerateConfigurations(testPalette.colors, 'light');

  it('all enumerated dark configs pass validation', () => {
    darkConfigs.forEach((config) => {
      const isValid = validateConfiguration(config, 'dark');
      expect(isValid).toBe(true);
    });
  });

  it('all enumerated light configs pass validation', () => {
    lightConfigs.forEach((config) => {
      const isValid = validateConfiguration(config, 'light');
      expect(isValid).toBe(true);
    });
  });
});
