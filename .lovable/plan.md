
# Dashboard V3 Structural Transformation: From Report to Operating System

## Overview

This plan transforms Dashboard V3 from a passive report into an operating system following this flow:
**Habitta notices → Habitta flags → Habitta explains → Habitta offers to talk → User responds when ready**

---

## Gap 1: MaintenanceRoadmap - Visual Time Model

### Current State
- `MaintenanceTimeline.tsx` renders vertical task buckets ("Now - 3 Months", "This Year", "Next 2-3 Years")
- Time is implied through section labels, not visualized
- No horizontal month axis, no "NOW" anchor
- Feels like a to-do list, not stewardship

### Implementation

**Create**: `src/components/dashboard-v3/MaintenanceRoadmap.tsx`

```text
MAINTENANCE ROADMAP                                     2026
Jan  Feb  MAR  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec
          ▲
          NOW
     ●           ●              ●               ●
     HVAC       Safety        Exterior        Gutters

MARCH 2026
• HVAC cooling tune-up        Due Mar 14   ☐
• Test smoke / CO detectors   Due Mar 14   ☐

▸ 3 tasks this quarter                [Switch to list view]
```

**A. Month Rail Component**
- 12 months visible horizontally starting from current month
- Current month highlighted with pill styling + subtle glow
- Vertical "NOW" marker on current month
- Dots below months with tasks
- Clicking a month selects it and shows task detail panel

**B. Task Placement Logic (Critical)**
Tasks appear even without explicit due dates:
1. `dueDate` → exact month placement
2. `dueMonth` → mapped month
3. `season` → mapped to representative month:
   - Spring → March
   - Summer → June
   - Fall → September
   - Winter → December
4. No timing → "Unscheduled" group below the rail

**C. Task Detail Panel**
- Shows tasks for selected month grouped by system
- Each task: system icon, title, due date (if known), completion checkbox
- Completed tasks: muted text, checkmark icon, hollow dot on rail

**D. Completion Behavior**
- Optimistic UI update on checkbox
- Recurring tasks: completion applies only to current instance
- Month-rail dot becomes hollow/checked for completed tasks

**E. View Toggle**
- Default: Roadmap view
- Fallback: "Switch to list view" reveals legacy bucket view
- State stored in component (not persisted)

**Data Model Extension**
```typescript
interface RoadmapTask extends TimelineTask {
  dueDate?: string;      // ISO date
  dueMonth?: string;     // "2026-03" format
  season?: 'spring' | 'summer' | 'fall' | 'winter';
}
```

---

## Gap 2: HabittaThinking - Chat Presence Above the Fold

### Current State
- `MonthlyPriorityCTA.tsx` exists but feels like a button/CTA, not presence
- Chat is at the bottom, feels like support not guidance
- No indication Habitta is actively reasoning

### Implementation

**Create**: `src/components/dashboard-v3/HabittaThinking.tsx`

```text
┌──────────────────────────────────────────────────────────────────┐
│  💬 Habitta's thinking                                           │
│                                                                  │
│  Your water heater is entering a planning window.                │
│  Want to talk through options now, or keep an eye on it?         │
│                                                                  │
│  [ Talk about Water Heater ]      [ Not right now ]              │
└──────────────────────────────────────────────────────────────────┘
```

**Placement**: Between `HomeHealthCard` and `CapitalTimeline`

**Display Rules (Strict)**
```typescript
if (chatEngagedThisSession) return null;
if (dismissedThisSession) return null;
if (!primarySystemInPlanningWindow) return null;
```

**Primary System Selection**
1. Lowest `remainingYears`
2. Tie-breaker: higher replacement cost (if available)
3. Tie-breaker: lowest confidence

**Behavior**
- "Talk about {System}" → expands ChatDock with system-scoped context
- "Not right now" → sets `dismissedThisSession = true` (session-only)
- Uses `sessionStorage` for session-level state

