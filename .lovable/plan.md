

# Fix: Narration Guard + "Find a Pro" CTA Rename

## What's Working

The contractor tool is now being called. Cards render with real Google Places data. The execution fix is solid.

## What's Still Broken

The AI generates forward-commit prose **before** the tool results:

> "I'll pull some local recommendations for you. Since your washing machine is a critical daily appliance, I've prioritized technicians known for quick response times."

This text passes through `sanitizePreToolContent()` (line 98-122) because that function only strips **execution artifacts** (JSON markers like `"tool_calls"`, `"arguments"`). It does not strip **false narration** -- prose that claims data retrieval happened when it hasn't.

The result: the user sees a temporal mismatch. The AI speaks in past-tense authority ("I've prioritized...") but the data renders later. This violates the trust contract.

## Root Cause (Exact Location)

Lines 698-702 in `supabase/functions/ai-home-assistant/index.ts`:

```text
const sanitizedContent = sanitizePreToolContent(aiMessage.content);

return {
  message: sanitizedContent
    ? `${sanitizedContent}\n\n${functionResult}`.trim()
    : functionResult,
  ...
};
```

`sanitizePreToolContent` is the only gate between the AI's pre-tool prose and the user. It strips JSON artifacts but allows forward-commit language through untouched.

## Fix (3 Changes)

### Change 1: Add Narration Guard to `sanitizePreToolContent`

**File:** `supabase/functions/ai-home-assistant/index.ts` (lines 99-122)

Extend `sanitizePreToolContent` to also strip sentences containing forward-commit language. This is a sentence-level filter, not a full content strip -- it preserves legitimate contextual prose (e.g., "For a mechanical issue like this, an appliance repair technician can diagnose the exact part") while removing only the offending sentences.

Forward-commit patterns to strip:

| Pattern | Example |
|---------|---------|
| `i'll pull` | "I'll pull some local recommendations..." |
| `i've pulled` | "I've pulled together some options..." |
| `i have pulled` | "I have pulled the latest data..." |
| `i've prioritized` | "I've prioritized technicians known for..." |
| `i've found` | "I've found some great options..." |
| `i found` | "I found several highly-rated..." |
| `here are some` (before tool result) | "Here are some contractors..." |
| `i've identified` | "I've identified the best matches..." |
| `i've located` | "I've located several options..." |
| `i'll find` | "I'll find the best options..." |
| `let me pull` | "Let me pull up some recommendations..." |

Implementation approach:
- Split content into sentences (by `.` followed by space or end)
- Filter out any sentence whose lowercase form contains a forward-commit pattern
- Rejoin remaining sentences
- If all sentences were stripped, return empty string (tool result stands alone)
- Log when sentences are stripped for debugging

### Change 2: Rename "Help me find local contractors" Suggestion

**File:** `supabase/functions/ai-home-assistant/index.ts` (line 1682)

Change:
```
'Help me find local contractors'
```
To:
```
'Find a pro near me'
```

This aligns the suggestion text with the "find" framing (discovery, not endorsement) and matches the PRO MODE trigger phrases.

### Change 3: No CTA Rename Needed in Frontend

After searching the codebase, the "hire a pro" text the user clicks is **not** a hardcoded CTA in the frontend. It comes from one of two places:
- The AI's own suggestion chips (generated server-side via `generateFollowUpSuggestions`)
- The user typing it manually

The `generateFollowUpSuggestions` function on line 1682 already contains the only frontend-adjacent reference: `'Help me find local contractors'`. Changing this to `'Find a pro near me'` covers the CTA rename.

The `SUGGESTED_PROMPTS` in `src/lib/chatModeCopy.ts` (the frozen prompt chips shown in the chat UI) do not contain any "hire" language -- they are mode-specific and already use observational framing. No changes needed there.

---

## Technical Details

### Narration Guard Implementation

The guard runs inside `sanitizePreToolContent`, which is called **only** when `tool_calls` are present (line 698). This means:
- It only activates when the AI is about to execute a tool
- It never affects normal prose-only responses
- It preserves contextual sentences that don't contain forward-commit patterns

```text
Sentence-level filter (pseudocode):

sentences = splitIntoSentences(content)
filtered = sentences.filter(s => !containsForwardCommitPattern(s.toLowerCase()))
return filtered.join(' ').trim()
```

This is surgical: a response like "That makes sense. I'll pull some local recommendations for you. An appliance repair specialist can diagnose the part quickly." becomes "That makes sense. An appliance repair specialist can diagnose the part quickly." -- the good prose survives, the forward-commit is stripped.

### Why Sentence-Level, Not Full Strip

The existing `sanitizePreToolContent` does full-content stripping for execution artifacts (if any marker is found, return empty string). Forward-commit language is different: the AI may generate genuinely useful contextual prose alongside the offending sentence. Stripping the entire content would lose valuable context like "For a mechanical issue like a drum not spinning, an appliance repair technician can usually diagnose the exact part within minutes."

---

## Files Changed

| File | Changes |
|------|---------|
| `supabase/functions/ai-home-assistant/index.ts` | Add forward-commit narration guard to `sanitizePreToolContent`; rename suggestion text |

## Expected Behavior After Fix

**User:** "find a pro" (after discussing washing machine)

**Before (current):**
> "I'll pull some local recommendations for you. Since your washing machine is a critical daily appliance, I've prioritized technicians known for quick response times."
>
> [Contractor cards with real data]

**After (correct):**
> "That makes sense. For a mechanical issue like this, an appliance repair specialist can usually diagnose the exact part within minutes."
>
> [Contractor cards with real data]
>
> (Post-tool guidance may follow: "When you call, ask about diagnostic fees and parts availability.")

The AI acknowledges intent, the tool executes silently, results render, and any post-result guidance is truthful because it references data that already exists.
