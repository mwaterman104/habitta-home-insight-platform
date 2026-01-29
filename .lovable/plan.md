

# Validation First: System Evidence Before Explanation

## Overview

This implementation creates the "Validation First" chat pattern where visual evidence (lifespan timeline, age context, optional cost comparison) appears **before** AI text when a user asks "Why?" about a flagged system.

**Core Principle (Immutable):** Show the gauge before you explain the diagnosis.

---

## Architecture Summary

```text
User clicks "Why?" on Water Heater (WATCH state)
        │
        ▼
┌───────────────────────────────────────────────────────┐
│ 1. handleWhyClick detects system_validation intent    │
│ 2. Creates system_validation_evidence artifact        │
│ 3. Injects artifact message with empty content        │
│    → Artifact renders immediately                     │
│ 4. Sends "Why?" question to AI                        │
│ 5. AI references "what you're seeing above"           │
└───────────────────────────────────────────────────────┘
```

---

## Files to Create

### 1. `src/components/dashboard-v3/artifacts/SystemValidationEvidenceArtifact.tsx`

New artifact component that renders:
- **Header**: System name + state label (e.g., "Water Heater — Approaching planning window")
- **Lifespan Timeline**: Visual OK | WATCH | PLAN segmented scale with position marker
- **Age Context**: "Age: ~14 years · Typical lifespan: 10-15 years"
- **Uncertainty Handling**: Muted styling + "Estimated based on regional norms" label when confidence < 0.6
- **Optional Cost Block**: Only shown when real cost data exists (no placeholders)

**Data Interface:**
```typescript
export interface SystemValidationEvidenceData {
  systemKey: string;
  displayName: string;
  state: 'stable' | 'planning_window' | 'elevated';
  position: number;        // 0-100 scale
  ageYears?: number;       // May be undefined if inferred
  expectedLifespan?: number;
  monthsRemaining?: number;
  confidence: number;      // 0-1 for visual treatment
  baselineSource: 'inferred' | 'partial' | 'confirmed';
  // Cost data only included if real numbers exist
  costData?: {
    plannedLow: number;
    plannedHigh: number;
    emergencyLow: number;
    emergencyHigh: number;
  };
}
```

**Visual Treatment by Confidence:**
| Confidence | Border Style | Opacity | Badge |
|------------|--------------|---------|-------|
| ≥ 0.7      | Solid        | 100%    | None  |
| 0.4-0.7    | Dashed       | 85%     | "Estimated" |
| < 0.4      | Dotted       | 70%     | "Based on regional norms" |

---

## Files to Modify

### 2. `src/types/chatArtifact.ts`

**Add new artifact type (renamed per feedback):**
```typescript
export type ArtifactType = 
  | 'system_timeline'
  | 'system_aging_profile'
  | 'system_validation_evidence'  // NEW: Single-system evidence for "Why?" responses
  | 'comparison_table'
  | 'cost_range'
  | 'confidence_explainer'
  | 'local_context';
```

---

### 3. `src/lib/artifactSummoner.ts`

**Add helper function:**
```typescript
import type { SystemValidationEvidenceData } from '@/components/dashboard-v3/artifacts/SystemValidationEvidenceArtifact';

/**
 * Create a system validation evidence artifact for "Why?" responses
 * This artifact MUST be injected BEFORE the AI call, not after.
 */
export function createSystemValidationEvidenceArtifact(
  anchorMessageId: string,
  data: SystemValidationEvidenceData
): ChatArtifact {
  return createArtifact(
    'system_validation_evidence',
    anchorMessageId,
    data as unknown as Record<string, unknown>,
    data.systemKey
  );
}
```

---

### 4. `src/components/dashboard-v3/artifacts/InlineArtifact.tsx`

