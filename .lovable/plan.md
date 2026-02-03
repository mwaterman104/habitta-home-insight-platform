
# Implementation Plan: Execution Artifact Firewall

## Problem Summary

Raw tool invocation artifacts (`{ "action": "calculate_cost_impact", "action_input": ... }`) are leaking into user-visible chat messages. This is a **boundary enforcement issue**, not a formatting issue.

## Root Cause Analysis

Two independent failure modes:

### 1. Orchestration Boundary Violation (Lines 651-663 in edge function)

```typescript
return {
  message: `${aiMessage.content || ''}\n\n${functionResult}`.trim(),
  ...
};
```

When the LLM emits a tool call, `aiMessage.content` may contain:
- Empty string (correct)
- Reasoning text that should be hidden
- **Raw ReAct-style JSON** like `{ "action": "calculate_cost_impact", ... }` (the screenshot)

The edge function blindly concatenates this content without sanitization.

### 2. Missing Execution Artifact Firewall (chatFormatting.ts)

The normalization layer only handles **whitelisted domain types**:
- `contractor_recommendations`
- `system_update`
- `replacement_tradeoff`

It has no defense against execution artifacts with keys like `action`, `action_input`, `tool_calls`, etc.

### 3. Missing `proposed_addition` Domain Handler

The edge function now returns `type: "proposed_addition"` (lines 1203-1225) but `chatFormatting.ts` doesn't handle it yet.

---

## Implementation (Two Layers)

### Layer 1: Edge Function Guardrail (P0)

**File: `supabase/functions/ai-home-assistant/index.ts`**

Sanitize `aiMessage.content` before returning when tool calls are present.

**Change at lines 651-663:**

```typescript
if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
  const toolCall = aiMessage.tool_calls[0];
  const functionResult = await handleFunctionCall({
    name: toolCall.function.name,
    arguments: toolCall.function.arguments
  }, context);
  
  // EXECUTION BOUNDARY GUARDRAIL:
  // When tool_calls are present, the assistant's content is internal reasoning
  // and MUST NOT be returned to the user. Only the function result is user-facing.
  // Any content containing execution artifacts is stripped entirely.
  const sanitizedContent = sanitizePreToolContent(aiMessage.content);
  
  return {
    message: sanitizedContent 
      ? `${sanitizedContent}\n\n${functionResult}`.trim()
      : functionResult,
    functionCall: toolCall.function,
    functionResult
  };
}
```

**New helper function:**

```typescript
/**
 * Sanitize pre-tool assistant content.
 * INVARIANT: Execution artifacts NEVER reach the client.
 * 
 * If content contains ANY execution marker, return empty string.
 * This is fail-closed behavior — strip rather than risk leaking.
 */
function sanitizePreToolContent(content: string | null | undefined): string {
  if (!content || !content.trim()) return '';
  
  // Execution artifact markers (fail-closed: if present, strip entirely)
  const executionMarkers = [
    '"action"',           // ReAct-style tool invocation
    '"action_input"',     // ReAct argument block
    '"tool_calls"',       // OpenAI tool call metadata
    '"function"',         // Function definition in content
    '"arguments"',        // Raw argument dump
  ];
  
  // If ANY execution marker is present, treat entire content as internal
  const hasExecutionArtifact = executionMarkers.some(marker => 
    content.includes(marker)
  );
  
  if (hasExecutionArtifact) {
    console.log('[sanitizePreToolContent] Stripped execution artifact from assistant content');
    return '';
  }
  
  return content.trim();
}
```

---

### Layer 2: Execution Artifact Firewall (P0)

**File: `src/lib/chatFormatting.ts`**

Add a fail-safe firewall as the FIRST step in `extractAndSanitize()`.

**New function (insert before extractContractorData):**

