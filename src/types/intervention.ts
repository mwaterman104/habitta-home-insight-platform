/**
 * INTERVENTION BEHAVIORAL CONTRACT
 * 
 * InterventionScore = (FailureProbability × EmergencyCost) + UrgencyPremium
 * 
 * Rules:
 * ❌ NO engagement multipliers
 * ❌ NO "user anxiety" signals
 * ❌ NO normalization away from dollars
 * ✅ Dollar-denominated logic only
 * ✅ Must remain explainable and auditable
 */

export type TriggerReason = 
  | 'risk_threshold_crossed'
  | 'seasonal_risk_event'
  | 'financial_planning_window'
  | 'user_initiated'
  | 'new_evidence_arrived';

export type DecisionType = 
  | 'replace_now'
  | 'defer_with_date'
  | 'schedule_inspection'
  | 'schedule_maintenance'
  | 'no_action'
  | 'get_quotes';

export type ClosedReason = 
  | 'decision_made'
  | 'user_deferred'
  | 'closed_without_decision'
  | 'timed_out';

export interface InterventionMessage {
  id: string;
  role: 'system' | 'assistant' | 'user';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface Intervention {
  id: string;
  homeId: string;
  systemId: string;
  userId: string;
  triggerReason: TriggerReason;
  interventionScore: number;
  interventionThresholdUsed: number;
  riskOutlookSnapshot: number;
  baselineStrengthSnapshot: number;
  comparableHomesCount?: number;
  dataSources?: Record<string, unknown>;
  urgencyPremiumSnapshot: number;
  urgencyFactorsSnapshot: Record<string, boolean>;
  openedAt: string;
  lastViewedAt?: string;
  closedAt?: string;
  closedReason?: ClosedReason;
  cooldownUntil?: string;
  messages: InterventionMessage[];
  messageOrder: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DecisionEvent {
  id: string;
  homeId: string;
  systemId: string;
  interventionId?: string;
  userId: string;
  decisionType: DecisionType;
  deferUntil?: string;
  nextReviewAt?: string;
  assumptionsJson: Record<string, unknown>;
  userNotes?: string;
  contractorSelectedId?: string;
  createdAt: string;
}

export interface EstimatedImpactCost {
  proactive: number;
  emergency: number;
  potentialDamage: number;
}

/**
 * Database row types for Supabase integration
 */
export interface InterventionRow {
  id: string;
  home_id: string;
  system_id: string;
  user_id: string;
  trigger_reason: TriggerReason;
  intervention_score: number;
  intervention_threshold_used: number;
  risk_outlook_snapshot: number;
  baseline_strength_snapshot: number;
  comparable_homes_count?: number;
  data_sources?: Record<string, unknown>;
  urgency_premium_snapshot: number;
  urgency_factors_snapshot?: Record<string, boolean>;
  opened_at: string;
  last_viewed_at?: string;
  closed_at?: string;
  closed_reason?: ClosedReason;
  cooldown_until?: string;
  messages: InterventionMessage[];
  message_order: string[];
  created_at: string;
  updated_at: string;
}

export interface DecisionEventRow {
  id: string;
  home_id: string;
  system_id: string;
  intervention_id?: string;
  user_id: string;
  decision_type: DecisionType;
  defer_until?: string;
  next_review_at?: string;
  assumptions_json: Record<string, unknown>;
  user_notes?: string;
  contractor_selected_id?: string;
  created_at: string;
}

/**
 * Map database row to frontend Intervention type
 */
export function mapInterventionRow(row: InterventionRow): Intervention {
  return {
    id: row.id,
    homeId: row.home_id,
    systemId: row.system_id,
    userId: row.user_id,
    triggerReason: row.trigger_reason,
    interventionScore: row.intervention_score,
    interventionThresholdUsed: row.intervention_threshold_used,
    riskOutlookSnapshot: row.risk_outlook_snapshot,
    baselineStrengthSnapshot: row.baseline_strength_snapshot,
    comparableHomesCount: row.comparable_homes_count,
    dataSources: row.data_sources,
    urgencyPremiumSnapshot: row.urgency_premium_snapshot,
    urgencyFactorsSnapshot: row.urgency_factors_snapshot ?? {},
    openedAt: row.opened_at,
    lastViewedAt: row.last_viewed_at,
    closedAt: row.closed_at,
    closedReason: row.closed_reason,
    cooldownUntil: row.cooldown_until,
    messages: row.messages,
    messageOrder: row.message_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Map database row to frontend DecisionEvent type
 */
export function mapDecisionEventRow(row: DecisionEventRow): DecisionEvent {
  return {
    id: row.id,
    homeId: row.home_id,
    systemId: row.system_id,
    interventionId: row.intervention_id,
    userId: row.user_id,
    decisionType: row.decision_type,
    deferUntil: row.defer_until,
    nextReviewAt: row.next_review_at,
    assumptionsJson: row.assumptions_json,
    userNotes: row.user_notes,
    contractorSelectedId: row.contractor_selected_id,
    createdAt: row.created_at,
  };
}