**Add rendering case:**
```typescript
import { SystemValidationEvidenceArtifact } from './SystemValidationEvidenceArtifact';

function getArtifactLabel(type: string): string {
  switch (type) {
    case 'system_validation_evidence': return 'System Evidence';
    // ... existing cases
  }
}

function renderArtifactContent(artifact: ChatArtifact) {
  switch (artifact.type) {
    case 'system_validation_evidence':
      return <SystemValidationEvidenceArtifact data={artifact.data as SystemValidationEvidenceData} />;
    // ... existing cases
  }
}
```

---

### 5. `src/components/dashboard-v3/artifacts/index.ts`

**Add export:**
```typescript
export { SystemValidationEvidenceArtifact } from './SystemValidationEvidenceArtifact';
export type { SystemValidationEvidenceData } from './SystemValidationEvidenceArtifact';
```

---

### 6. `src/components/dashboard-v3/ChatConsole.tsx`

**Critical Change: Update `handleWhyClick` to inject evidence BEFORE AI call**

The key architectural change is that evidence injection is **deterministic** (not model-driven). The artifact appears immediately when the user clicks "Why?", then the AI response references it.

```typescript
// Import at top
import { createSystemValidationEvidenceArtifact } from '@/lib/artifactSummoner';
import type { SystemValidationEvidenceData } from './artifacts/SystemValidationEvidenceArtifact';

// In component, update destructuring to include injectMessageWithArtifact
const { messages, loading, sendMessage, injectMessage, injectMessageWithArtifact, isRestoring } = useAIHomeAssistant(...)

// Updated handleWhyClick
const handleWhyClick = useCallback((systemKey: string) => {
  const system = baselineSystems.find(s => s.key === systemKey);
  if (!system) return;
  
  track('baseline_why_clicked', { system_key: systemKey }, { surface: 'dashboard' });
  
  // 1. Build evidence artifact with real system data
  const evidenceData: SystemValidationEvidenceData = {
    systemKey: system.key,
    displayName: system.displayName,
    state: system.state,
    position: calculateTimelinePosition(system), // Helper to derive 0-100 position
    ageYears: system.ageYears,
    expectedLifespan: system.expectedLifespan,
    monthsRemaining: system.monthsRemaining,
    confidence: system.confidence,
    baselineSource: baselineSource,
    // costData: getCostDataForSystem(systemKey), // Only if real data exists
  };
  
  // 2. Create artifact anchored to a placeholder message ID
  const evidenceMessageId = `evidence-${systemKey}-${Date.now()}`;
  const artifact = createSystemValidationEvidenceArtifact(evidenceMessageId, evidenceData);
  
  // 3. Inject evidence artifact FIRST (empty content - artifact speaks for itself)
  //    This creates a message that only contains the artifact
  injectMessageWithArtifact('', artifact);
  
  // 4. Then send the question to AI (which will reference "what you're seeing above")
  const stateLabel = getWhyStateLabel(system.state);
  sendMessage(`Why is my ${system.displayName.toLowerCase()} showing as "${stateLabel}"?`);
}, [baselineSystems, sendMessage, injectMessageWithArtifact, baselineSource]);

// Helper function for timeline position
function calculateTimelinePosition(system: BaselineSystem): number {
  // Derive position from monthsRemaining and expectedLifespan
  if (!system.expectedLifespan || system.expectedLifespan === 0) return 50;
  const lifespanMonths = system.expectedLifespan * 12;
  const remaining = system.monthsRemaining ?? lifespanMonths * 0.5;
  const elapsed = lifespanMonths - remaining;
  return Math.min(100, Math.max(0, (elapsed / lifespanMonths) * 100));
}
```

**Handle empty content messages** (artifact-only messages):

In the message rendering section, add handling for empty-content messages that carry artifacts:

```tsx
{messages.map((message, index) => (
  <div key={message.id}>
    {/* Only render bubble if there's content */}
    {message.content && (
      <div className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}>
        {/* ... existing bubble code */}
      </div>
    )}
    
    {/* Attached artifact (if chat earned it) - renders even without content */}
    {message.attachedArtifact && (
      <InlineArtifact ... />
    )}
  </div>
))}
```

---

### 7. `supabase/functions/ai-home-assistant/index.ts`

