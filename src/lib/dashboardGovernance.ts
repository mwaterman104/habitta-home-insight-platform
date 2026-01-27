/**
 * Dashboard Governance Module
 * 
 * Enforces layout caps and specificity cascade rules across the dashboard.
 * This is a structural constitution, not a runtime validator.
 * 
 * QC #4: Card Cap Enforcement
 * QC #5: Specificity Cascade Rule
 */

// ============================================
// DASHBOARD COMPONENT CAP (QC #4)
// ============================================

/**
 * Maximum components allowed per dashboard view.
 * This is a hard cap - no exceptions.
 */
export const DASHBOARD_COMPONENT_CAP = {
  heroCards: 2,           // HomePositionAnchor + EquityContextCard
  analyticalSurfaces: 1,  // LifecycleHorizon only
  expandableContext: 1,   // ContextDrawer only
  chat: 1,                // ChatDock only
} as const;

/**
 * Component registry for cap validation.
 * Use this to verify dashboard composition at build time.
 */
export const HERO_COMPONENTS = [
  'HomePositionAnchor',   // Primary hero
  'EquityContextCard',    // Secondary hero
] as const;

export const ANALYTICAL_COMPONENTS = [
  'LifecycleHorizon',
] as const;

export const CONTEXT_COMPONENTS = [
  'ContextDrawer',
] as const;

// ============================================
// SPECIFICITY CASCADE RULE (QC #5)
// ============================================

/**
 * Specificity levels for dashboard layers.
 * Lower numbers = less specific (higher in hierarchy).
 * 
 * Rule: No lower surface may introduce more specificity 
 * than the layer above it.
 */
export const SPECIFICITY_LEVELS = {
  statusHeader: 1,      // Least specific: one sentence
  heroCards: 2,         // Position + value context
  analyticalSurface: 3, // System-level detail
  contextDrawer: 4,     // Expanded rationale
  chat: 5,              // Exploratory (most specific allowed)
} as const;

export type SpecificityLevel = keyof typeof SPECIFICITY_LEVELS;

/**
 * Content permissions by specificity level.
 * Each layer can only show content at or below its specificity ceiling.
 */
export const LAYER_PERMISSIONS: Record<SpecificityLevel, {
  allowed: string[];
  prohibited: string[];
}> = {
  statusHeader: {
    allowed: [
      'One sentence overall state',
      'Observational language only',
    ],
    prohibited: [
      'System names',
      'Costs',
      'Dates',
      'Percentages',
      'Action buttons',
    ],
  },
  heroCards: {
    allowed: [
      'Position label (Early/Mid-Life/Late)',
      'Value number (current position)',
      'Outlook statement (observational)',
      'Confidence text',
      'Climate context',
    ],
    prohibited: [
      'System breakdowns',
      'Percentages',
      'Specific dates',
      'Cost estimates',
      'Action CTAs',
    ],
  },
  analyticalSurface: {
    allowed: [
      'System names',
      'Position bars (visual)',
      'Lifecycle stage labels',
      'Relative position indicators',
    ],
    prohibited: [
      'Costs',
      'Specific dates',
      'Action buttons',
      'Urgency indicators',
    ],
  },
  contextDrawer: {
    allowed: [
      'Rationale (why this surfaced)',
      'Signals (what we\'re seeing)',
      'Confidence explanations',
      'Capital advisory (observational)',
      'Source attribution',
    ],
    prohibited: [
      'Direct recommendations',
      'Action CTAs',
      'Task assignments',
    ],
  },
  chat: {
    allowed: [
      'Exploration',
      'Questions',
      'Context-aware responses',
    ],
    prohibited: [
      'Auto-generated actions',
      'Unsolicited recommendations',
    ],
  },
};

// ============================================
// VISUAL WEIGHT ASSIGNMENTS (QC #1)
// ============================================

/**
 * Visual weight tiers for dashboard components.
 * Prevents all elements from feeling equally "loud".
 */
