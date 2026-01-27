
# Canonical Architecture Gaps — Implementation with Edge Case Fixes

**Habitta does not fill silence.
It does not show evidence without reason.
It does not offer help without understanding.
Every word, chart, and option must earn its place.**

---

## Overview

This implementation addresses three architectural gaps plus two edge case fixes identified in review:

| Item | Priority | Action |
|------|----------|--------|
| **Gap 1**: Silent Steward shows text | Critical | Remove text block entirely; add protective comment |
| **Gap 2**: InlineArtifacts missing | Core | Create constrained artifact system with anchoring |
| **Gap 3**: Service Options not stubbed | Future-proof | Create user-request-gated stubs |
| **Risk 1**: Artifact re-summoning spam | Edge case | Add `hasShownArtifactForSystem` one-time guard |
| **Risk 2**: ServiceOptionsPanel visual weight | Edge case | Change `bg-background` to `bg-muted/10` |

---

## Implementation Details

### Gap 1: True Silence in Silent Steward Mode

**File:** `src/components/dashboard-v3/ChatConsole.tsx`

**Action:** Remove lines 262-269 (the conditional render block) and replace with protective comment.

```text
Before:
  {isSilentSteward && (
    <div className="text-center py-4 text-muted-foreground/60">
      <p className="text-xs">
        Your home is being watched. Nothing requires attention.
      </p>
    </div>
  )}

After:
  {/* 
    * CANONICAL ARCHITECTURE LOCK:
    * Silent Steward intentionally renders no messages.
    * Silence is a product feature, not an empty state.
    * Do not add fallback copy here.
    */}
```

**Doctrine preserved:** True silence = confidence. No narration of presence.

---

### Gap 2: InlineArtifacts Infrastructure (With Risk 1 Fix)

#### File 1: `src/types/chatArtifact.ts` (NEW)

Artifact type system with:
- `anchorMessageId` required (artifacts subordinate to language)
- No generic "chart" types
- `isArtifactAllowedInMode()` check for cost_range in planning only

#### File 2: `src/lib/artifactSummoner.ts` (NEW)

Summoning rules with **Risk 1 fix integrated**:

```typescript
interface ArtifactContext {
  chatMode: ChatMode;
  confidenceLevel: 'Unknown' | 'Early' | 'Moderate' | 'High';
  messageId: string;
  systemKey?: string;
  userAskedForVisualization: boolean;
  /** Risk 1 fix: Prevent re-summoning spam */
  hasShownArtifactForSystem?: boolean;
}
```

And the guarded check:

```typescript
// Planning window: show timeline ONCE per system entry
if (
  context.chatMode === 'planning_window_advisory' &&
  context.systemKey &&
  !context.hasShownArtifactForSystem  // Risk 1: one-time guard
) {
  return { type: 'system_timeline', systemKey: context.systemKey };
}
```

**Additional constraints:**
- No artifacts on page load
- No artifacts in Silent Steward mode
- No artifacts below Moderate confidence (Authority Fallback Rule)
- Auto-collapse when context changes (Artifact Lifetime Rule)

#### File 3: `src/components/dashboard-v3/artifacts/InlineArtifact.tsx` (NEW)

Collapsible/dismissible artifact container with:
- `anchorMessageId` prop required
- Validation of anchor relationship
- Calm styling: `bg-muted/10`, no shadows

#### File 4: `src/components/dashboard-v3/artifacts/SystemTimelineArtifact.tsx` (NEW)

Mini timeline for a single system showing position and projection.

#### File 5: `src/components/dashboard-v3/artifacts/index.ts` (NEW)

Barrel export for artifact components.

---

### Gap 3: Service Options Stub (With Risk 2 Fix + No Cross-System Rule)

#### File 6: `src/types/prosAndLogistics.ts` (NEW)

Service options types with:
- `userRequested: boolean` required (no auto-surfacing)
- `isBaselineComplete` required
- Mode restriction to `planning_window_advisory` or `elevated_attention`
- **No Cross-System Offers Rule** (comment):

```typescript
// CANONICAL RULE:
// Service options may only be offered for the currently discussed system.
// No cross-system bundling or upsell.
systemKey: string;
```

#### File 7: `src/components/dashboard-v3/ServiceOptionsPanel.tsx` (NEW)

Service options UI with **Risk 2 fix**:

```typescript
// Risk 2 fix: Subordinate visual weight
<div className="my-3 p-3 rounded-lg border border-border/30 bg-muted/10">
```

Not `bg-background` — ensures offers feel optional, not primary.

Additional constraints:
- Max 3 options (`MAX_SERVICE_OPTIONS = 3`)
- "Not now" always available
- No logos, no marketing language
- Not styled as artifacts (offers, not evidence)

#### File 8: `src/hooks/useServiceOptions.ts` (NEW)

Stub hook returning empty array. Future: integrates with partner API.

---

### Governance Update

**File:** `src/lib/chatGovernance.ts`

Add Authority Fallback Rule:

```typescript
/**
 * Authority Fallback Rule
 * 
 * If confidence drops below Moderate, no new artifacts 
 * or service options may be summoned.
 * 
 * This ensures:
 * - Weak baselines do not get over-explained
 * - Trust is rebuilt before advice expands
 */
export function canExpandAdvice(
  confidenceLevel: 'Unknown' | 'Early' | 'Moderate' | 'High'
): boolean {
  return confidenceLevel === 'Moderate' || confidenceLevel === 'High';
}
```

---

## File Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/components/dashboard-v3/ChatConsole.tsx` | Modify | Remove Silent Steward text, add protective comment |
| `src/types/chatArtifact.ts` | Create | Artifact types with anchorMessageId requirement |
| `src/lib/artifactSummoner.ts` | Create | Summoning rules with one-time guard (Risk 1 fix) |
| `src/components/dashboard-v3/artifacts/InlineArtifact.tsx` | Create | Artifact container with collapse/dismiss |
| `src/components/dashboard-v3/artifacts/SystemTimelineArtifact.tsx` | Create | System timeline visualization |
| `src/components/dashboard-v3/artifacts/index.ts` | Create | Barrel export |
| `src/types/prosAndLogistics.ts` | Create | Service options types with userRequested gate |
| `src/components/dashboard-v3/ServiceOptionsPanel.tsx` | Create | Service options UI with subordinate styling (Risk 2 fix) |
| `src/hooks/useServiceOptions.ts` | Create | Service options hook (stub) |
| `src/lib/chatGovernance.ts` | Modify | Add canExpandAdvice authority fallback |

---

## Verification Checklist

### Gap 1 - True Silence
- [ ] No text message appears in silent_steward mode
- [ ] Protective comment prevents future "fixes"
- [ ] Baseline visible, input available

### Gap 2 - InlineArtifacts
- [ ] All artifacts have anchorMessageId (enforced)
- [ ] Artifacts never appear on page load
- [ ] Artifacts never appear in Silent Steward mode
- [ ] **Risk 1**: Artifacts only summon once per system entry
- [ ] No artifacts below Moderate confidence
- [ ] Artifacts collapse when context changes

### Gap 3 - Service Options
- [ ] userRequested is mandatory gate
- [ ] Options never auto-surface
- [ ] Max 3 options enforced
- [ ] "Not now" always available
- [ ] **Risk 2**: Uses bg-muted/10, not bg-background
- [ ] No cross-system offers (comment added)

### Governance
- [ ] canExpandAdvice blocks expansion below Moderate confidence
