

# Implementation Plan: Habitta Mobile Render Contract (v1)

## Understanding the Shift

The Mobile Render Contract mandates a **complete separation** of mobile and desktop rendering logic. Currently, mobile renders a scaled-down version of desktop (MiddleColumn with ChatConsole + BaselineSurface inline). The new contract requires:

| Current (Wrong) | Required (Correct) |
|-----------------|-------------------|
| Mobile = Desktop, smaller padding | Mobile = Completely different component tree |
| BaselineSurface inline on load | BaselineSurface only in detail view |
| ChatConsole always visible | ChatCTA → tap to open chat |
| Multiple system cards | Exactly one PrimarySystemCard |
| Comparative scales (OK/WATCH/PLAN) | Single-word status only |

---

## New Component Architecture

```text
Mobile Dashboard Structure:
┌─────────────────────────────┐
│ TopHeader (condensed h-14)  │
├─────────────────────────────┤
│ HomeStatusSummary           │  ← One sentence max
├─────────────────────────────┤
│ PrimarySystemCard           │  ← Exactly ONE system
├─────────────────────────────┤
│ SecondarySystemsList        │  ← Collapsed text-only list
├─────────────────────────────┤
│ ChatCTA                     │  ← One button: "Ask Habitta"
├─────────────────────────────┤
│ BottomNavigation            │
└─────────────────────────────┘

After tap on system → Detail View:
┌─────────────────────────────┐
│ Header with ← back          │
├─────────────────────────────┤
│ SystemDetailView            │
│  ├ BaselineSurface (single) │
│  ├ LifecycleTimeline        │
│  └ CostInsightPanel         │
├─────────────────────────────┤
│ ChatConsole (optional)      │
└─────────────────────────────┘
```

---

## Implementation: New Components

### 1. HomeStatusSummary (NEW)

**File: `src/components/dashboard-v3/mobile/HomeStatusSummary.tsx`**

Single-sentence status summary derived from system state.

```typescript
interface HomeStatusSummaryProps {
  systems: BaselineSystem[];
  healthStatus: 'healthy' | 'attention' | 'critical';
}

// Examples:
// "Your home is stable — all systems operating normally."
// "Your HVAC may need attention in the next 12 months."
// "Nothing needs your attention today."
```

**Rules:**
- Maximum one sentence
- No metrics, no numbers unless critical
- Plain English status

---

### 2. PrimarySystemCard (NEW)

**File: `src/components/dashboard-v3/mobile/PrimarySystemCard.tsx`**

Exactly one system card for the highest-priority system.

```typescript
interface PrimarySystemCardProps {
  system: BaselineSystem;
  onTap: () => void;
}
```

**Allowed Fields:**
- System name (e.g., "HVAC")
- Status (single word: "Stable", "Watch", "Plan")
- One-line context (e.g., "Installed 2023")
- CTA (tap to expand)

**Forbidden Fields:**
- Sliders
- OK/WATCH/PLAN scales
- Confidence badges
- Multiple statuses
- Inline timelines

---

### 3. SecondarySystemsList (NEW)

**File: `src/components/dashboard-v3/mobile/SecondarySystemsList.tsx`**

Collapsed text-only list of other systems.

```typescript
interface SecondarySystemsListProps {
  systems: BaselineSystem[];
  onSystemTap: (systemKey: string) => void;
}

// Renders as:
// "Roof · Stable"
// "Water Heater · Watch"
// Each line is tappable → navigates to detail
```

**Rules:**
- Text only (no cards)
- No nested components
- Maximum 3 visible, "+N more" if exceeded

---

### 4. ChatCTA (NEW)

**File: `src/components/dashboard-v3/mobile/ChatCTA.tsx`**

Single call-to-action button to open chat.

```typescript
interface ChatCTAProps {
  promptText: string;
  onTap: () => void;
}

// Renders as:
// ┌─────────────────────────────┐
// │  "What should I do?"  →     │
// └─────────────────────────────┘
```

**Rules:**
- One prompt
- One button
- Opens ChatConsole in sheet/drawer

---

### 5. MobileDashboardView (NEW)

**File: `src/components/dashboard-v3/mobile/MobileDashboardView.tsx`**

The complete mobile summary view that replaces the current mobile rendering.

```typescript
interface MobileDashboardViewProps {
  systems: BaselineSystem[];
  healthStatus: 'healthy' | 'attention' | 'critical';
  propertyId: string;
  onSystemTap: (systemKey: string) => void;
  onChatOpen: () => void;
}

export function MobileDashboardView({ 
  systems, 
  healthStatus, 
  propertyId,
  onSystemTap, 
  onChatOpen 
}: MobileDashboardViewProps) {
  const primarySystem = selectPrimarySystem(systems);
  const secondarySystems = systems.filter(s => s.key !== primarySystem?.key);
  
  return (
    <>
      <HomeStatusSummary systems={systems} healthStatus={healthStatus} />
      
      {primarySystem && (
        <PrimarySystemCard 
          system={primarySystem} 
          onTap={() => onSystemTap(primarySystem.key)} 
        />
      )}
      
      {secondarySystems.length > 0 && (
        <SecondarySystemsList 
          systems={secondarySystems} 
          onSystemTap={onSystemTap} 
        />
      )}
      
      <ChatCTA 
        promptText="What should I do?" 
        onTap={onChatOpen} 
      />
    </>
  );
}
```

