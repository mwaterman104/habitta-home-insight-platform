/**
 * UI GOVERNANCE RULE (Non-Negotiable)
 * 
 * No new metric, card, or panel can be added to Dashboard V3 unless it
 * answers exactly ONE of these five surface jobs:
 * 
 * | Surface              | Job                    |
 * |----------------------|------------------------|
 * | Home Brief           | What matters today     |
 * | Health Score         | Overall trajectory     |
 * | Timeline             | When things change     |
 * | Maintenance          | What prevents change   |
 * | Capital              | Financial smoothing    |
 * 
 * If it doesn't move behavior or understanding, it doesn't ship.
 * 
 * This prevents V3 from becoming V2 (metric overload, passive reporting).
 */

export const SURFACE_JOBS = {
  HOME_BRIEF: 'what_matters_today',
  HEALTH_SCORE: 'overall_trajectory',
  TIMELINE: 'when_things_change',
  MAINTENANCE: 'what_prevents_change',
  CAPITAL: 'financial_smoothing',
} as const;

export type SurfaceJob = typeof SURFACE_JOBS[keyof typeof SURFACE_JOBS];

/**
 * Validate that a new component serves exactly one surface job.
 * Use this as a gate before adding new dashboard components.
 */
export function validateNewComponent(job: keyof typeof SURFACE_JOBS): boolean {
  return job in SURFACE_JOBS;
}

/**
 * Get the description for a surface job.
 * Useful for documentation and error messages.
 */
export function getSurfaceJobDescription(job: SurfaceJob): string {
  switch (job) {
    case 'what_matters_today':
      return 'Answers: What is the most important thing for me to know right now?';
    case 'overall_trajectory':
      return 'Answers: Is my home getting better or worse over time?';
    case 'when_things_change':
      return 'Answers: When will I need to make decisions or take action?';
    case 'what_prevents_change':
      return 'Answers: What actions keep my home in good condition?';
    case 'financial_smoothing':
      return 'Answers: How do I plan financially for major expenses?';
    default:
      return 'Unknown surface job';
  }
}

/**
 * Cadence rules for advisor auto-expansion.
 * These prevent trigger spam and maintain trust.
 */
export const CADENCE_RULES = {
  /** Minimum time before the same trigger can fire again */
  minTimeBetweenSameTrigger: 24 * 60 * 60 * 1000, // 24 hours
  
  /** Maximum auto-opens per session to prevent fatigue */
  maxAutoOpensPerSession: 2,
  
  /** Don't speak if data hasn't changed */
  silentOnNoChange: true,
} as const;

/**
 * Trigger history entry for persistence.
 */
export interface TriggerHistoryEntry {
  key: string;
  timestamp: number;
}

/**
 * Storage key for trigger history in localStorage.
 */
export const TRIGGER_HISTORY_KEY = 'habitta_trigger_history';

/**
 * Session key for tracking auto-opens in current session.
 */
export const SESSION_AUTO_OPENS_KEY = 'habitta_session_auto_opens';

/**
 * Load trigger history from localStorage.
 * Filters out entries older than the cadence window.
 */
export function loadTriggerHistory(): TriggerHistoryEntry[] {
  try {
    const stored = localStorage.getItem(TRIGGER_HISTORY_KEY);
    if (!stored) return [];
    
    const history: TriggerHistoryEntry[] = JSON.parse(stored);
    const now = Date.now();
    
    // Filter out triggers older than cadence window
    return history.filter(
      entry => now - entry.timestamp < CADENCE_RULES.minTimeBetweenSameTrigger
    );
  } catch {
    return [];
  }
}

/**
 * Save trigger to history.
 */
export function saveTriggerToHistory(triggerKey: string): void {
  try {
    const history = loadTriggerHistory();
    history.push({ key: triggerKey, timestamp: Date.now() });
    localStorage.setItem(TRIGGER_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Silently fail if localStorage unavailable
  }
}

/**
 * Get session auto-open count.
 */
export function getSessionAutoOpens(): number {
  try {
    const count = sessionStorage.getItem(SESSION_AUTO_OPENS_KEY);
    return count ? parseInt(count, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Increment session auto-open count.
 */
export function incrementSessionAutoOpens(): void {
  try {
    const count = getSessionAutoOpens();
    sessionStorage.setItem(SESSION_AUTO_OPENS_KEY, String(count + 1));
  } catch {
    // Silently fail if sessionStorage unavailable
  }
}

/**
 * Check if we can auto-open based on session limits.
 */
export function canAutoOpen(): boolean {
  return getSessionAutoOpens() < CADENCE_RULES.maxAutoOpensPerSession;
}
