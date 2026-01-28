

# Chat-Summoned Evidence Artifact — Final Specification

**Status: QA-Approved with 3 Enforcement Tightenings**

---

## QA Corrections Incorporated

| # | Gap Identified | Resolution |
|---|----------------|------------|
| 1 | Re-summoning ownership unclear | Added: "Once per system per session unless user explicitly asks again" |
| 2 | "No page load" ambiguous | Clarified: BaselineSurface may appear per chat state; aging profile artifacts never at load |
| 3 | "No Why buttons" needs teeth | Added: "No implicit Why affordances (info icons, question marks, hover hints)" |

---

## Canonical Rules (Code-Comment Worthy)

```typescript
/**
 * ARTIFACT BEHAVIORAL CONTRACT
 * 
 * 1. "This artifact does not explain itself. The chat explains why it exists."
 * 2. "The artifact proves the chat earned the right to speak."
 * 3. "It doesn't live anywhere. It was brought here."
 * 
 * HARD RULES:
 * - Artifacts may only be summoned ONCE per system per session 
 *   unless user explicitly asks again
 * - BaselineSurface may appear per chat state, but aging profile 
 *   artifacts NEVER appear at page load
 * - Artifacts must not visually suggest explanation 
 *   (no info icons, no question marks, no hover hints, no "Why?" buttons)
 * - Confidence belongs to claims, not to the product as a whole
 */
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/types/chatArtifact.ts` | Modify | Add `system_aging_profile` type |
| `src/components/dashboard-v3/artifacts/SystemAgingProfileArtifact.tsx` | **Create** | New multi-system artifact with NO interactive affordances |
| `src/components/dashboard-v3/artifacts/index.ts` | Modify | Export new component |
| `src/components/dashboard-v3/artifacts/InlineArtifact.tsx` | Modify | Render new type, remove any implicit Why hints |
| `src/lib/artifactSummoner.ts` | Modify | Add per-system-per-session guard |
| `src/lib/chatModeCopy.ts` | Modify | Add summoning justification copy |
| `src/hooks/useAIHomeAssistant.ts` | Modify | Support `attachedArtifact` on messages |
| `src/components/dashboard-v3/ChatConsole.tsx` | Modify | Render artifacts in stream, preserve BaselineSurface per chat state |
| `supabase/functions/ai-home-assistant/index.ts` | Modify | Add artifact summoning rules to prompt |

---

## Implementation Details

### 1. New Artifact Type

```typescript
// src/types/chatArtifact.ts
export type ArtifactType = 
  | 'system_timeline'         // Single system deep-dive
  | 'system_aging_profile'    // Multi-system context comparison (NEW)
  | 'comparison_table'
  | 'cost_range'
  | 'confidence_explainer'
  | 'local_context';
```

### 2. SystemAgingProfileArtifact Component

**Visual Spec:**
```
┌────────────────────────────────────────────────────┐
│ ▼ Typical system aging profile — homes ~1995      │
│   Confidence: Moderate · Based on patterns    ✕   │
├────────────────────────────────────────────────────┤
│  HVAC System      ●────────────────○               │
│  Roof             ●────────○                       │
│  Water Heater     ●──────────────────○             │
│                                                    │
│  New                Typical                Aging   │
└────────────────────────────────────────────────────┘
```

**Strict Rules:**
- NO info icons
- NO question marks
- NO hover hints
- NO "Why?" buttons
- NO clickable rows
- NO tooltips
- Only allowed interactions: collapse, dismiss, scroll

**Color Semantics (No Red):**
- Typical/Stable: `muted-foreground`
- Approaching limit: `amber-600`
- Aging/Late: `amber-700`

### 3. Per-System-Per-Session Guard

```typescript
// src/lib/artifactSummoner.ts

const ARTIFACT_SHOWN_PREFIX = 'habitta_artifact_shown_';

/**
 * SESSION GUARD RULE:
 * An artifact may only be summoned once per system per session
 * unless the user explicitly asks again.
 */
export function hasShownArtifactForSystemThisSession(systemKey: string): boolean {
  try {
    return sessionStorage.getItem(`${ARTIFACT_SHOWN_PREFIX}${systemKey}`) === 'true';
  } catch {
    return false;
  }
}

export function markArtifactShownForSystem(systemKey: string): void {
  try {
    sessionStorage.setItem(`${ARTIFACT_SHOWN_PREFIX}${systemKey}`, 'true');
  } catch {}
}

// For aging profile (multi-system)
export function hasShownAgingProfileThisSession(): boolean {
  try {
    return sessionStorage.getItem(`${ARTIFACT_SHOWN_PREFIX}aging_profile`) === 'true';
  } catch {
    return false;
  }
}

export function markAgingProfileShown(): void {
  try {
    sessionStorage.setItem(`${ARTIFACT_SHOWN_PREFIX}aging_profile`, 'true');
  } catch {}
}
```