**Update prompt for "Why?" responses and fix placeholder cost logic**

Add to `createSystemPrompt` in the `VISIBLE SYSTEMS` section:

```typescript
VALIDATION FIRST RULE (CRITICAL):
When responding to a "Why?" question where a system_validation_evidence artifact has been shown:

1. DO NOT re-explain what the visual already shows (timeline, age, position)
2. Reference it: "Based on what you're seeing above..."
3. Focus on REASONS (why this position) and IMPLICATION (what it means)
4. Structure: Belief → Reasons → Implication → [Optional CTA]

COST IMPACT HONESTY GATE:
- If cost comparison was shown in the artifact, reference it
- If NO cost data exists, do NOT claim you "pulled a cost impact analysis"
- Do NOT use placeholder math (no "approximately 0%")
- Either provide real regional data or say: "Cost comparisons require more system details."
```

**Fix `calculate_cost_impact` function** (lines 668-671):

Replace placeholder logic with honesty gate:

```typescript
case 'calculate_cost_impact':
  // HONESTY GATE: No placeholder cost math
  return `Cost comparisons for ${parsedArgs.repair_type} require specific system and regional data. If you'd like, I can help you research typical costs for your area or connect you with local professionals for estimates.`;
```

---

## New Doctrine Rule

Add to `src/lib/artifactSummoner.ts` docstring:

```typescript
/**
 * VALIDATION FIRST DOCTRINE (IMMUTABLE):
 * Chat may not summarize a system state unless a validating artifact 
 * has been shown in the same interaction.
 * 
 * This prevents:
 * - Future refactors from reintroducing explanation-first behavior
 * - Prompt drift from bypassing evidence requirements
 * - Trust erosion through unsupported claims
 */
```

---

## Intent Detection Foundation

While the PRD mentions full intent detection, for V1 we implement the core pattern tied to:
1. **Explicit "Why?" clicks** - Primary trigger (already exists)
2. **Free-text queries** - Leave for V2 (requires NLU classification)

The `handleWhyClick` function handles the explicit path. Future expansion to free-text requires adding a `ChatIntent` enum and classification logic in the AI response handler.

---

## Summary of Changes

| File | Action | Purpose |
|------|--------|---------|
| `src/types/chatArtifact.ts` | Modify | Add `system_validation_evidence` type |
| `src/components/dashboard-v3/artifacts/SystemValidationEvidenceArtifact.tsx` | Create | Visual evidence component |
| `src/components/dashboard-v3/artifacts/InlineArtifact.tsx` | Modify | Add rendering case |
| `src/components/dashboard-v3/artifacts/index.ts` | Modify | Export new component |
| `src/lib/artifactSummoner.ts` | Modify | Add creation helper + doctrine comment |
| `src/components/dashboard-v3/ChatConsole.tsx` | Modify | Inject artifact BEFORE AI call |
| `supabase/functions/ai-home-assistant/index.ts` | Modify | Add validation-first prompt rules + fix cost placeholder |

---

## Acceptance Criteria

| Criteria | Verification |
|----------|--------------|
| AC-1: Visual First | Click "Why?" → Artifact appears before AI text |
| AC-2: Evidence Accuracy | Artifact shows correct system name, state, position, age |
| AC-3: Cost Integrity | No cost block if no data; no "0%" placeholders |
| AC-4: AI Compliance | AI references "what you're seeing above" |
| AC-5: Uncertainty Handling | Low-confidence systems show muted styling + disclosure |
| AC-6: No Placeholder Leakage | Search codebase for "0%" - none in cost contexts |

---

## Testing Checklist

1. Click "Why?" on WATCH system → evidence artifact renders first
2. Click "Why?" on PLAN system → position near PLAN zone on scale
3. System with `confidence < 0.5` → uncertainty label shown
4. System with no cost data → no cost block, AI doesn't claim analysis
5. AI response references "what you're seeing above"
6. Navigate away and back → conversation preserved with artifacts