```typescript
// ============================================
// Execution Artifact Firewall (P0 Safety Layer)
// ============================================

/**
 * EXECUTION ARTIFACT CLASSIFICATION
 * 
 * Execution: action, action_input, tool_calls, function, arguments
 * Domain:    contractor_recommendations, system_update, replacement_tradeoff, proposed_addition
 * 
 * Policy: Strip execution unconditionally. Parse domain artifacts.
 */
const EXECUTION_KEYS = ['action', 'action_input', 'tool_calls', 'function', 'arguments'] as const;
const DOMAIN_TYPES = ['contractor_recommendations', 'system_update', 'replacement_tradeoff', 'proposed_addition'] as const;

/**
 * Strip execution artifacts from content.
 * Runs FIRST in the pipeline — before any domain extraction.
 * 
 * INVARIANT: If a JSON object contains execution keys, it is removed entirely.
 */
function stripExecutionArtifacts(content: string): string {
  let cleaned = content;
  let searchStart = 0;
  
  while (searchStart < cleaned.length) {
    // Find next JSON object candidate
    const braceIndex = cleaned.indexOf('{', searchStart);
    if (braceIndex === -1) break;
    
    const jsonStr = extractBalancedJson(cleaned, braceIndex);
    if (!jsonStr) {
      searchStart = braceIndex + 1;
      continue;
    }
    
    try {
      const parsed = JSON.parse(jsonStr);
      
      // Check if this is an execution artifact
      const isExecutionArtifact = EXECUTION_KEYS.some(key => key in parsed);
      
      // Check if this is a known domain type (whitelist)
      const isDomainArtifact = parsed.type && DOMAIN_TYPES.includes(parsed.type);
      
      if (isExecutionArtifact && !isDomainArtifact) {
        // Strip this execution artifact
        console.warn('[stripExecutionArtifacts] Removed execution artifact:', Object.keys(parsed).slice(0, 3));
        cleaned = cleaned.slice(0, braceIndex) + cleaned.slice(braceIndex + jsonStr.length);
        // Don't advance searchStart — check same position for consecutive artifacts
        continue;
      }
    } catch {
      // Not valid JSON, skip
    }
    
    searchStart = braceIndex + jsonStr.length;
  }
  
  return cleaned;
}
```

**Update `extractAndSanitize` function:**

```typescript
export function extractAndSanitize(content: string): NormalizedContent {
  const structuredData: ExtractedStructuredData = {};
  
  // 0. FIRST: Strip execution artifacts (fail-closed firewall)
  let cleanedContent = stripExecutionArtifacts(content);
  
  // 1. Extract contractor data
  const { contractors, cleanedContent: afterContractors } = extractContractorData(cleanedContent);
  // ... rest unchanged
```

---

### Layer 3: Domain Artifact Expansion (P1)

**File: `src/lib/chatFormatting.ts`**

Add support for `proposed_addition` type.

**New type:**

```typescript
export interface ProposedAdditionData {
  success: boolean;
  systemType: string;
  displayName?: string;
  quantity?: number;
  estimatedCost?: { low: number; high: number; label: string };
  rushPremium?: { percent: number; low: number; high: number; label: string };
  expectedLifespan?: number;
  recommendation?: string;
}
```

**Update ExtractedStructuredData:**

```typescript
export interface ExtractedStructuredData {
  contractors?: { ... };
  systemUpdate?: SystemUpdateData;
  replacementTradeoff?: ReplacementTradeoffData;
  proposedAddition?: ProposedAdditionData;  // NEW
}
```

**New extraction function:**

```typescript
function extractProposedAdditionData(content: string): {
  proposedAddition?: ProposedAdditionData;
  cleanedContent: string;
  humanReadableMessage?: string;
} {
  let cleanedContent = content;
  let proposedAddition: ProposedAdditionData | undefined;
  let humanReadableMessage: string | undefined;
  
  const typeMarker = '"type":"proposed_addition"';
  const typeMarkerAlt = '"type": "proposed_addition"';
  
  let searchContent = content;
  
  while (searchContent.includes(typeMarker) || searchContent.includes(typeMarkerAlt)) {
    const markerIndex = Math.min(
      searchContent.includes(typeMarker) ? searchContent.indexOf(typeMarker) : Infinity,
      searchContent.includes(typeMarkerAlt) ? searchContent.indexOf(typeMarkerAlt) : Infinity
    );
    
    if (markerIndex === Infinity) break;
    
    let braceStart = markerIndex;
    while (braceStart > 0 && searchContent[braceStart] !== '{') {
      braceStart--;
    }
    
    const jsonStr = extractBalancedJson(searchContent, braceStart);
    if (jsonStr) {
      try {
        const data = JSON.parse(jsonStr);
        if (data.type === 'proposed_addition') {
          proposedAddition = data;
          humanReadableMessage = buildProposedAdditionMessage(data);
          cleanedContent = cleanedContent.replace(jsonStr, '');
        }
      } catch (e) {
        console.warn('Failed to parse proposed addition JSON:', e);
        cleanedContent = cleanedContent.replace(jsonStr, '');
      }
    }
    
    searchContent = searchContent.substring(markerIndex + 10);
  }
  
  return { proposedAddition, cleanedContent, humanReadableMessage };
}

function buildProposedAdditionMessage(data: ProposedAdditionData): string {
  if (!data.success) {
    return "I couldn't estimate costs for that system.";
  }
  
  const formatRange = (low: number, high: number) => {
    return `$${low.toLocaleString()}–$${high.toLocaleString()}`;
  };
  
  const displayName = data.displayName || data.systemType.replace(/_/g, ' ');
  const quantityNote = data.quantity && data.quantity > 1 ? ` (${data.quantity} units)` : '';
  
  let message = `**Installation Estimate: ${displayName}${quantityNote}**\n\n`;
  
  if (data.estimatedCost) {
    message += `• **${data.estimatedCost.label}**: ${formatRange(data.estimatedCost.low, data.estimatedCost.high)}\n`;
  }
  
  if (data.rushPremium) {
    message += `• **${data.rushPremium.label}**: ${formatRange(data.rushPremium.low, data.rushPremium.high)} (+${data.rushPremium.percent}%)\n`;
  }
  
  if (data.expectedLifespan) {
    message += `\n**Expected lifespan**: ~${data.expectedLifespan} years\n`;
  }
  
  if (data.recommendation) {
    message += `\n${data.recommendation}`;
  }
  
  return message;
}
```

