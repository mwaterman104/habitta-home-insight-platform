

## Warm Up Onboarding Greeting: "I've Done the Homework" Tone

### What Changes
Rewrite the onboarding greeting templates to lead with what Habitta already found (permit-verified systems with years) before pivoting to blind spots. Add provenance-aware system data to the greeting context so templates can distinguish "I found a permit for your HVAC" from "I'm estimating your Roof from year built."

### Why This Works
- **Validates the tech**: Mentioning a specific permit proves Habitta actually searched their property
- **Gap strategy**: "I need to see what public records don't show" gives a clear reason to take photos
- **Benefit framing**: Asking for photos so Habitta can "watch" systems and "spot expensive surprises" -- not for "profile completion"

### Implementation

#### 1. Enrich greeting context with provenance data
**File:** `src/lib/chatGreetings.ts`

Add to `HabittaGreetingContext`:
```text
permitVerifiedSystems: Array<{ name: string; installYear?: number | null }>
estimatedSystems: string[]
```

Update `buildGreetingContext` to split `baselineSystems` by `installSource`:
- `installSource === 'permit'` -> `permitVerifiedSystems` (with year)
- everything else -> `estimatedSystems`

#### 2. Rewrite onboarding templates
**File:** `src/lib/chatGreetings.ts`

Replace current `ONBOARDING_TEMPLATES` with provenance-aware versions:

**Template A** (has permit-verified systems):
"Good morning! I've been digging through the public records for your home and I've already got a head start. I found a permit for your HVAC system (installed 2022), so I'm tracking its age and maintenance window automatically. That puts your record at 23%. To get a fuller picture, I need to see the things public records don't show. Have you replaced the Roof or Water Heater recently? A quick photo of those would let me start watching them for you -- tracking their health and spotting maintenance needs before they become expensive surprises."

**Template B** (no permits, all estimated):
"Good morning! I've started building your home's record. From property data, I'm estimating ages for your Roof, HVAC, and Water Heater -- but these are rough guesses based on your home's age. Your record is at 23%. The fastest way to sharpen everything is a quick photo of the manufacturer label on your Water Heater. That gives me a real date to work with instead of an estimate. Want to start there, or tell me about any systems you've already replaced?"

The template selector checks `permitVerifiedSystems.length > 0` to pick the right variant.

#### 3. Update conversation starters to match tone
**File:** `src/lib/chatGreetings.ts`

Onboarding starters become:
- "I replaced something recently"
- "Take a photo"
- "What did you find in records?"

### Technical Detail

```text
HabittaGreetingContext additions:
  permitVerifiedSystems: { name: string; installYear?: number | null }[]
  estimatedSystems: string[]

buildGreetingContext changes:
  const permitVerified = baselineSystems
    .filter(s => s.installSource === 'permit')
    .map(s => ({ name: s.displayName, installYear: s.installYear }));
  const estimated = baselineSystems
    .filter(s => s.installSource !== 'permit')
    .map(s => s.displayName);

Template logic:
  if (ctx.permitVerifiedSystems.length > 0) {
    // Lead with permit hook: "I found a permit for your {name}..."
    // Then pivot to estimated systems as blind spots
  } else {
    // All estimated: "From property data, I'm estimating..."
    // Suggest nextGain photo as fastest way to sharpen
  }
```

### Files to Modify

| File | Change |
|------|--------|
| `src/lib/chatGreetings.ts` | Add `permitVerifiedSystems` and `estimatedSystems` to context; rewrite `ONBOARDING_TEMPLATES` with provenance-aware "concierge" tone; update starters |

No other files change -- the `BaselineSystem` type already carries `installSource` and `installYear`, and `buildGreetingContext` already receives `baselineSystems`.