export const VISUAL_WEIGHT = {
  quiet: {
    description: 'Status Header - no card, no border',
    tailwind: 'text-lg font-medium',
  },
  primaryHero: {
    description: 'HomePositionAnchor - larger padding, prominent label',
    tailwind: 'py-6 px-6',
  },
  secondaryHero: {
    description: 'EquityContextCard - smaller text, muted treatment',
    tailwind: 'py-4 px-5',
  },
  analytical: {
    description: 'LifecycleHorizon - subtle background, compact rows',
    tailwind: 'bg-muted/10 rounded-xl p-4',
  },
  expandable: {
    description: 'ContextDrawer - collapsed by default, no visual weight until opened',
    tailwind: '',
  },
  ambient: {
    description: 'ChatDock - sticky, minimal presence until engaged',
    tailwind: 'sticky bottom-4',
  },
} as const;

// ============================================
// EQUITY REFRESH CADENCE (QC #2)
// ============================================

/**
 * Equity context refresh cadence.
 * Value should only update on a slow cadence to reduce volatility anxiety.
 */
export const EQUITY_REFRESH_CADENCE = {
  intervalDays: 30,  // Monthly refresh
  cacheKey: 'habitta_equity_last_refresh',
} as const;

/**
 * Check if equity context should refresh based on cached timestamp.
 */
export function shouldRefreshEquity(): boolean {
  if (typeof window === 'undefined') return true;
  
  const lastRefresh = localStorage.getItem(EQUITY_REFRESH_CADENCE.cacheKey);
  if (!lastRefresh) return true;
  
  const lastDate = new Date(lastRefresh);
  const now = new Date();
  const daysSinceRefresh = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
  
  return daysSinceRefresh >= EQUITY_REFRESH_CADENCE.intervalDays;
}

/**
 * Mark equity as refreshed (call after fetching new value).
 */
export function markEquityRefreshed(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(EQUITY_REFRESH_CADENCE.cacheKey, new Date().toISOString());
}

// ============================================
// COMPONENT SPECIFICITY COMMENTS
// ============================================

/**
 * Use these comment blocks in each component to enforce specificity.
 * 
 * Example usage at top of component file:
 * 
 * ```
 * // SPECIFICITY LEVEL: Hero (2)
 * // 
 * // ALLOWED: Position label, outlook statement, confidence text
 * // PROHIBITED: System-level detail, costs, dates, action buttons
 * // 
 * // Cascade Rule: May not exceed Status Header specificity.
 * // Must not show system breakdowns (that's Analytical level).
 * ```
 */
export const SPECIFICITY_COMMENT_TEMPLATE = `
/**
 * SPECIFICITY LEVEL: {{level}} ({{number}})
 * 
 * ALLOWED: {{allowed}}
 * PROHIBITED: {{prohibited}}
 * 
 * Cascade Rule: May not exceed {{parentLevel}} specificity.
 * {{additionalNotes}}
 */
`;

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate that a component adheres to its specificity level.
 * This is a development-time check, not runtime.
 * 
 * @param content - Text content to validate
 * @param level - The specificity level to check against
 * @returns Array of violations, empty if compliant
 */
export function validateSpecificity(
  content: string,
  level: SpecificityLevel
): string[] {
  const violations: string[] = [];
  const permissions = LAYER_PERMISSIONS[level];
  
  // Check for prohibited patterns
  const prohibitedPatterns: Record<string, RegExp> = {
    'Costs': /\$\d+/,
    'Percentages': /\d+%/,
    'Specific dates': /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/i,
    'Urgency indicators': /\b(urgent|critical|immediately|asap|now)\b/i,
  };
  
  permissions.prohibited.forEach(prohibition => {
    const pattern = prohibitedPatterns[prohibition];
    if (pattern && pattern.test(content)) {
      violations.push(`Found prohibited content: ${prohibition}`);
    }
  });
  
  return violations;
}
