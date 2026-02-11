

## Fix: Non-Tool Chat Responses Should Drive Right-Column Focus

### Problem
When a user mentions a system conversationally ("My water heater is taking a while to get hot water"), the AI responds without calling a tool, so the edge function returns `{ message, suggestions }` with no `focus` field. The right panel stays on HomeOverview.

### Changes (3 files)

**1. Edge function: `supabase/functions/ai-home-assistant/index.ts`**

- Accept new `activeFocus` field from request body (line ~378)
- Add two helper functions before `generateAIResponse`:
  - `resolveSystemFocus({ userMessage, activeFocus, focusSystem })` -- priority: active focus > focusSystem param > keyword detection
  - `detectSystemFromMessageConservative(message)` -- regex-based, returns a systemId only when exactly one system matches and no comparison/ambiguity words are present
- In the non-tool return block (line ~930-933), call `resolveSystemFocus()` and include `focus` in the response if resolved
- Keyword patterns: water heater/hot water -> `water_heater`, hvac/air conditioning/furnace/heat pump -> `hvac`, roof/shingles -> `roof`
- Ambiguity guard: if message contains "vs", "or", "compare", "between" with multiple system matches, return null (no focus)

**2. Hook: `src/hooks/useAIHomeAssistant.ts`**

- Accept `activeFocus` in the options interface (from the consuming component)
- Pass `activeFocus` in the edge function request body alongside existing fields

**3. Chat Console: `src/components/dashboard-v3/ChatConsole.tsx`**

- Read current `focus` from `useFocusState()` (already imported)
- Pass it as `activeFocus` to `useAIHomeAssistant` options so the edge function knows the current panel state

### Focus Resolution Priority

```text
1. activeFocus (user already has a system panel open) --> keep it stable
2. focusSystem (frontend explicitly set a system context) --> use it
3. Keyword detection (conservative, single-system match only) --> use it
4. No match --> return no focus (panel stays as-is)
```

### What This Does NOT Change
- Tool-call focus injection (already works)
- Contractor list/detail focus routing (already works)
- User lock mechanism (already respected in ChatConsole line 302)
- No LLM structured output changes (keeping it simple with keyword detection as the user's spec allows)

