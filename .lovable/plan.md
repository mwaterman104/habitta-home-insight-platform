

# Mobile Conversation-First Transformation
## Final Implementation Specification (Refined)

---

## Executive Summary

Transform mobile from "dashboard with chat attached" to "chat with evidence orbit." Core changes:

1. **Persistent Docked Chat Input** on System Plan screens
2. **System Drawer** via hamburger menu for global navigation
3. **Replace "Help" with unified Chat** in bottom navigation
4. **Contextual Chat Priming** with per-system guard
5. **Scroll + Role Constraints** to preserve authority

---

## Behavioral Rules (Must Be Enforced)

### Rule 1: Docked Input Must Not Obscure Content

```text
On first render, SystemPlanView scrolls so that the top of 
"Cost Reality" section is visible above the docked input.
```

This ensures evidence is seen before conversation begins.

### Rule 2: Priming Injection is Per-Context, Not Per-Open

```typescript
// Guard against re-injection
const hasPrimedForContext = useRef<string | null>(null);

useEffect(() => {
  if (open && primingMessage && focusContext?.systemKey) {
    if (hasPrimedForContext.current !== focusContext.systemKey) {
      injectPrimingMessage(primingMessage);
      hasPrimedForContext.current = focusContext.systemKey;
    }
  }
}, [open, primingMessage, focusContext?.systemKey]);
```

### Rule 3: Active System Must Be Highlighted in Drawer

The System Drawer must visually pin/highlight the currently active system to prevent disorientation.

### Rule 4: Bottom Nav Chat Scoping

| User Location | Chat Scope |
|---------------|------------|
| System Plan Page | Scope to that system |
| Home Pulse Dashboard | Scope to Primary Focus system |
| Other pages | General context |

### Rule 5: Chat Role Constraints (Architecture Guardrail)

```text
Chat MAY:
- Explain visible data
- Respond to observations
- Activate/highlight existing evidence

Chat MAY NOT:
- Invent new lifecycle states
- Contradict System Plan conclusions
- Introduce actions not visible in UI
```

This prevents the AI from becoming a second decision engine.

---

## Phase 1: System Drawer (Global Navigation)

### 1.1 Create MobileSystemDrawer Component

**New File:** `src/components/mobile/MobileSystemDrawer.tsx`

```text
┌────────────────────────────────────┐
│  ☰  My Home                        │
│  ──────────────────────────────────│
│                                    │
│  🏠 Home Pulse                     │
│  📊 Systems                        │
│      ▸ HVAC (Aging)         ← ●    │  ← Active indicator
│      ▸ Water Heater (Watch)        │
│      ▸ Roof (Stable)               │
│  📁 Documents                      │
│  👤 Home Profile                   │
│  ──────────────────────────────────│
│  ⚙️ Settings                       │
└────────────────────────────────────┘
```

**Interface:**

```typescript
interface MobileSystemDrawerProps {
  open: boolean;
  onClose: () => void;
  systems: SystemTimelineEntry[];
  activeSystemKey?: string;  // For visual highlight
  address: string;
  onNavigate: (path: string) => void;
}
```

**Implementation Notes:**
- Uses existing `Sheet` component with `side="left"`
- Active system shows bullet indicator (●) and slightly darker background
- Each system shows status badge derived from `getPlanningStatus()`
- Tapping system navigates to `/systems/:systemKey/plan`

### 1.2 Add Hamburger Trigger to TopHeader

**Modify:** `src/components/dashboard-v3/TopHeader.tsx`

Add new props and hamburger icon for mobile:

```typescript
interface TopHeaderProps {
  // ... existing
  onMenuOpen?: () => void;  // New
}

// In render (left side, before brand):
{condensed && onMenuOpen && (
  <Button 
    variant="ghost" 
    size="icon" 
    onClick={onMenuOpen}
    className="mr-1"
  >
    <Menu className="h-5 w-5" />
  </Button>
)}
```

### 1.3 Integrate Drawer in DashboardV3

**Modify:** `src/pages/DashboardV3.tsx`

```typescript
const [drawerOpen, setDrawerOpen] = useState(false);

// In mobile render:
<TopHeader 
  // ... existing props
  onMenuOpen={() => setDrawerOpen(true)}
/>

<MobileSystemDrawer
  open={drawerOpen}
  onClose={() => setDrawerOpen(false)}
  systems={capitalTimeline?.systems || []}
  activeSystemKey={focusContext.type === 'SYSTEM' ? focusContext.systemKey : undefined}
  address={fullAddress}
  onNavigate={(path) => {
    navigate(path);
    setDrawerOpen(false);
  }}
/>
```

---

## Phase 2: Persistent Docked Chat on System Plan

### 2.1 Create DockedChatInput Component

**New File:** `src/components/mobile/DockedChatInput.tsx`

Visual structure:

```text
┌────────────────────────────────────────────────────────┐
│  💬 Ask about this water heater...              [→]   │
└────────────────────────────────────────────────────────┘
```

