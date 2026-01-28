# Chat-Summoned Evidence Artifact — Implementation Complete

**Status: ✅ IMPLEMENTED**

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

## Files Modified

| File | Action | Purpose |
|------|--------|---------|
| `src/types/chatArtifact.ts` | ✅ Modified | Added `system_aging_profile` type |
| `src/components/dashboard-v3/artifacts/SystemAgingProfileArtifact.tsx` | ✅ Created | New multi-system artifact with NO interactive affordances |
| `src/components/dashboard-v3/artifacts/index.ts` | ✅ Modified | Export new component |
| `src/components/dashboard-v3/artifacts/InlineArtifact.tsx` | ✅ Modified | Render new type, supports "inserted document" styling |
| `src/lib/artifactSummoner.ts` | ✅ Modified | Added per-system-per-session guards |
| `src/lib/chatModeCopy.ts` | ✅ Modified | Added summoning justification copy |
| `src/hooks/useAIHomeAssistant.ts` | ✅ Modified | Support `attachedArtifact` on messages |
| `src/components/dashboard-v3/ChatConsole.tsx` | ✅ Modified | Render artifacts in message stream |
| `supabase/functions/ai-home-assistant/index.ts` | ✅ Modified | Added artifact summoning rules to prompt |

---

## Key Implementations

### 1. Session Guards (artifactSummoner.ts)

```typescript
const ARTIFACT_SHOWN_PREFIX = 'habitta_artifact_shown_';
const AGING_PROFILE_KEY = 'habitta_artifact_shown_aging_profile';

export function hasShownAgingProfileThisSession(): boolean
export function markAgingProfileShown(): void
export function hasShownArtifactForSystemThisSession(systemKey: string): boolean
export function markArtifactShownForSystem(systemKey: string): void
```

### 2. Message-Artifact Coupling (useAIHomeAssistant.ts)

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  attachedArtifact?: ChatArtifact;  // NEW
}
```

### 3. Summoning Justification (chatModeCopy.ts)

```typescript
export function getSummoningJustification(yearBuilt?: number, source: BaselineSource): string
export function getArtifactReferenceMessage(systemsContext: Array<{...}>): string
```

### 4. AI Prompt Enforcement

```
ARTIFACT SUMMONING CONTRACT (HARD RULES):

1. CAUSALITY: Nothing visual appears unless the chat earns it first
   - Use past tense: "I pulled" not "I'm showing"

2. SUMMONING PATTERN (exact):
   a) JUSTIFY: "Given the age of your home..."
   b) ANNOUNCE: "I pulled a typical system aging profile..."
   c) [ARTIFACT RENDERS]
   d) REFERENCE: "Based on what you're seeing above..."

5. FORBIDDEN PHRASES:
   - "Here is a chart"
   - "See below"
   - "I'm showing you"
```

---

## Semantic Lock Statement

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