**Deprecation**: `MonthlyPriorityCTA.tsx` is no longer rendered. `HabittaThinking` replaces it entirely.

---

## Gap 3: ChatDock - Connected, Contextual, Intentional

### Current State
- Flat bottom edge, feels like a footer
- Generic placeholder: "Ask about your home..."
- No context header when opened with system focus

### Implementation

**Modify**: `src/components/dashboard-v3/ChatDock.tsx`

**A. Visual Connection**
```tsx
className="rounded-t-xl border-t shadow-[0_-8px_24px_-4px_rgba(0,0,0,0.08)]"
```
- Rounded top corners
- Upward gradient shadow (feels like a drawer)
- Subtle visual distinction from content area

**B. Context-Aware Placeholder**
```typescript
const SYSTEM_NAMES: Record<string, string> = {
  hvac: 'HVAC',
  roof: 'roof',
  water_heater: 'water heater',
  // ...
};

const placeholder = focusContext?.systemKey
  ? `Ask about your ${SYSTEM_NAMES[focusContext.systemKey] || focusContext.systemKey}...`
  : "Ask about your home...";
```

**C. Context Header (Not Message)**
When chat opens with system context, show a header chip:
```tsx
{focusContext?.systemKey && (
  <div className="flex items-center gap-2 px-3 pt-2">
    <Badge variant="secondary" className="text-xs">
      Focus: {SYSTEM_NAMES[focusContext.systemKey]}
    </Badge>
  </div>
)}
```
- Context shown as UI element, NOT injected into message transcript
- Messages remain clean and conversational

---

## Gap 4: PropertyMap - Climate Exposure Indicator

### Current State
- Shows pin + address only
- No explanation of why location matters
- `LocalSignals` is a separate card

### Implementation

**Modify**: `src/components/dashboard-v3/PropertyMap.tsx`

**A. Climate Zone Derivation**
```typescript
interface ClimateZone {
  zone: 'high_heat' | 'coastal' | 'freeze_thaw' | 'moderate';
  label: string;
  impact: string;
}

function deriveClimateZone(
  state?: string, 
  city?: string, 
  lat?: number
): ClimateZone {
  const location = `${city || ''} ${state || ''}`.toLowerCase();
  
  // South Florida / low latitude
  if (location.includes('miami') || location.includes('florida') || 
      (lat && lat < 28)) {
    return {
      zone: 'high_heat',
      label: 'High heat & humidity zone',
      impact: 'Impacts HVAC, roof, and water heater lifespan'
    };
  }
  
  // Coastal
  if (location.includes('beach') || location.includes('coast')) {
    return {
      zone: 'coastal',
      label: 'Salt air exposure zone',
      impact: 'Accelerates exterior wear'
    };
  }
  
  // Northern/freeze-thaw
  if (location.includes('boston') || location.includes('chicago') || 
      location.includes('minneapolis') || (lat && lat > 42)) {
    return {
      zone: 'freeze_thaw',
      label: 'Freeze-thaw zone',
      impact: 'Impacts plumbing, foundation, and exterior'
    };
  }
  
  return {
    zone: 'moderate',
    label: 'Moderate climate zone',
    impact: 'Standard wear patterns expected'
  };
}
```

**B. Updated PropertyMap UI**
```text
Property Location
[ Map placeholder with climate gradient ]

🌡 High heat & humidity zone
Impacts HVAC, roof, and water heater lifespan
```

**C. Nested LocalSignals**
Modify `RightColumn.tsx` to visually nest `LocalSignals` under `PropertyMap`:
- Remove separate card wrapper
- Climate zone appears as first signal
- Signals list directly below map

---

## Gap 5: Redundancy Cleanup

### Changes

**A. Remove MonthlyPriorityCTA from MiddleColumn**
- `HabittaThinking` replaces it entirely
- Delete the section rendering `MonthlyPriorityCTA`