**Interface:**

```typescript
interface DockedChatInputProps {
  systemKey: string;
  systemLabel: string;
  onExpandChat: () => void;
}
```

**Implementation Notes:**
- Input is read-only visual affordance (tapping expands full chat)
- Pre-scoped placeholder: "Ask about this [system]..."
- No separate "Ask" CTA needed
- Minimal height (~56px) to preserve content visibility

### 2.2 Modify SystemPlanView for Docked Chat

**Modify:** `src/components/system/SystemPlanView.tsx`

**New Props:**

```typescript
interface SystemPlanViewProps {
  // ... existing
  onChatExpand: () => void;
  propertyId: string;
}
```

**Layout Changes:**

```typescript
// 1. Add ref for scroll management
const costSectionRef = useRef<HTMLDivElement>(null);

// 2. Scroll to Cost Reality on mount (Rule 1)
useEffect(() => {
  if (costSectionRef.current) {
    costSectionRef.current.scrollIntoView({ behavior: 'instant', block: 'start' });
  }
}, []);

// 3. Update footer structure
<div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
  {/* Docked chat input */}
  <DockedChatInput
    systemKey={system.systemId}
    systemLabel={displayName}
    onExpandChat={onChatExpand}
  />
  
  {/* Action buttons below chat */}
  <div className="px-4 pb-4 pt-2 space-y-2">
    <Button onClick={handleStartPlanning} className="w-full" size="lg">
      {PLAN_COPY.actions.primary}
    </Button>
    <Button onClick={handleAddMaintenance} variant="outline" className="w-full" size="lg">
      {PLAN_COPY.actions.secondary}
    </Button>
  </div>
</div>
```

### 2.3 Add Chat Sheet to SystemPlanPage

**Modify:** `src/pages/SystemPlanPage.tsx`

```typescript
const [chatOpen, setChatOpen] = useState(false);

// Generate priming message for this system
const primingMessage = system 
  ? CHAT_PRIMING.systemPlan(displayName, system.installYear)
  : undefined;

// Pass handlers to SystemPlanView
<SystemPlanView
  system={system}
  onBack={handleBack}
  onStartPlanning={handleStartPlanning}
  onAddMaintenance={handleAddMaintenance}
  onChatExpand={() => setChatOpen(true)}
  propertyId={home?.id || ''}
/>

// Render MobileChatSheet
<MobileChatSheet
  open={chatOpen}
  onClose={() => setChatOpen(false)}
  propertyId={home?.id || ''}
  focusContext={{ systemKey: systemKey!, trigger: 'plan_view' }}
  primingMessage={primingMessage}
  // ... other props from timeline context
/>
```

---

## Phase 3: Contextual Chat Priming

### 3.1 Add Priming Templates to mobileCopy.ts

**Modify:** `src/lib/mobileCopy.ts`

```typescript
// ============== Chat Priming Templates ==============

export const CHAT_PRIMING = {
  /**
   * System Plan screen priming
   * Invites diagnosis, not generic questions
   */
  systemPlan: (systemLabel: string, installYear?: number) => {
    const ageContext = installYear 
      ? ` installed around ${installYear}` 
      : '';
    return `You're looking at your ${systemLabel}${ageContext}. What are you noticing?`;
  },
  
  /**
   * General priming (no system context)
   */
  general: () => "How can I help you understand your home better?",
} as const;
```

### 3.2 Update MobileChatSheet for Priming (with Guard)

**Modify:** `src/components/dashboard-v3/mobile/MobileChatSheet.tsx`

```typescript
interface MobileChatSheetProps {
  // ... existing
  primingMessage?: string;
}

// Inside component:
const hasPrimedForContext = useRef<string | null>(null);

useEffect(() => {
  if (open && primingMessage && focusContext?.systemKey) {
    // Guard: Only prime once per system context (Rule 2)
    if (hasPrimedForContext.current !== focusContext.systemKey) {
      // Inject as assistant message at conversation start
      // (Implementation depends on how ChatConsole handles initial messages)
      hasPrimedForContext.current = focusContext.systemKey;
    }
  }
}, [open, primingMessage, focusContext?.systemKey]);

// Reset guard when sheet closes
useEffect(() => {
  if (!open) {
    hasPrimedForContext.current = null;
  }
}, [open]);
```

---

## Phase 4: Replace "Help" with Chat

### 4.1 Update BottomNavigation

**Modify:** `src/components/BottomNavigation.tsx`

```typescript
interface BottomNavigationProps {
  onChatOpen?: () => void;
}

const bottomNavItems = [
  { title: "Home Pulse", url: "/dashboard", icon: Home },
  { title: "Chat", action: "openChat", icon: MessageCircle },  // Changed
  { title: "Settings", url: "/settings", icon: Settings },
];

