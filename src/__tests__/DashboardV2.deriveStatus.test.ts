import { describe, it, expect } from '@jest/globals';
import { deriveStatus } from '../pages/DashboardV2';

describe('deriveStatus', () => {
  it('should return "critical" when replacement probability >= 0.85', () => {
    expect(deriveStatus(0.85)).toBe('critical');
    expect(deriveStatus(0.9)).toBe('critical');
    expect(deriveStatus(1.0)).toBe('critical');
  });

  it('should return "warning" when replacement probability is 0.55-0.84', () => {
    expect(deriveStatus(0.55)).toBe('warning');
    expect(deriveStatus(0.7)).toBe('warning');
    expect(deriveStatus(0.84)).toBe('warning');
  });

  it('should return "great" when replacement probability is 0.35-0.54', () => {
    expect(deriveStatus(0.35)).toBe('great');
    expect(deriveStatus(0.45)).toBe('great');
    expect(deriveStatus(0.54)).toBe('great');
  });

  it('should return "excellent" when replacement probability < 0.35', () => {
    expect(deriveStatus(0.0)).toBe('excellent');
    expect(deriveStatus(0.1)).toBe('excellent');
    expect(deriveStatus(0.34)).toBe('excellent');
  });

  it('should return "excellent" when replacement probability is undefined or null', () => {
    expect(deriveStatus(undefined)).toBe('excellent');
    expect(deriveStatus(null)).toBe('excellent');
  });
});