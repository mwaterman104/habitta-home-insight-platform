

# Chat Console Authority — Complete Restructure

## The Problem (What the Screenshot Shows)

The current middle column has **7 separate UI sections**:
1. "TODAY'S STATUS" banner (speaking in sentences outside chat)
2. HOME POSITION card (standalone hero)
3. EQUITY POSITION card (standalone hero)
4. LIFECYCLE HORIZON section (duplicated timeline)
5. Context Drawer (expandable)
6. BaselineSurface (added as sibling to chat)
7. ChatDock (collapsed at bottom)

This violates the core spec:
> *"Habitta does not have a dashboard with a chat. Habitta is a chat that shows its work."*

---

## The Fix (Canonical Structure)

The middle column becomes **one component**: the Chat Console.

```text
┌─────────────────────────────────────────────┐
│  CHAT CONSOLE (WHITE, ROUNDED, 100% WIDTH)  │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │  BASELINE SURFACE (PINNED ARTIFACT)   │ │
│  │  Lifecycle: Mid-Life | Confidence: Mod│ │
│  │                                       │ │
│  │  HVAC      ────●────────── Stable     │ │
│  │  Roof      ────────●────── Planning   │ │
│  │  Water     ──────────●──── Elevated   │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  [Chat messages appear BELOW baseline]      │
│                                             │
│  ────────────────────────────────────────   │
│  Habitta:                                   │
│  "Based on what you're seeing above,        │
│   your water heater is entering a           │
│   planning window."                         │
│  ────────────────────────────────────────   │
│                                             │
│  [Input field + send button]                │
└─────────────────────────────────────────────┘
```

---

## What Gets Eliminated from Middle Column

| Component | Action | Reason |
|-----------|--------|--------|
| `HomeStatusHeader` | **REMOVE** | Speaking in sentences outside chat |
| `HomePositionAnchor` | **REMOVE** | Standalone card, not allowed |
| `EquityPositionCard` | **REMOVE** | Standalone card, not allowed |
| `LifecycleHorizon` | **REMOVE** | Duplicated by BaselineSurface inside chat |
| `ContextDrawer` | **REMOVE** | Interpretive mode handles "why" |
| `StateOfHomeReport` | **KEEP (conditional interrupt)** | Annual review is an exception |

---

## Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `src/components/dashboard-v3/ChatDock.tsx` | **Major Rewrite** | Becomes the entire middle column |
| `src/components/dashboard-v3/ChatConsole.tsx` | **Create** | New unified component (renamed from ChatDock) |
| `src/components/dashboard-v3/MiddleColumn.tsx` | **Major Simplify** | Renders only ChatConsole |
| `src/components/dashboard-v3/BaselineSurface.tsx` | **Keep** | Moved inside ChatConsole as pinned artifact |

---

## Technical Implementation

### Part 1: New ChatConsole Component

The new `ChatConsole` component owns the entire middle column:

**Structure:**
```text
ChatConsole
├── BaselineSurface (pinned, always visible at top)
├── Chat Messages (scrollable, appear below baseline)
├── Inline Artifacts (charts, tables - future)
└── Input (anchored bottom)
```

**Key behaviors:**
- Chat console is ALWAYS expanded (no collapsed state in middle column)
- Baseline is the first artifact, renders before any messages
- Messages scroll independently, baseline stays pinned
- Chat state machine still controls WHAT is said, not WHETHER chat is visible

### Part 2: Pinned Baseline Behavior

The baseline surface becomes a special chat artifact:

**Rules:**
- Renders at the very top of the chat content
- Uses `sticky top-0` to remain visible when scrolling messages
- Slightly inset with subtle background to distinguish from messages
- Updates only when underlying data changes
- Not styled as a message bubble

**Visual treatment:**
- `bg-muted/10` (subtle tint, calmer than current)
- `rounded-lg` container
- Subtle `border` (no shadows)
- "Why?" affordances trigger Interpretive mode

### Part 3: Simplified MiddleColumn

The entire MiddleColumn becomes:

```typescript
export function MiddleColumn({ ...props }) {
  return (
    <div className="flex flex-col h-full">
      {/* Annual State of Home - only interrupt allowed */}
      {annualCard && (
        <StateOfHomeReport data={annualCard} onDismiss={dismissAnnual} />
      )}
      
      {/* The Chat Console IS the middle column */}
      <ChatConsole
        propertyId={propertyId}
        baselineSystems={baselineSystems}
        lifecyclePosition={lifecyclePosition}
        confidenceLevel={confidenceLevel}
        chatMode={chatMode}
        onWhyClick={handleWhyClick}
        onSystemUpdated={onSystemUpdated}
        // ... other props
      />
    </div>
  );
}
```

### Part 4: Silent Steward Visual State

When in `silent_steward` mode:
- Baseline is visible
- NO messages below it
- Input is available and ready
- This is intentional silence, not emptiness

**Empty state copy (inside chat, not above):**
```text
"Your home is being watched. Nothing requires attention."
```

Or simply: no message at all (true silence).

### Part 5: Message Referencing

All chat messages now reference the baseline above:

**Planning Window:**
> "Based on what you're seeing above, your water heater is entering a planning window. Nothing needs to be done yet."

**Elevated Attention:**
> "The deviation you see in the timeline above suggests something has changed. Can you confirm when you last had this serviced?"

**Baseline Establishment:**
> "I'm still forming the baseline you see above. Let's start with your HVAC system."

---

## Acceptance Criteria (From Spec)

### Structural Authority
- [ ] Chat console occupies 100% of middle column
- [ ] No standalone dashboard cards in middle column
- [ ] No UI copy speaks in sentences outside the chat

### Baseline Surface
- [ ] Renders INSIDE the chat console
- [ ] Is the FIRST element in the conversation
- [ ] Is PINNED (accessible by scrolling up)
- [ ] Is non-dismissible
- [ ] Is non-interactive except "Why?" affordances

### Evidence Before Interpretation
- [ ] Chat console renders first
- [ ] Baseline surface renders before any messages
- [ ] Chat state machine evaluates whether to speak AFTER baseline is visible

### Visual Grammar
- [ ] Pure white background on chat console
- [ ] Rounded corners on all four sides
- [ ] No shadows implying elevation
- [ ] Baseline not styled as message bubble
- [ ] No chat bubbles with tails anywhere

### Silent Steward
- [ ] When in silent_steward mode, chat does NOT speak first
- [ ] Baseline remains visible
- [ ] Input is available

---

## Implementation Order

1. **Create ChatConsole component** - New unified chat that includes baseline
2. **Move BaselineSurface inside ChatConsole** - As pinned artifact
3. **Simplify MiddleColumn** - Remove all cards, render only ChatConsole
4. **Update message copy** - Reference "above" instead of standalone claims
5. **Test silent steward** - Verify true silence (baseline only, no messages)
6. **Remove dead code** - HomeStatusHeader, HomePositionAnchor, EquityPositionCard from middle column

---

## What the Right Column Keeps

The right column (RightColumn.tsx) remains unchanged:
- Map
- Local Conditions
- Environmental context

This is NOT the chat, so it can have cards.

---

## Final Lock Statement

> "Habitta's middle column is not a dashboard. It is a conversation that shows its evidence before it speaks."

The baseline is not a sibling to the chat. The baseline is the first thing the chat says (silently, with evidence).