**B. SystemWatch Owns Urgency**
- SystemWatch shows planning window alerts (already done)
- No duplicate "Ask Habitta" cards below forecast
- `HomeHealthCard` CTA remains but doesn't repeat system-specific messaging

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/dashboard-v3/MaintenanceRoadmap.tsx` | Create | Horizontal month rail with task placement |
| `src/components/dashboard-v3/HabittaThinking.tsx` | Create | Chat presence component above fold |
| `src/components/dashboard-v3/ChatDock.tsx` | Modify | Rounded corners, context placeholder, context header |
| `src/components/dashboard-v3/PropertyMap.tsx` | Modify | Add climate zone derivation and display |
| `src/components/dashboard-v3/LocalSignals.tsx` | Modify | Add climate prop, nested styling |
| `src/components/dashboard-v3/RightColumn.tsx` | Modify | Integrate LocalSignals into PropertyMap container |
| `src/components/dashboard-v3/MiddleColumn.tsx` | Modify | Replace MonthlyPriorityCTA with HabittaThinking, replace MaintenanceTimeline with MaintenanceRoadmap |

---

## Final Component Hierarchy

```text
MiddleColumn
├── [Enriching Indicator]           ← Transient
├── SystemWatch                     ← Boxed, authoritative
├── HomeHealthCard                  ← Primary instrument
├── HabittaThinking                 ← NEW: Chat presence above fold
├── CapitalTimeline                 ← Systems planning
├── MaintenanceRoadmap              ← NEW: Horizontal month rail
└── ChatDock (sticky)               ← Rounded top, context-aware

RightColumn (Context Rail)
└── PropertyMap                     ← With climate meaning
    └── LocalSignals (nested)       ← Climate + weather + permits
```

---

## Technical Details

### MaintenanceRoadmap Month Generation
```typescript
const generateMonths = () => {
  const months: MonthData[] = [];
  const now = new Date();
  
  for (let i = 0; i < 12; i++) {
    const month = addMonths(now, i);
    months.push({
      key: format(month, 'yyyy-MM'),
      label: format(month, 'MMM'),
      isNow: i === 0,
    });
  }
  
  return months;
};
```

### Task-to-Month Mapping
```typescript
const mapTaskToMonth = (task: RoadmapTask): string | null => {
  if (task.dueDate) {
    return format(new Date(task.dueDate), 'yyyy-MM');
  }
  if (task.dueMonth) {
    return task.dueMonth;
  }
  if (task.season) {
    const year = new Date().getFullYear();
    const seasonMonths = {
      spring: '03',
      summer: '06', 
      fall: '09',
      winter: '12'
    };
    return `${year}-${seasonMonths[task.season]}`;
  }
  return null; // Unscheduled
};
```

### HabittaThinking State
```typescript
const [dismissedThisSession, setDismissedThisSession] = useState(() => 
  sessionStorage.getItem('habitta_thinking_dismissed') === 'true'
);

const handleDismiss = () => {
  sessionStorage.setItem('habitta_thinking_dismissed', 'true');
  setDismissedThisSession(true);
};
```

---

## Success Criteria

A first-time user should understand in under 10 seconds without scrolling:
1. What's flagged (SystemWatch)
2. Why it matters (HomeHealthCard trajectory)
3. Habitta is actively thinking (HabittaThinking)
4. What's coming next (MaintenanceRoadmap month rail)
5. How to talk about it (ChatDock presence)

If this isn't immediately clear, the dashboard is still a report.

---

## Implementation Priority

1. **MaintenanceRoadmap** - Month rail + task placement (highest visual impact)
2. **HabittaThinking** - Chat presence above fold (biggest emotional gap)
3. **ChatDock updates** - Visual connection + context (completes chat transformation)
4. **PropertyMap climate** - Gives map purpose (minimum meaningful map)
5. **Redundancy cleanup** - Remove MonthlyPriorityCTA (final polish)
