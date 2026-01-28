

# House Context vs System State — Semantic Separation Fix

## The Core Problem

The current dashboard conflates two distinct concepts:

| Concept | What It Describes | How Users Think About It |
|---------|-------------------|--------------------------|
| **House Context** | Static property facts (year built, location, climate) | "What kind of home do I have?" |
| **System State** | Where each system sits on its lifespan curve | "What condition are my systems in?" |

Currently, both are expressed through a single ambiguous label: `"Lifecycle: Mid-Life"`

This creates semantic confusion:
- Is the *house* "mid-life"?
- Is the *HVAC* "mid-life"?
- What does "mid-life" even mean?

---

## Canonical Rule (Lock In)

> **Houses do not have lifecycles. Systems do.**
> **The house provides context; systems carry risk.**

---

## Fix 1: Separate House Context from System Timeline

### Current Structure in BaselineSurface
```
┌─────────────────────────────────────────┐
│ Lifecycle: Mid-Life    Confidence: Mod  │  ← Ambiguous "lifecycle"
├─────────────────────────────────────────┤
│ HVAC    [────●────]    Stable           │
│ Roof    [─●───────]    Stable           │
│ Water   [────────●]    Planning Window  │
├─────────────────────────────────────────┤
│ Within range | Approaching | Beyond     │
└─────────────────────────────────────────┘
```

### New Structure (Semantic Separation)
```
┌─────────────────────────────────────────┐
│ Home context                            │
│ Typical age profile for homes           │
│ built around 1995                       │  ← Static, descriptive
│                   Confidence: Moderate  │
│                   Based on home age     │
│                   and regional patterns │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ SYSTEM CONDITION OUTLOOK                │  ← NEW header
├─────────────────────────────────────────┤
│ HVAC    [────●────]    Within range     │
│ Roof    [─●───────]    Within range     │
│ Water   [────────●]    Planning window  │
├─────────────────────────────────────────┤
│ New      |    Typical    |    Aging     │  ← NEW axis labels
└─────────────────────────────────────────┘
```

### Changes to BaselineSurface.tsx

**A. Replace "Lifecycle" header with "Home context"**

Current (line 52-53):
```tsx
<span>Lifecycle: <span className="text-foreground font-medium">{lifecyclePosition}</span></span>
```

New:
```tsx
<div className="flex flex-col gap-0.5">
  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Home context</span>
  <span className="text-sm text-foreground">
    Typical age profile for homes built around {getHomeYearContext(yearBuilt)}
  </span>
</div>
```

This makes it clear we're describing the *house context*, not a "lifecycle stage."

**B. Add "System condition outlook" section header**

Before the system rows, add:
```tsx
<div className="pt-2 pb-1">
  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
    System condition outlook
  </span>
</div>
```

**C. Update axis labels from condition-based to age-based**

Current (lines 76-80):
```tsx
<span>Within range</span>
<span>Approaching limit</span>
<span>Beyond range</span>
```

New:
```tsx
<span className="text-[10px] text-muted-foreground/60">New</span>
<span className="text-[10px] text-muted-foreground/60">Typical</span>
<span className="text-[10px] text-muted-foreground/60">Aging</span>
```

This aligns with how homeowners actually think: "Is this system new, typical, or aging?"

**D. Remove lifecyclePosition prop**

Since we're no longer showing "Mid-Life" as a global label, remove:
- `lifecyclePosition` prop from `BaselineSurface`
- Add `yearBuilt?: number` prop instead (for home context)

**E. Update MiddleColumn to pass yearBuilt**

In `MiddleColumn.tsx`, pass the year built from property data:
```tsx
<BaselineSurface
  yearBuilt={homeForecast?.yearBuilt}
  confidenceLevel={confidenceLevel}
  systems={baselineSystems}
  onWhyClick={handleWhyClick}
/>
```

---

## Fix 2: Complete "Why?" Response Pattern

### Current Problem

When user clicks "Why?", the current flow:
1. Fires `track()` event
2. Calls `onSystemClick(systemKey)` — which navigates away
3. AI has `"WHY?" RESPONSE CONSTRAINT` but it only explains, doesn't close the loop

This violates the principle: **"Why?" should deliver full understanding in one response.**

### New Pattern: "Why?" Generates Complete Understanding

**A. Change onWhyClick behavior**

Instead of navigating, inject a contextual message into the chat that asks "Why is [System] [State]?"

```tsx
// In ChatConsole.tsx or MiddleColumn.tsx
const handleWhyClick = useCallback((systemKey: string) => {
  const system = baselineSystems.find(s => s.key === systemKey);
  if (!system) return;
  
  track('baseline_why_clicked', { system_key: systemKey }, { surface: 'dashboard' });
  
  // Inject "Why?" question on user's behalf
  sendMessage(`Why is my ${system.displayName.toLowerCase()} considered "${getStateLabel(system.state)}"?`);
}, [baselineSystems, sendMessage]);
```

**B. Update AI prompt for complete "Why?" responses**

Current in edge function:
```
"WHY?" RESPONSE CONSTRAINT:
If the user asks "Why?" about a system state:
1. EXPLAIN the observation
2. LIST factors
3. CLARIFY confidence level
```

