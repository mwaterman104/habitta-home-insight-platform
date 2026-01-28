
# Epistemic Coherence — Inferred vs Confirmed Baseline Fix

## The Problem

The screenshot shows a critical architectural violation:

**Baseline Surface shows:**
- Lifecycle: Mid-Life
- Confidence: Moderate  
- HVAC: Stable
- Roof: Stable
- Water Heater: Planning Window

**Chat says:**
> "Right now, my view of your home is a blank slate. I don't have any systems, appliances, or maintenance history registered in your profile yet."

These statements cannot coexist. The chat is denying evidence that is visibly rendered above it.

---

## Root Cause

The architecture has **two parallel epistemic layers** that are not aligned:

| Layer | Source | What It Shows | Used By |
|-------|--------|---------------|---------|
| **Inferred Baseline** | `capital-timeline` edge function | Systems derived from property age, region, typical lifespans | `MiddleColumn` → `BaselineSurface` |
| **Confirmed Baseline** | `homeSystems` hook (DB query) | Only user-confirmed or permit-verified systems | `useChatMode` → Chat Mode → AI Prompt |

The AI assistant is told "No systems registered" because `system_lifecycles` table is empty — but the visual baseline is populated from heuristic inference.

---

## Canonical Rule Being Violated

> "Habitta may infer, but it must label inference as inference.
> It may not deny its own visible evidence."

The chat must acknowledge the inferred baseline, not deny it.

---

## Solution Architecture

### 1. Add Baseline Provenance State

Create a new concept: **Baseline Source**

```typescript
// src/types/chatMode.ts (addition)
export type BaselineSource = 'inferred' | 'partial' | 'confirmed';

export interface ChatModeContext {
  // ... existing fields
  
  /** Source of the baseline data */
  baselineSource: BaselineSource;
  
  /** Systems visible in the baseline (for chat reference) */
  visibleBaselineSystems: Array<{
    key: string;
    displayName: string;
    state: SystemState;
  }>;
}
```

**Rules:**
- `'inferred'` → Confidence max = Moderate, chat must acknowledge inference
- `'partial'` → Some confirmed, some inferred
- `'confirmed'` → User-verified, confidence can reach High

### 2. Pass Inferred Baseline to Chat Mode

Update `useChatMode` to accept the visual baseline as context:

```typescript
// src/hooks/useChatMode.ts
interface UseChatModeOptions {
  homeId?: string;
  systems: HomeSystem[];           // Confirmed systems
  permitsFound: boolean;
  inferredSystems?: BaselineSystem[];  // NEW: From capital timeline
}
```

This allows the chat mode selector to know what's visible.

### 3. Compute Baseline Source

Add logic to determine baseline source:

```typescript
// src/lib/baselineProvenance.ts (NEW)

export function computeBaselineSource(
  confirmedSystems: HomeSystem[],
  inferredSystems: BaselineSystem[]
): BaselineSource {
  const confirmedCount = confirmedSystems.filter(s => 
    s.data_sources?.some(d => 
      d.includes('permit') || d.includes('owner') || d.includes('user')
    )
  ).length;
  
  if (confirmedCount === 0 && inferredSystems.length > 0) {
    return 'inferred';
  }
  if (confirmedCount > 0 && confirmedCount < inferredSystems.length) {
    return 'partial';
  }
  if (confirmedCount >= inferredSystems.length) {
    return 'confirmed';
  }
  return 'inferred';
}
```

### 4. Update Opening Message Copy

Add provenance-aware copy to `chatModeCopy.ts`:

```typescript
// src/lib/chatModeCopy.ts

const BASELINE_OPENING_MESSAGES: Record<BaselineSource, OpeningMessageConfig> = {
  inferred: {
    primary: "What you're seeing above is an inferred baseline.",
    secondary: "It's based on the age of the home, location, and typical system lifespans in this region.",
    clarifier: "I haven't yet confirmed the specific details of your systems — but it's enough to begin monitoring and identify planning windows.",
  },
  partial: {
    primary: "I have confirmed details for some of your systems.",
    secondary: "The remaining systems are estimated based on typical patterns.",
    clarifier: "We can improve accuracy for any system with a photo or quick confirmation.",
  },
  confirmed: {
    primary: "Your baseline is well-established.",
    secondary: "I can provide specific guidance based on confirmed system data.",
  },
};
```

