/**
 * Centralized Home Health Status Normalization
 * 
 * DOCTRINE COMPLIANCE:
 * - No gamification labels ("Healthy", "Score", "Home Pulse")
 * - Neutral, observational language only
 * - Color palette: slate (muted) not urgency-coded
 * 
 * QA GUARDRAIL: "Elevated" is only valid when changedSinceLastVisit === true
 */

export type InternalHealthStatus = 'healthy' | 'attention' | 'critical';
export type NormalizedStatusLabel = 'Stable' | 'Observed' | 'Elevated';

export interface NormalizedStatus {
  label: NormalizedStatusLabel;
  color: string;  // Tailwind class
}

/**
 * Normalize internal health status to doctrine-compliant display values
 * 
 * @param status - Internal status key
 * @param changedSinceLastVisit - If true, allows "Elevated" for critical states
 */
export function normalizeHealthStatus(
  status: InternalHealthStatus,
  changedSinceLastVisit: boolean = false
): NormalizedStatus {
  switch (status) {
    case 'healthy':
      return { label: 'Stable', color: 'bg-slate-400' };
    case 'attention':
      return { label: 'Observed', color: 'bg-slate-500' };
    case 'critical':
      // QA Guardrail: "Elevated" only when something changed
      return changedSinceLastVisit
        ? { label: 'Elevated', color: 'bg-slate-600' }
        : { label: 'Observed', color: 'bg-slate-500' };
    default:
      return { label: 'Stable', color: 'bg-slate-400' };
  }
}

/**
 * Get status label only (when you don't need color)
 */
export function getHealthStatusLabel(
  status: InternalHealthStatus,
  changedSinceLastVisit: boolean = false
): NormalizedStatusLabel {
  return normalizeHealthStatus(status, changedSinceLastVisit).label;
}