export default function BottomNavigation({ onChatOpen }: BottomNavigationProps) {
  // ...

  const handleNavClick = (item: typeof bottomNavItems[0]) => {
    if ('action' in item && item.action === 'openChat') {
      onChatOpen?.();
    } else if ('url' in item) {
      navigate(item.url);
    }
  };

  // Update isActive logic for Chat (no URL to match)
  const isActive = (item: typeof bottomNavItems[0]) => {
    if ('url' in item) {
      if (item.url === '/dashboard') {
        return location.pathname === item.url || location.pathname.startsWith('/system');
      }
      return location.pathname === item.url;
    }
    return false;  // Chat action is never "active" in nav sense
  };
}
```

### 4.2 Update DashboardV3 to Pass Chat Opener

**Modify:** `src/pages/DashboardV3.tsx`

```typescript
<BottomNavigation onChatOpen={() => setMobileChatOpen(true)} />
```

### 4.3 Chat Scoping Logic (Rule 4)

When chat opens from bottom nav, scope is determined by current route:

```typescript
// In DashboardV3:
const getChatScopeFromRoute = () => {
  if (location.pathname.startsWith('/systems/')) {
    // On System Plan - scope to that system
    const systemKey = location.pathname.split('/')[2];
    return { systemKey, trigger: 'bottom_nav' };
  }
  
  // On Dashboard - scope to Primary Focus
  if (primarySystem) {
    return { systemKey: primarySystem.systemId, trigger: 'bottom_nav' };
  }
  
  // General context
  return undefined;
};
```

### 4.4 Update LeftColumn for Consistency

**Modify:** `src/components/dashboard-v3/LeftColumn.tsx`

```typescript
const bottomItems = [
  { title: "Reports", path: "/validation", icon: FileText },
  { title: "Chat", action: "openChat", icon: MessageCircle },  // Changed
  { title: "Settings", path: "/settings", icon: Settings },
];
```

Note: Desktop chat behavior may differ - this ensures mental model consistency.

---

## Files Summary

### New Files

| File | Purpose |
|------|---------|
| `src/components/mobile/MobileSystemDrawer.tsx` | Left-side drawer with system navigation |
| `src/components/mobile/DockedChatInput.tsx` | Persistent chat input for System Plan |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/dashboard-v3/TopHeader.tsx` | Add `onMenuOpen` prop, hamburger icon |
| `src/components/system/SystemPlanView.tsx` | Add DockedChatInput, scroll behavior, new props |
| `src/pages/SystemPlanPage.tsx` | Add MobileChatSheet, priming message |
| `src/lib/mobileCopy.ts` | Add `CHAT_PRIMING` templates |
| `src/components/dashboard-v3/mobile/MobileChatSheet.tsx` | Add `primingMessage` with per-context guard |
| `src/components/BottomNavigation.tsx` | Replace "Help" with "Chat" action, add `onChatOpen` |
| `src/pages/DashboardV3.tsx` | Add drawer state, pass `onMenuOpen` and `onChatOpen` |
| `src/components/dashboard-v3/LeftColumn.tsx` | Replace "Help" with "Chat" for consistency |

---

## Implementation Order

| Phase | Priority | Components | Effort |
|-------|----------|------------|--------|
| 1 | P0 | MobileSystemDrawer, TopHeader hamburger | Medium |
| 2 | P0 | DockedChatInput, SystemPlanView integration | Medium |
| 3 | P1 | Chat priming with guard in MobileChatSheet | Low |
| 4 | P0 | BottomNavigation → Chat action + scoping | Low |
| 5 | P1 | LeftColumn consistency | Low |

---

## UX Shift Summary

### Before
```text
"Here's your status. If you want, you can chat."
Chat is an escape hatch.
Navigation requires bottom nav or tapping CTAs.
```

### After
```text
"Habitta is already here with me, looking at this thing."
Chat input is always visible on System Plan.
Hamburger drawer provides global navigation.
"Chat" replaces "Help" as core primitive.
```

---

## Copy Changes

| Location | Before | After |
|----------|--------|-------|
| BottomNavigation | "Help" | "Chat" |
| LeftColumn | "Help" | "Chat" |
| DockedChatInput placeholder | N/A | "Ask about this [system]..." |
| Chat priming message | N/A | "You're looking at your Water Heater installed around 2012. What are you noticing?" |

---

## Technical Notes

### Scroll Behavior (Rule 1)
The `scrollIntoView` call uses `behavior: 'instant'` to avoid jarring animation on initial load. The `block: 'start'` positions the Cost Reality section at the top of the visible area above the docked footer.

### Sheet vs Drawer Components
- **System Drawer:** Uses `Sheet` with `side="left"`
- **Chat Sheet:** Uses `Drawer` (bottom) via existing `MobileChatSheet`

No new component library additions required.

### Avoiding Double Chat
All chat surfaces open the same `MobileChatSheet`:
- DockedChatInput → opens with system context
- ContextualChatLauncher → opens with Primary Focus context
- Bottom nav "Chat" → opens with route-derived context

Single chat primitive, multiple entry points.