### 5. Add Governance Guardrail

Add hard rule to `chatGovernance.ts`:

```typescript
// src/lib/chatGovernance.ts

/**
 * Chat responses may not contradict visible baseline artifacts.
 * If baseline exists, chat must reference it — even if only to qualify it.
 */
export const BASELINE_COHERENCE_RULES = {
  /** Never say these phrases when baseline is visible */
  bannedWhenBaselineVisible: [
    'blank slate',
    'no systems',
    'no information',
    "don't have any",
    "can't tell anything",
  ],
  
  /** Required references when inferred baseline is visible */
  requiredReferencesForInferred: [
    'inferred',
    'estimated',
    'based on what I can observe',
    'typical for this region',
  ],
};
```

### 6. Pass Baseline Context to AI Prompt

Update the edge function to receive baseline provenance:

```typescript
// supabase/functions/ai-home-assistant/index.ts

// In the request body, add:
const {
  // ... existing fields
  baselineSource,          // 'inferred' | 'partial' | 'confirmed'
  visibleBaseline,         // Array of systems shown in UI
  chatMode,               // Already exists
} = await req.json();

// In createSystemPrompt(), add baseline context:
let prompt = `...

BASELINE CONTEXT:
${baselineSource === 'inferred' 
  ? 'The user sees an INFERRED baseline above. Do NOT say you have no information. Acknowledge what is visible.' 
  : baselineSource === 'partial'
  ? 'The user sees a PARTIALLY confirmed baseline. Some systems are inferred, some confirmed.'
  : 'The baseline is CONFIRMED. You can be specific about timelines and recommendations.'}

VISIBLE SYSTEMS (user can see these):
${visibleBaseline?.map(s => `- ${s.displayName}: ${s.state}`).join('\n') || 'None'}

HARD RULE: Never contradict what is visible. If systems appear above, acknowledge them.
`;
```

---

## Files to Change

| File | Action | Purpose |
|------|--------|---------|
| `src/types/chatMode.ts` | **Modify** | Add `BaselineSource` type and context fields |
| `src/lib/baselineProvenance.ts` | **Create** | Baseline source computation logic |
| `src/hooks/useChatMode.ts` | **Modify** | Accept inferred baseline, compute source |
| `src/lib/chatModeCopy.ts` | **Modify** | Add provenance-aware opening messages |
| `src/lib/chatGovernance.ts` | **Modify** | Add coherence guardrails |
| `src/components/dashboard-v3/MiddleColumn.tsx` | **Modify** | Pass inferred baseline to chat mode |
| `src/components/dashboard-v3/ChatConsole.tsx` | **Modify** | Use provenance-aware opening |
| `supabase/functions/ai-home-assistant/index.ts` | **Modify** | Accept and use baseline context in prompt |

---

## Implementation Order

1. **Add types** — `BaselineSource` to `chatMode.ts`
2. **Create provenance logic** — `baselineProvenance.ts`
3. **Update useChatMode** — Accept inferred systems, compute source
4. **Update MiddleColumn** — Pass inferred baseline to chat mode hook
5. **Update chatModeCopy** — Add provenance-aware messages
6. **Update ChatConsole** — Use correct opening based on source
7. **Update edge function** — Add baseline context to AI prompt
8. **Add governance guardrails** — Prevent future contradictions

---

## Correct Chat Behavior After Fix

**When baselineSource = 'inferred':**
> "What you're seeing above is an inferred baseline based on the age of the home, its location, and typical system lifespans in this region.
> 
> I haven't yet confirmed the specific details of your systems, which limits how precise I can be — but it's enough to begin monitoring and identifying planning windows."

**When user asks "What can you tell from what you see now?":**
> "Based on what's visible above, your water heater is entering a planning window. This is an estimate based on typical lifespans — if you'd like, we can confirm the details to improve accuracy."

---

## Verification Checklist

- [ ] Chat never says "blank slate" when baseline is visible
- [ ] Chat acknowledges "inferred" when baseline source is inferred
- [ ] Opening message references "what you're seeing above"
- [ ] AI prompt includes visible baseline context
- [ ] Chat mode selector knows about inferred systems
- [ ] Baseline source is computed correctly (inferred/partial/confirmed)

---

## Canonical Lock Statement

> "Habitta never denies its own evidence.
> When knowledge is inferred, it is labeled — not dismissed."
