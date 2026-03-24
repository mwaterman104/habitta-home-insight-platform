// Re-export existing SurvivalPrediction from useIntelligenceEngine
export type { SurvivalPrediction } from '@/hooks/useIntelligenceEngine';

// Core snapshot structure (before/after maintenance)
export interface RiskSnapshot {
  score: number;
  failureProbability12mo: number | null;
  monthsRemaining: number | null;
  status: 'excellent' | 'good' | 'attention' | 'urgent';
}

// Calculated delta between snapshots
export interface RiskDelta {
  scoreChange: number;
  failureProbReduction: number | null;  // Positive = improvement
  monthsAdded: number | null;
  statusChange: { from: string; to: string } | null;
}

// Complete maintenance impact record
export interface MaintenanceImpact {
  taskId: string;
  homeId: string;
  systemType: string;
  completedAt: string;
  before: RiskSnapshot;
  after: RiskSnapshot;
  delta: RiskDelta;
  calculationDurationMs: number;
  calculationStatus: 'success' | 'timeout' | 'failed' | 'pending';
}

// Validation result from delta checks
export interface ValidationResult {
  isValid: boolean;
  isSuspicious: boolean;
  reason?: string;
  shouldUseEstimate?: boolean;
}

// Validation bounds for sanity checking
export const DELTA_BOUNDS = {
  maxScoreChange: 25,         // Single task can't improve 25+ points
  maxMonthsAdded: 36,         // Single task can't add 3+ years
  maxFailureReduction: 0.30,  // Single task can't reduce 30%+ risk
  minScoreChange: -10,        // Task shouldn't hurt score significantly
  minMonthsAdded: -6,         // Task shouldn't lose 6+ months
} as const;

// Magic number constants
export const CALCULATION_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
export const CALCULATION_TIMEOUT_MS = 60 * 1000;    // 60 seconds
export const POLL_INTERVAL_MS = 3000;               // 3 seconds

// Toast threshold configuration
export const TOAST_THRESHOLDS = {
  scoreChange: 5,
  monthsAdded: 6,
  failureProbReduction: 0.10, // 10%
} as const;
