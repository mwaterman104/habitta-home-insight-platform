

# Transform BaselineSurface into Chat-Surfaced Artifact

## The Problem

The current `BaselineSurface` looks like a **permanent dashboard widget** with:
- Uppercase section headers ("HOME CONTEXT", "SYSTEM CONDITION OUTLOOK")
- Widget-like background (`bg-muted/20`)
- No collapse/expand functionality
- No visual connection to the chat

It should look like **evidence the AI surfaced** — an artifact that "was brought here" by the assistant.

---

## The Target Design (from mockup)

```
┌─────────────────────────────────────────────────────┐
│ HOME CONTEXT                    Confidence: Moderate│
│ Typical age profile for homes   Based on home age   │
│ built around 2005               and regional...     │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ HVAC System                                     │ │
│ │ Within expected range                           │ │
│ │ ┌────────┬─────────┬─────────┐                 │ │
│ │ │   OK   │  WATCH  │  PLAN   │                 │ │
│ │ └────●───┴─────────┴─────────┘                 │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Roof                                            │ │
│ │ Within expected range                           │ │
│ │ ┌────────┬─────────┬─────────┐                 │ │
│ │ │   OK   │  WATCH  │  PLAN   │                 │ │
│ │ └────●───┴─────────┴─────────┘                 │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Water Heater                                    │ │
│ │ Approaching typical limit                       │ │
│ │ ┌────────┬─────────┬─────────┐                 │ │
│ │ │   OK   │  WATCH  │  PLAN   │                 │ │
│ │ └────────┴─────●───┴─────────┘                 │ │
│ └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ ▼ Collapse   |   ⛶ Expand                           │  ← Interaction controls
└─────────────────────────────────────────────────────┘
```

---

## Key Changes

### 1. Wrap BaselineSurface in Artifact-Like Container

Transform `BaselineSurface` to look like an `InlineArtifact`:
- Same styling: `rounded-lg border border-border/30 bg-muted/10`
- Collapsible header with chevron toggle
- "Expand" button to open a larger modal view
- Left margin inset (`ml-6`) to visually connect to chat stream

### 2. Replace Section Headers with Artifact-Style Headers

**Before (widget style):**
```tsx
<span className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
  Home context
</span>
```

**After (artifact style):**
```tsx
<p className="text-sm font-medium text-foreground">
  Typical system aging profile — homes built ~2005
</p>
<p className="text-xs text-muted-foreground">
  Confidence: Moderate · Based on home age and regional patterns
</p>
```

### 3. Card-Style System Rows

Each system becomes a discrete card with:
- System name (bold)
- State label below name ("Within expected range")
- Segmented scale with OK | WATCH | PLAN zones
- Position dot on the scale
- Soft left border color based on state

### 4. Add Expand-to-Modal Functionality

New `Expand` button opens a Dialog/Sheet showing the full artifact at larger size for easier viewing.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/dashboard-v3/BaselineSurface.tsx` | Major refactor to card-based artifact style |
| `src/components/dashboard-v3/ChatConsole.tsx` | Add expand modal state and controls |

---

## Detailed Implementation

### A. BaselineSurface.tsx — Complete Redesign

**New Structure:**
1. **Artifact Container** — matches InlineArtifact styling
2. **Header Row** — provenance info, collapse/expand controls
3. **System Cards** — each system as a discrete card
4. **Segmented Scale** — OK | WATCH | PLAN zones with colors

**System Card Visual:**
```tsx
<div className="rounded-lg border border-border/20 p-3 space-y-2">
  <div className="flex justify-between items-start">
    <div>
      <p className="text-sm font-medium text-foreground">HVAC System</p>
      <p className="text-xs text-muted-foreground">Within expected range</p>
    </div>
    {/* Optional info icon - but per doctrine, NO icons */}
  </div>
  
  {/* Segmented Scale */}
  <div className="flex h-6 rounded-full overflow-hidden text-[10px] font-medium">
    <div className="flex-1 bg-sage-200 flex items-center justify-center">OK</div>
    <div className="flex-1 bg-ochre-200 flex items-center justify-center">WATCH</div>
    <div className="flex-1 bg-amber-300 flex items-center justify-center">PLAN</div>
  </div>
  
  {/* Position Track with Dot */}
  <div className="relative h-1 bg-muted/30 rounded-full mt-1">
    <div 
      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-sage-700"
      style={{ left: '25%' }}
    />
  </div>
</div>
```

### B. Color Palette (from mockup)

| Zone | Background | Text |
|------|------------|------|
| OK | `bg-[#7C9885]/30` (sage) | `text-[#5C7663]` |
| WATCH | `bg-[#C4A962]/30` (ochre) | `text-[#9A8347]` |
| PLAN | `bg-[#D4A043]/30` (amber) | `text-[#B58A38]` |

### C. Collapse/Expand Controls

**Collapse:**
- Chevron toggle in header
- When collapsed, only shows header: "System Aging Profile — 3 systems"

**Expand:**
- Opens `Dialog` component with full-size view
- Same content, just larger and scrollable
- Close button to return to inline view

### D. ChatConsole Integration

```tsx
// State for expanded view
const [isExpanded, setIsExpanded] = useState(false);

{/* Baseline in artifact wrapper */}
<div className={cn(
  "my-2 ml-6 rounded-lg border border-border/30 bg-muted/10 overflow-hidden",
  "transition-all duration-200"
)}>
  {/* Header with controls */}
  <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground">
    <button onClick={() => setIsCollapsed(!isCollapsed)}>
      {isCollapsed ? <ChevronDown /> : <ChevronUp />}
      <span>System Outlook — {systems.length} systems</span>
    </button>
    <button onClick={() => setIsExpanded(true)}>
      <Expand className="h-3 w-3" />
    </button>
  </div>
  
  {/* Content */}
  {!isCollapsed && <BaselineSurface ... />}
</div>

{/* Expanded Modal */}
<Dialog open={isExpanded} onOpenChange={setIsExpanded}>
  <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
    <BaselineSurface ... isExpanded={true} />
  </DialogContent>
</Dialog>
```

---

## Verification Checklist

- [ ] No uppercase section headers (HOME CONTEXT, SYSTEM CONDITION OUTLOOK)
- [ ] Artifact-style container with left margin inset
- [ ] Collapsible with chevron toggle
- [ ] Expand button opens larger modal view
- [ ] Each system is a discrete card with:
  - System name (bold)
  - State label
  - Segmented OK | WATCH | PLAN scale
  - Position dot
- [ ] Color palette matches mockup (sage, ochre, amber)
- [ ] No "Why?" buttons inside artifact (per doctrine)
- [ ] Looks like "evidence the AI surfaced"