New (complete understanding pattern):
```
"WHY?" RESPONSE PATTERN (COMPLETE UNDERSTANDING):
When the user asks "Why?" about a system state, deliver a complete unit of understanding:

1. BELIEF: What Habitta believes about this system
   "Based on what you're seeing above, your [system] is [state]."

2. REASONS: Why it believes this (bullet list)
   • Its estimated age falls within the typical operating range for systems in this region
   • No unusual environmental stress patterns are present
   • [Additional factor based on data]

3. IMPLICATION: What this means for the homeowner
   "This means you don't need to take action right now. Routine monitoring is sufficient."

4. OPTIONAL CTA (one max, invitational):
   "If you'd like to improve accuracy, you can confirm the installation year or upload a photo of the unit label."

CRITICAL RULES:
- "Why?" should NEVER generate a question back to the user
- "Why?" delivers closure, not opens a thread
- Maximum one optional CTA, always invitational
- The structure is: Belief → Reasons → Implication → [Optional CTA]
```

**C. Add state-specific implication copy**

Create helper in `chatModeCopy.ts`:

```typescript
export function getStateImplication(state: SystemState): string {
  switch (state) {
    case 'stable':
      return "This means you don't need to take action right now. Routine monitoring is sufficient.";
    case 'planning_window':
      return "This is a good time to begin researching options. No immediate action is required.";
    case 'elevated':
      return "This warrants attention. Consider having it inspected before making decisions.";
    case 'data_gap':
      return "I don't have enough information to assess this system accurately.";
  }
}
```

---

## Files to Modify

| File | Change | Purpose |
|------|--------|---------|
| `src/components/dashboard-v3/BaselineSurface.tsx` | Major refactor | Separate house context from system timeline |
| `src/components/dashboard-v3/MiddleColumn.tsx` | Update props | Pass yearBuilt instead of lifecyclePosition |
| `src/components/dashboard-v3/ChatConsole.tsx` | Update handleWhyClick | Inject "Why?" message instead of navigation |
| `src/lib/chatModeCopy.ts` | Add getStateImplication() | State-specific implications for "Why?" responses |
| `supabase/functions/ai-home-assistant/index.ts` | Update "Why?" prompt | Complete understanding pattern |

---

## Detailed Implementation

### BaselineSurface.tsx (Major Refactor)

1. **Update props interface**:
```typescript
interface BaselineSurfaceProps {
  yearBuilt?: number;  // NEW: For home context
  // REMOVED: lifecyclePosition
  confidenceLevel: 'Unknown' | 'Early' | 'Moderate' | 'High';
  systems: BaselineSystem[];
  onWhyClick: (systemKey: string) => void;
}
```

2. **Add home context section** (replaces lifecycle label):
```tsx
<div className="flex justify-between text-sm text-muted-foreground mb-3">
  <div className="flex flex-col gap-0.5">
    <span className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
      Home context
    </span>
    <span className="text-sm text-foreground">
      {yearBuilt 
        ? `Typical age profile for homes built around ${yearBuilt}`
        : 'Home age profile based on regional patterns'}
    </span>
  </div>
  <div className="flex flex-col items-end">
    <span className="text-sm">
      Confidence: <span className="text-foreground font-medium">{confidenceLevel}</span>
    </span>
    <span className="text-[10px] text-muted-foreground/70">
      {getConfidenceExplainer(confidenceLevel)}
    </span>
  </div>
</div>
```

3. **Add system condition header**:
```tsx
<div className="pt-2 pb-1">
  <span className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
    System condition outlook
  </span>
</div>
```

4. **Update axis labels**:
```tsx
<div className="flex justify-between text-[10px] text-muted-foreground/60 pt-2">
  <span>New</span>
  <span>Typical</span>
  <span>Aging</span>
</div>
```

### MiddleColumn.tsx

1. Remove `lifecyclePosition` computation
2. Add `yearBuilt` extraction from homeForecast or capitalTimeline
3. Pass `yearBuilt` to BaselineSurface

### ChatConsole.tsx

1. Receive `sendMessage` in `handleWhyClick` context
2. Change behavior from navigation to message injection:
```typescript
const handleWhyClick = (systemKey: string) => {
  const system = baselineSystems.find(s => s.key === systemKey);
  if (!system) return;
  
  track('baseline_why_clicked', { system_key: systemKey }, { surface: 'dashboard' });
  
  // Generate a "Why?" question on user's behalf
  const stateLabel = getStateLabel(system.state);
  sendMessage(`Why is my ${system.displayName.toLowerCase()} showing as "${stateLabel}"?`);
};
```

### AI Edge Function

Update the `"WHY?" RESPONSE CONSTRAINT` section with the complete understanding pattern.

---

## Verification Checklist

### House Context Separation
- [ ] No "Lifecycle: Mid-Life" label anywhere
- [ ] "Home context" section shows year-based description
- [ ] System timeline has its own "System condition outlook" header
- [ ] Axis labels are "New / Typical / Aging"

### "Why?" Complete Understanding
- [ ] Clicking "Why?" injects a message (doesn't navigate)
- [ ] AI response follows Belief → Reasons → Implication → [CTA] pattern
- [ ] Response gives closure (no questions back to user)
- [ ] Maximum one optional CTA, invitational tone

---

## Semantic Lock Statement

> **Houses provide context. Systems carry risk.**
> **"Why?" delivers understanding, not opens a thread.**
> **Every response gives closure. The user never interprets.**