**Update extractAndSanitize pipeline:**

```typescript
export function extractAndSanitize(content: string): NormalizedContent {
  const structuredData: ExtractedStructuredData = {};
  
  // 0. FIRST: Strip execution artifacts (fail-closed firewall)
  let cleanedContent = stripExecutionArtifacts(content);
  
  // 1. Extract contractor data
  const { contractors, cleanedContent: afterContractors } = extractContractorData(cleanedContent);
  if (contractors) {
    structuredData.contractors = contractors;
  }
  
  // 2. Extract system update data
  const { systemUpdate, cleanedContent: afterSystemUpdate, humanReadableMessage: systemUpdateMsg } = extractSystemUpdateData(afterContractors);
  if (systemUpdate) {
    structuredData.systemUpdate = systemUpdate;
  }
  
  // 3. Extract replacement tradeoff data
  const { replacementTradeoff, cleanedContent: afterTradeoff, humanReadableMessage: tradeoffMsg } = extractReplacementTradeoffData(afterSystemUpdate);
  if (replacementTradeoff) {
    structuredData.replacementTradeoff = replacementTradeoff;
  }
  
  // 4. NEW: Extract proposed addition data
  const { proposedAddition, cleanedContent: afterProposed, humanReadableMessage: proposedMsg } = extractProposedAdditionData(afterTradeoff);
  if (proposedAddition) {
    structuredData.proposedAddition = proposedAddition;
  }
  
  // 5. Strip remaining artifact tags
  let cleanText = stripArtifactTags(afterProposed);
  
  // 6. Append human-readable messages
  const messages = [systemUpdateMsg, tradeoffMsg, proposedMsg].filter(Boolean);
  // ... rest unchanged
}
```

---

## Files to Modify

| File | Priority | Changes |
|------|----------|---------|
| `supabase/functions/ai-home-assistant/index.ts` | P0 | Add `sanitizePreToolContent()`, update lines 651-663 |
| `src/lib/chatFormatting.ts` | P0 | Add `stripExecutionArtifacts()`, add `ProposedAdditionData` type, add `extractProposedAdditionData()`, update pipeline |

---

## Processing Order (After Fix)

```text
Edge Function:
  AI Response with tool_calls
    ↓
  sanitizePreToolContent(aiMessage.content)  ← P0: Strip execution leaks
    ↓
  handleFunctionCall() → domain JSON
    ↓
  Return sanitized content + function result

Client-Side (chatFormatting.ts):
  Raw message content
    ↓
  stripExecutionArtifacts()  ← P0: Fail-closed firewall
    ↓
  extractContractorData()
    ↓
  extractSystemUpdateData()
    ↓
  extractReplacementTradeoffData()
    ↓
  extractProposedAdditionData()  ← P1: New domain type
    ↓
  stripArtifactTags()
    ↓
  Clean text + structured data
```

---

## Acceptance Criteria

| Test | Expected |
|------|----------|
| Tool call with `{ "action": "..." }` in content | Stripped at edge function, never reaches client |
| Malformed execution JSON | Stripped by firewall |
| `proposed_addition` response | Rendered as formatted installation estimate |
| `replacement_tradeoff` response | Still works (regression check) |
| Mixed content (prose + execution artifact) | Prose preserved, artifact stripped |
| Multiple consecutive tool calls | All stripped |

---

## Artifact Classification Registry

| Class | Examples | Policy |
|-------|----------|--------|
| **Execution** | `action`, `action_input`, `tool_calls`, `function`, `arguments` | Strip unconditionally |
| **Domain** | `contractor_recommendations`, `system_update`, `replacement_tradeoff`, `proposed_addition` | Parse + render |
| **Presentation** | `<cost_range />`, bullet lists | Normalize |
| **Garbage** | Partial JSON, malformed fragments | Strip |
