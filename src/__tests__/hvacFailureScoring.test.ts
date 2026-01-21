/**
 * HVAC Failure Window Scoring Tests
 * 
 * Tests for determinism, edge cases, and expected behavior
 */

import { scoreHVACFailure, getHVACFailureConstants } from '@/services/hvacFailureScoring';
import type { HVACFailureInputs } from '@/types/hvacFailure';

describe('scoreHVACFailure', () => {
  const fixedNow = new Date('2025-01-21T12:00:00Z');
  
  const baseInputs: HVACFailureInputs = {
    installDate: new Date('2023-12-01'),
    climateStressIndex: 0.8,
    maintenanceScore: 0.5,
    featureCompleteness: 0.5,
    installVerified: true,
    hasUsageSignal: false
  };

  describe('determinism', () => {
    it('produces identical output for same inputs', () => {
      const result1 = scoreHVACFailure(baseInputs, fixedNow);
      const result2 = scoreHVACFailure(baseInputs, fixedNow);
      
      expect(result1).toEqual(result2);
    });
    
    it('produces different output for different now dates', () => {
      const now1 = new Date('2025-01-21T12:00:00Z');
      const now2 = new Date('2026-01-21T12:00:00Z');
      
      const result1 = scoreHVACFailure(baseInputs, now1);
      const result2 = scoreHVACFailure(baseInputs, now2);
      
      expect(result1.years_remaining_p50).toBeGreaterThan(result2.years_remaining_p50);
    });
  });

  describe('expected values', () => {
    it('calculates correct values for Miami scenario', () => {
      // Install late 2023, Miami climate (0.8), moderate maintenance (0.5)
      const result = scoreHVACFailure(baseInputs, fixedNow);
      
      // Age should be ~1.1 years
      expect(result.years_remaining_p50).toBeGreaterThan(5);
      expect(result.years_remaining_p50).toBeLessThan(15);
      
      // With install verified + moderate maintenance, confidence should be decent
      expect(result.confidence_0_1).toBeGreaterThan(0.5);
      expect(result.confidence_0_1).toBeLessThan(0.9);
      
      // p10 < p50 < p90
      const p10Year = new Date(result.p10_failure_date).getFullYear();
      const p50Year = new Date(result.p50_failure_date).getFullYear();
      const p90Year = new Date(result.p90_failure_date).getFullYear();
      expect(p10Year).toBeLessThanOrEqual(p50Year);
      expect(p50Year).toBeLessThanOrEqual(p90Year);
    });
    
    it('has correct provenance structure', () => {
      const result = scoreHVACFailure(baseInputs, fixedNow);
      
      expect(result.provenance.model_version).toBe('hvac_failure_v1');
      expect(result.provenance.multipliers.M_climate).toBeCloseTo(0.856, 2);
      expect(result.provenance.multipliers.M_maintenance).toBeCloseTo(0.975, 2);
      expect(result.provenance.multipliers.M_install).toBeCloseTo(1.03, 2);
      expect(result.provenance.multipliers.M_total).toBeGreaterThan(0.6);
      expect(result.provenance.multipliers.M_total).toBeLessThan(1.3);
    });
  });

  describe('edge cases', () => {
    it('handles system already beyond expected lifespan', () => {
      const oldSystemInputs: HVACFailureInputs = {
        installDate: new Date('2005-01-01'),
        climateStressIndex: 0.8,
        maintenanceScore: 0.3,
        featureCompleteness: 0.5,
        installVerified: false,
        hasUsageSignal: false
      };
      
      const result = scoreHVACFailure(oldSystemInputs, fixedNow);
      
      // years_remaining should be 0 or very small
      expect(result.years_remaining_p50).toBe(0);
      
      // Dates should not go backwards - should be current or future
      const p50Date = new Date(result.p50_failure_date);
      expect(p50Date.getTime()).toBeGreaterThanOrEqual(fixedNow.getTime());
    });
    
    it('handles new system with minimal data', () => {
      const newSystemInputs: HVACFailureInputs = {
        installDate: new Date('2024-06-01'),
        climateStressIndex: 0.4,
        maintenanceScore: 0,
        featureCompleteness: 0.2,
        installVerified: false,
        hasUsageSignal: false
      };
      
      const result = scoreHVACFailure(newSystemInputs, fixedNow);
      
      // Should have low confidence due to missing data
      expect(result.confidence_0_1).toBeLessThan(0.4);
      
      // Should still produce valid dates
      expect(result.p10_failure_date).toBeTruthy();
      expect(result.p50_failure_date).toBeTruthy();
      expect(result.p90_failure_date).toBeTruthy();
    });
    
    it('handles maximum stress scenario', () => {
      const maxStressInputs: HVACFailureInputs = {
        installDate: new Date('2015-01-01'),
        climateStressIndex: 1.0,
        maintenanceScore: 0,
        featureCompleteness: 0,
        usageIndex: 1.0,
        environmentIndex: 1.0,
        installVerified: false,
        hasUsageSignal: false
      };
      
      const result = scoreHVACFailure(maxStressInputs, fixedNow);
      
      // Total multiplier should be clamped to minimum
      expect(result.provenance.multipliers.M_total).toBe(0.6);
    });
    
    it('handles best case scenario', () => {
      const bestCaseInputs: HVACFailureInputs = {
        installDate: new Date('2024-01-01'),
        climateStressIndex: 0,
        maintenanceScore: 1.0,
        featureCompleteness: 1.0,
        usageIndex: 0,
        environmentIndex: 0,
        installVerified: true,
        hasUsageSignal: true
      };
      
      const result = scoreHVACFailure(bestCaseInputs, fixedNow);
      
      // Should have maximum confidence
      expect(result.confidence_0_1).toBe(1);
      
      // Sigma should be at baseline (not expanded)
      expect(result.provenance.effective.sigma_effective).toBe(
        result.provenance.baseline.sigma_base
      );
    });
  });

  describe('input normalization', () => {
    it('clamps out-of-range indices', () => {
      const outOfRangeInputs: HVACFailureInputs = {
        installDate: new Date('2023-01-01'),
        climateStressIndex: 1.5, // Over 1
        maintenanceScore: -0.5, // Under 0
        featureCompleteness: 2.0, // Way over 1
        installVerified: true,
        hasUsageSignal: false
      };
      
      const result = scoreHVACFailure(outOfRangeInputs, fixedNow);
      
      // Should still produce valid output (indices clamped internally)
      expect(result.years_remaining_p50).toBeGreaterThanOrEqual(0);
      expect(result.confidence_0_1).toBeGreaterThanOrEqual(0);
      expect(result.confidence_0_1).toBeLessThanOrEqual(1);
    });
  });

  describe('constants', () => {
    it('exposes model constants for testing', () => {
      const constants = getHVACFailureConstants();
      
      expect(constants.model_version).toBe('hvac_failure_v1');
      expect(constants.baseline.median_lifespan_years).toBe(13);
      expect(constants.baseline.sigma_years).toBe(2.5);
      expect(constants.clamps.multiplier_min).toBe(0.6);
      expect(constants.clamps.multiplier_max).toBe(1.3);
    });
  });
});
