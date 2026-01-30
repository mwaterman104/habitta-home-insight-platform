
# Enhance System Outlook Card Visibility and Add AI Avatar

## Overview
The System Outlook artifact in the chat needs more visual prominence to stand out as a key evidence surface. Additionally, AI messages should include a chat avatar icon to create visual consistency and identity. This will apply to:
1. The System Outlook (Baseline Surface) card
2. All AI assistant messages

---

## Changes

### 1. Make System Outlook Card "Pop" More

**File:** `src/components/dashboard-v3/ChatConsole.tsx`

The System Outlook card currently uses muted styling (`bg-muted/10`, `border-border/30`). We'll enhance it with:
- Subtle shadow for depth
- Slightly stronger border
- Light background gradient or elevated surface appearance
- Teal accent on the header to tie to Habitta brand

**Current styling (lines 447-450):**
```typescript
"ml-6 rounded-lg border border-border/30 bg-muted/10 overflow-hidden"
```

**Updated styling:**
```typescript
"ml-6 rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden"
```

**Header styling update (lines 452-453):**
Add a subtle accent border-left or background tint:
```typescript
"flex items-center justify-between px-3 py-2 border-b border-border/20 bg-gradient-to-r from-teal-50/50 to-transparent"
```

---

### 2. Add AI Avatar to Assistant Messages

**File:** `src/components/dashboard-v3/ChatConsole.tsx`

Create an inline avatar for AI messages using the Habitta logo. For consistency and performance, we'll use a small rounded version of the logo.

**Message rendering update (around lines 506-527):**

```typescript
// Import at top
import Logo from '@/components/Logo';

// In message rendering
{message.role === "assistant" && (
  <div className="shrink-0 mt-1">
    <div className="w-6 h-6 rounded-full bg-teal-50 flex items-center justify-center ring-1 ring-teal-100">
      <Logo size="sm" className="w-4 h-4" />
    </div>
  </div>
)}
```

The avatar will appear:
- To the left of assistant messages (natural chat layout)
- Above the System Outlook card (treating it as an AI-surfaced artifact)

---

### 3. Add Avatar Above System Outlook Card

Since the System Outlook is an AI-surfaced artifact (per doctrine: "it was brought here"), it should also display the Habitta avatar to reinforce that the AI presented this evidence.

**Implementation:**
Add the same avatar treatment before the Baseline Surface section:

```typescript
{/* AI Avatar for Baseline Surface */}
<div className="flex items-start gap-2">
  <div className="shrink-0 mt-1">
    <div className="w-6 h-6 rounded-full bg-teal-50 flex items-center justify-center ring-1 ring-teal-100">
      <Logo size="sm" className="w-4 h-4" />
    </div>
  </div>
  
  {/* Existing Baseline Surface card */}
  <div className="flex-1">
    {/* ... existing content ... */}
  </div>
</div>
```

---

## Visual Summary

```text
Before:
┌─────────────────────────────────┐
│  System Outlook — 3 systems     │  (flat, muted)
│  ┌─────────────────────────────┐│
│  │ HVAC System                 ││
│  │ [OK|WATCH|PLAN]             ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘

After:
  ○  ┌────────────────────────────────┐
  H  │ ▎ System Outlook — 3 systems   │  (elevated, shadow, teal accent)
     │  ┌────────────────────────────┐│
     │  │ HVAC System                ││
     │  │ [OK|WATCH|PLAN]            ││
     │  └────────────────────────────┘│
     └────────────────────────────────┘

  ○  Good afternoon. Your home has 3 key systems...
  H  

       What should I do about the system?  (user message, right-aligned)
```

---

## Technical Notes

### Files to Modify
| File | Change |
|------|--------|
| `src/components/dashboard-v3/ChatConsole.tsx` | Add Logo import, avatar wrapper for AI messages, enhanced card styling |

### Avatar Styling Tokens
- Container: `w-6 h-6 rounded-full bg-teal-50 ring-1 ring-teal-100`
- Logo: `w-4 h-4` (using existing Logo component with size="sm")

### Card Enhancement Tokens
- Border: `border border-stone-200` (from `border-border/30`)
- Background: `bg-white` (from `bg-muted/10`)
- Shadow: `shadow-sm`
- Header accent: `bg-gradient-to-r from-teal-50/50 to-transparent`