---

## Implementation: Modifications

### 6. TopHeader Condensed Mode

**File: `src/components/dashboard-v3/TopHeader.tsx`**

Add `condensed` prop for mobile.

```typescript
interface TopHeaderProps {
  address: string;
  healthStatus: 'healthy' | 'attention' | 'critical';
  onAddressClick?: () => void;
  hasNotifications?: boolean;
  condensed?: boolean;  // NEW
}

// When condensed:
// - Height: h-14 (not h-16)
// - Truncate address more aggressively (max-w-[120px])
// - Hide date completely
// - Smaller avatar
```

---

### 7. DashboardV3 Mobile Render Tree

**File: `src/pages/DashboardV3.tsx`**

Replace the current mobile block (lines 418-457) with the new structure.

```typescript
if (isMobile) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopHeader 
        address={fullAddress}
        healthStatus={getHealthStatus()}
        onAddressClick={handleAddressClick}
        condensed  // NEW
      />
      
      <main className="flex-1 p-3 pb-20 space-y-3">
        <MobileDashboardView
          systems={baselineSystems}  // Derived from capitalTimeline
          healthStatus={getHealthStatus()}
          propertyId={userHome.id}
          onSystemTap={(key) => navigate(`/systems/${key}`)}
          onChatOpen={() => setMobileChatOpen(true)}
        />
      </main>
      
      <BottomNavigation />
      
      {/* Chat in bottom sheet/drawer */}
      <MobileChatSheet 
        open={mobileChatOpen} 
        onClose={() => setMobileChatOpen(false)}
        propertyId={userHome.id}
        {...chatProps}
      />
    </div>
  );
}
```

---

### 8. Mobile Chat Sheet

**File: `src/components/dashboard-v3/mobile/MobileChatSheet.tsx`**

Chat appears as a bottom sheet, not inline.

```typescript
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ChatConsole } from "../ChatConsole";

interface MobileChatSheetProps {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  // ... other chat props
}

export function MobileChatSheet({ open, onClose, propertyId, ...chatProps }: MobileChatSheetProps) {
  return (
    <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
      <DrawerContent className="h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>Ask Habitta</DrawerTitle>
        </DrawerHeader>
        <div className="flex-1 overflow-hidden">
          <ChatConsole 
            propertyId={propertyId} 
            {...chatProps}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
```

---

## Mobile-Only Enforcement Rules (Code-Level)

Add to `MobileDashboardView.tsx`:

```typescript
// Governance: Maximum allowed on mobile summary
const MAX_CARDS_ON_SCREEN = 2;
const MAX_CTAS_PER_SCREEN = 1;
const MAX_TEXT_LINES_PER_BLOCK = 3;

// Governance: Components that NEVER render on mobile summary
const FORBIDDEN_ON_MOBILE_SUMMARY = [
  'BaselineSurface',
  'SegmentedScale',
  'ConfidenceDots',
  'ConfidenceBadge',
  'LifecycleTimeline',
  'CostInsightPanel',
  'ChatConsole',  // Only in sheet after CTA
];
```

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/components/dashboard-v3/mobile/HomeStatusSummary.tsx` | CREATE | One-sentence status |
| `src/components/dashboard-v3/mobile/PrimarySystemCard.tsx` | CREATE | Single system card |
| `src/components/dashboard-v3/mobile/SecondarySystemsList.tsx` | CREATE | Text-only system list |
| `src/components/dashboard-v3/mobile/ChatCTA.tsx` | CREATE | Single chat button |
| `src/components/dashboard-v3/mobile/MobileDashboardView.tsx` | CREATE | Mobile summary container |
| `src/components/dashboard-v3/mobile/MobileChatSheet.tsx` | CREATE | Bottom sheet for chat |
| `src/components/dashboard-v3/mobile/index.ts` | CREATE | Barrel export |
| `src/components/dashboard-v3/TopHeader.tsx` | MODIFY | Add `condensed` prop |
| `src/pages/DashboardV3.tsx` | MODIFY | Replace mobile render tree |

---

## Spacing & Density Guardrails

| Rule | Value | Enforcement |
|------|-------|-------------|
| Max cards on screen | 2 | `PrimarySystemCard` + `SecondarySystemsList` |
| Max CTAs per screen | 1 | Single `ChatCTA` |
| Max text lines per block | 3 | CSS `line-clamp-3` |
| Nested cards | Never | Component structure forbids |
| Horizontal controls | Never | No sliders/toggles |

---

## Test Scenarios

1. **Summary View Load**: Only HomeStatusSummary + PrimarySystemCard + SecondarySystemsList + ChatCTA visible
2. **System Tap**: Navigates to `/systems/:id` with full detail view (BaselineSurface allowed here)
3. **Chat CTA Tap**: Opens bottom sheet with ChatConsole
4. **3+ Systems**: SecondarySystemsList shows 2 + "+1 more"
5. **No Systems**: Empty state with "Add your first system" CTA
6. **Attention State**: PrimarySystemCard shows "Watch" status, not the full scale

