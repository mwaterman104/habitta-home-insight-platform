

# Fix: System Update JSON Should Not Appear in Chat

## Problem

When a user updates system information via chat (e.g., "the roof is original"), the raw JSON response is being displayed directly:

```json
{"type":"system_update","success":true,"systemKey":"roof","alreadyRecorded":false,"installedLine":"Installed 2012 (original system)","confidenceLevel":"medium","message":"Marked as original system. Your forecasts have been updated."}
```

Instead, users should see a natural language confirmation like:
> "I've saved that the roof is original to the house (owner-reported). You'll see it reflected in your system timeline."

## Root Cause

Two issues combine to create this bug:

1. **Server-side** (`ai-home-assistant/index.ts` line 658): When a tool call completes, the raw JSON `functionResult` is appended to the AI message. If the AI didn't write any content, only the raw JSON is shown.

2. **Client-side** (`chatFormatting.ts`): The normalization layer extracts `contractor_recommendations` JSON blocks but **does not handle `system_update` JSON blocks**.

## Solution

Add `system_update` handling to the chat formatting normalization layer. This is consistent with the existing pattern for `contractor_recommendations`:

1. Detect `system_update` JSON blocks in the message content
2. Extract the structured data
3. Convert to a human-readable confirmation message
4. Strip the raw JSON from the displayed content

---

## Technical Changes

### File: `src/lib/chatFormatting.ts`

**Add new type for system updates:**

```typescript
export interface SystemUpdateData {
  success: boolean;
  systemKey: string;
  alreadyRecorded: boolean;
  installedLine?: string;
  confidenceLevel?: string;
  message?: string;
  reason?: string;
}

export interface ExtractedStructuredData {
  contractors?: { ... };
  systemUpdate?: SystemUpdateData;  // NEW
}
```

**Add extraction function for system updates:**

```typescript
/**
 * Extract system update JSON and convert to human-readable message
 * Returns the extracted data and cleaned content
 */
function extractSystemUpdateData(content: string): {
  systemUpdate?: SystemUpdateData;
  cleanedContent: string;
  humanReadableMessage?: string;
} {
  const jsonPattern = /\{[\s\S]*?"type":\s*"system_update"[\s\S]*?\}/g;
  
  let cleanedContent = content;
  let systemUpdate: SystemUpdateData | undefined;
  let humanReadableMessage: string | undefined;
  
  const matches = content.match(jsonPattern);
  if (matches) {
    for (const match of matches) {
      try {
        const data = JSON.parse(match);
        if (data.type === 'system_update') {
          systemUpdate = {
            success: data.success,
            systemKey: data.systemKey,
            alreadyRecorded: data.alreadyRecorded || false,
            installedLine: data.installedLine,
            confidenceLevel: data.confidenceLevel,
            message: data.message,
            reason: data.reason,
          };
          
          // Build human-readable confirmation
          humanReadableMessage = buildSystemUpdateConfirmation(systemUpdate);
          
          // Remove the JSON block from content
          cleanedContent = cleanedContent.replace(match, '');
        }
      } catch (e) {
        console.warn('Failed to parse system update JSON:', e);
        cleanedContent = cleanedContent.replace(match, '');
      }
    }
  }
  
  return { systemUpdate, cleanedContent, humanReadableMessage };
}
```

**Add human-readable message builder (following advisor copy governance rules):**

```typescript
/**
 * Build human-readable confirmation following advisor copy governance.
 * Reference: memory/style/advisor/conversational-write-confirmation
 * 
 * Required pattern: "I've saved that the [system] was [action] in [year] (owner-reported). 
 * You'll see it reflected in your system timeline."
 */
function buildSystemUpdateConfirmation(data: SystemUpdateData): string {
  const systemNames: Record<string, string> = {
    hvac: 'HVAC system',
    roof: 'roof',
    water_heater: 'water heater',
  };
  
  const systemName = systemNames[data.systemKey] || data.systemKey.replace(/_/g, ' ');
  
  if (!data.success) {
    return data.message || "I wasn't able to save that update. Please try again.";
  }
  
  if (data.alreadyRecorded) {
    return `That's already recorded. Your ${systemName} shows as ${data.installedLine || 'up to date'}.`;
  }
  
  // Extract year from installedLine if available (e.g., "Installed 2012 (original system)")
  const yearMatch = data.installedLine?.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? yearMatch[0] : '';
  
  // Determine action from installedLine
  const isOriginal = data.installedLine?.toLowerCase().includes('original');
  const action = isOriginal ? 'is original to the house' : `was installed in ${year}`;
  
  if (year && !isOriginal) {
    return `I've saved that the ${systemName} was installed in ${year} (owner-reported). You'll see it reflected in your system timeline.`;
  }
  
  if (isOriginal) {
    return `I've saved that the ${systemName} is original to the house (owner-reported). You'll see it reflected in your system timeline.`;
  }
  
  // Fallback to server message if we can't parse specifics
  return data.message || `I've updated your ${systemName} information. You'll see it reflected in your system timeline.`;
}
```

**Update `extractAndSanitize` to include system updates:**

```typescript
export function extractAndSanitize(content: string): NormalizedContent {
  const structuredData: ExtractedStructuredData = {};
  
  // 1. Extract contractor data first
  const { contractors, cleanedContent: afterContractors } = extractContractorData(content);
  if (contractors) {
    structuredData.contractors = contractors;
  }
  
  // 2. Extract system update data (NEW)
  const { systemUpdate, cleanedContent: afterSystemUpdate, humanReadableMessage } = extractSystemUpdateData(afterContractors);
  if (systemUpdate) {
    structuredData.systemUpdate = systemUpdate;
  }
  
  // 3. Strip remaining artifact tags
  let cleanText = stripArtifactTags(afterSystemUpdate);
  
  // 4. If there's a system update, prepend the human-readable message
  if (humanReadableMessage && cleanText.trim() === '') {
    cleanText = humanReadableMessage;
  } else if (humanReadableMessage) {
    // If there's already content, append the confirmation
    cleanText = `${cleanText.trim()}\n\n${humanReadableMessage}`;
  }
  
  // 5. Clean up excessive whitespace
  cleanText = cleanText.replace(/\n{3,}/g, '\n\n').trim();
  
  return { cleanText, structuredData };
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/chatFormatting.ts` | Add `SystemUpdateData` type, `extractSystemUpdateData` function, `buildSystemUpdateConfirmation` function, update `extractAndSanitize` |

---

## Expected Results

### Before

User says: "the roof is original"

Chat shows:
```
{"type":"system_update","success":true,"systemKey":"roof",...}
```

### After

User says: "the roof is original"

Chat shows:
> I've saved that the roof is original to the house (owner-reported). You'll see it reflected in your system timeline.

---

## Alignment with Advisor Copy Governance

This fix adheres to:

1. **memory/style/advisor/conversational-write-confirmation**: Uses exact pattern "I've saved that the [system] was [action] in [year] (owner-reported). You'll see it reflected in your system timeline."

2. **memory/architecture/chat/formatting-normalization-layer**: Extends the existing pattern for extracting structured JSON and converting to user-friendly display.

3. **memory/product/advisor/ai-output-contract**: Structured data is emitted as explicit JSON blocks with a `type` field, which the normalization layer processes.

