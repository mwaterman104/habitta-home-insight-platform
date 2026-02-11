

# Fix Data Confidence: Realistic Scoring and Copy

## Two Problems

### 1. Score is too low for confirmed systems (scoring model issue)
A home with 3 owner-confirmed systems and 2 inferred systems scores ~25-34%. That feels wrong because the model demands evidence most homeowners can't provide (permits, serials, professional service records). The denominator (100 pts across 5 systems) penalizes every system equally for missing signals that are rare in practice.

### 2. NextGain text suggests unrealistic actions
"Upload Roof permit or invoice" is the top suggestion because it's worth 4 pts. Most homeowners don't have permits or invoices on hand. Photos and date confirmations are far more accessible.

## Changes

### File 1: `src/services/homeConfidence.ts` — Rebalance signal weights

**Reweight signals to reflect real-world accessibility:**

| Signal | Current | Proposed | Rationale |
|--------|---------|----------|-----------|
| hasInstallYear | 5 | 6 | Most achievable, should be worth more |
| hasMaterial | 3 | 3 | No change (only roof/plumbing) |
| hasSerial | 2 | 1 | Nice-to-have, not critical |
| hasPhoto | 2 | 4 | Accessible and valuable (OCR potential) |
| hasPermitOrInvoice | 4 | 2 | Rare for most homeowners |
| hasMaintenanceRecord | 2 | 2 | No change |
| hasProfessionalService | 2 | 1 | Subset of maintenance, shouldn't double-weight |
| hasMaintenanceNotes | 1 | 1 | No change |

Max per system stays 20. The rebalance shifts value toward actions homeowners can actually take (photos, confirming dates) and away from documents they likely don't have (permits, serials).

**Add a new signal: `hasOwnerConfirmation`**
- Worth 3 points
- True when `installSource` is `owner_reported`, `permit`, or `inspection` (anything beyond `heuristic`/`unknown`)
- This directly rewards the user for confirming their system info during onboarding
- Replace `hasReplacementAcknowledged` (2 pts, only late-life) with this more broadly applicable signal

Updated signal point map:
- hasInstallYear: 6
- hasMaterial: 3
- hasSerial: 1
- hasPhoto: 4
- hasPermitOrInvoice: 2
- hasOwnerConfirmation: 3 (NEW — replaces hasReplacementAcknowledged)
- hasMaintenanceRecord: 2
- hasProfessionalService: 1
- hasMaintenanceNotes: 1
- hasPlannedReplacement: 0 (removed -- too niche to justify points)

Total possible per system = 6+3+1+4+2+3+2+1+1 = 23, clamped to 20. This means a system can hit 20 without needing every signal.

**Projected score for current profile:**
- HVAC: hasInstallYear (6) + hasOwnerConfirmation (3) = 9
- Water Heater: hasInstallYear (6) + hasOwnerConfirmation (3) = 9
- Roof: hasInstallYear (6) + hasOwnerConfirmation (3) = 9
- Electrical: hasInstallYear (6, via yearBuilt) = 6
- Plumbing: hasInstallYear (6, via yearBuilt) = 6
- Total: 39/100 = 39%, minus freshness
- With a single photo upload: 43%

This puts a confirmed-but-undocumented home solidly in the "developing" range after one or two photos, which feels right.

### File 2: `src/services/homeConfidence.ts` — Fix nextGain suggestions

Replace the `findNextGain` function's candidate list to prioritize realistic actions:

1. **Photo upload** (4 pts, highest priority) -- "Upload a photo of your [System]"
2. **Confirm install year** (6 pts, but only if missing) -- "Confirm when your [System] was installed"
3. **Confirm material** (3 pts, roof/plumbing only) -- "Confirm your [System] material type"
4. **Log a service record** (2 pts) -- "Log a [System] service visit"

Remove "Upload permit or invoice" from the candidate list entirely. If a user happens to have one, it can be captured via the chat or upload flow, but it should never be the *suggested* next step.

### File 3: `src/components/mobile/DataConfidenceBar.tsx` — Rework copy

Replace the current template string:
```
"Requires {nextGain.action.toLowerCase()} for improved timeline accuracy."
```

With copy that:
- Acknowledges what the user has already done
- Suggests something realistic and specific
- Doesn't sound like a to-do list

New copy logic:
- If `nextGain` exists and involves a photo: "A photo of your {system} would strengthen this record."
- If `nextGain` exists and involves confirming a date: "Confirming when your {system} was installed improves estimate accuracy."
- If `nextGain` exists (generic fallback): "Adding details to your {system} record improves estimate accuracy."
- If `nextGain` is null (everything done): No subtext shown.

### File 4: `src/components/mobile/MissingDocumentation.tsx` — Update helper text

Replace the current generic copy with something that frames documentation as strengthening the record, not filling a checklist:
- "Providing records strengthens timeline accuracy. Next step: {nextGain action}."
- When nextGain is null: "Upload permits, invoices, or photos to improve data confidence."

## What Does NOT Change
- State thresholds (solid/developing/unclear/at-risk boundaries)
- Freshness decay logic
- KEY_SYSTEMS list
- Evidence chips logic
- Desktop layout
- UI component structure (just copy changes)

## Files Modified

| File | Change |
|------|--------|
| `src/services/homeConfidence.ts` | Rebalance signal weights, add `hasOwnerConfirmation`, update `findNextGain` candidates |
| `src/components/mobile/DataConfidenceBar.tsx` | Rework subtext copy to be realistic and context-aware |
| `src/components/mobile/MissingDocumentation.tsx` | Update helper text framing |