### 4. ChatConsole Behavior Clarification

```typescript
// src/components/dashboard-v3/ChatConsole.tsx

/**
 * BASELINE VS ARTIFACT DISTINCTION:
 * 
 * BaselineSurface (the summary strip):
 * - MAY appear based on chat state/mode
 * - Is part of the chat context UI
 * - Is NOT an artifact
 * 
 * Aging Profile Artifact:
 * - NEVER appears at page load
 * - ONLY appears after justification message
 * - Is rendered inline with messages
 * - Is dismissible and ephemeral
 */
```

The existing BaselineSurface can remain as a context element (depending on chat mode), but the aging profile artifact is a separate, chat-summoned evidence piece.

### 5. Message-Artifact Coupling

```typescript
// src/hooks/useAIHomeAssistant.ts

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  functionCall?: any;
  suggestions?: string[];
  // NEW: Attached artifact (only if chat earned it)
  attachedArtifact?: ChatArtifact;
}
```

### 6. AI Prompt Enforcement

```typescript
// supabase/functions/ai-home-assistant/index.ts

prompt += `
ARTIFACT SUMMONING CONTRACT (HARD RULES):

1. CAUSALITY: Nothing visual appears unless the chat earns it first
   - Justify THEN show, never the reverse
   - Use past tense: "I pulled" not "I'm showing"

2. SESSION GUARD: Artifacts appear once per system per session
   - Unless user explicitly asks again
   - No re-triggering on mode change or rerender

3. NO IMPLICIT AFFORDANCES: Artifacts do not invite exploration
   - No info icons, question marks, hover hints
   - The artifact proves work happened
   - The chat explains what it means

4. SUMMONING PATTERN (exact):
   a) JUSTIFY: "Given the age of your home..."
   b) ANNOUNCE: "I pulled a typical system aging profile..."
   c) [ARTIFACT RENDERS - system handles this]
   d) REFERENCE: "Based on what you're seeing above..."

5. FORBIDDEN:
   - "Here is a chart"
   - "See below"
   - "I'm showing you"
   - Any present-tense announcement of visual evidence
`;
```

### 7. Summoning Justification Copy

```typescript
// src/lib/chatModeCopy.ts

export function getSummoningJustification(
  yearBuilt?: number,
  source: BaselineSource = 'inferred'
): string {
  const yearRef = yearBuilt ? `around ${yearBuilt}` : 'in this region';
  
  if (source === 'inferred') {
    return `Given the age of your home and what we typically see in this area, I pulled a typical system aging profile for homes built ${yearRef} to compare against what we know so far.`;
  }
  
  if (source === 'partial') {
    return `I have some confirmed details about your systems. Here's how they compare to typical aging patterns for homes built ${yearRef}.`;
  }
  
  return `Your systems are well-documented. Here's how they're positioned relative to typical aging patterns for homes built ${yearRef}.`;
}
```

---

## Verification Checklist (Binary, Observable, Automatable)

### Page Load Behavior
- [ ] Aging profile artifact does NOT appear at page load
- [ ] BaselineSurface MAY appear based on chat state (this is allowed)

### Summoning Causality
- [ ] Artifact only appears after justification message
- [ ] Justification uses past tense ("I pulled")
- [ ] Follow-up references "what you're seeing above"

### Session Guards
- [ ] Aging profile shows max once per session (unless re-requested)
- [ ] Per-system artifacts show max once per system per session

### No Implicit Affordances
- [ ] No info icons in artifact
- [ ] No question marks in artifact
- [ ] No hover hints in artifact
- [ ] No "Why?" buttons inside artifact
- [ ] No clickable rows
- [ ] Only collapse and dismiss are interactive

### Artifact Semantics
- [ ] Header: "Typical system aging profile — homes ~{year}"
- [ ] Confidence is INSIDE artifact, not global UI
- [ ] Axis labels: "New | Typical | Aging"
- [ ] No section titles like "SYSTEM CONDITION OUTLOOK"
- [ ] Collapsible and dismissible

### Silent Steward
- [ ] No artifacts appear in Silent Steward mode

---

## Semantic Lock Statement (For Code Comments)

```typescript
/**
 * ARTIFACT BEHAVIORAL CONTRACT
 * 
 * "This artifact does not explain itself. The chat explains why it exists."
 * "The artifact proves the chat earned the right to speak."
 * "It doesn't live anywhere. It was brought here."
 * 
 * Confidence belongs to claims, not to the product.
 * Silence is intentional. Evidence is contextual. Authority is earned.
 */
```

