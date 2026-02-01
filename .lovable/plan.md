

# Fix: Connect Chat to System Database (Golden Record Sync) — Hardened Version

## Problem Summary

When users tell the chat about their home systems (e.g., "the roof was added in 2008"), the AI responds saying it updated the home profile, but **no actual database write occurs**. The AI is hallucinating — it has no mechanism to persist this information.

This plan adds the missing `update_system_info` tool to the AI with all 5 hardening fixes from the executive review.

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/ai-home-assistant/index.ts` | Add `update_system_info` tool with ambiguity gate, handler with duplicate detection, pass homeId through context, update system prompt |
| `supabase/functions/update-system-install/index.ts` | Add explicit handling for "replaced + no year" case, return `already_recorded` when values are identical |
| `src/hooks/useAIHomeAssistant.ts` | Return `functionResult` and `systemUpdate` metadata for UI refresh detection |
| `src/components/dashboard-v3/ChatConsole.tsx` | Trigger dashboard refresh based on response envelope, not tool name |

---

## Technical Changes

### 1. Add `update_system_info` Tool (ai-home-assistant/index.ts)

Add to the tools array (around line 509):

```typescript
{
  type: 'function',
  function: {
    name: 'update_system_info',
    description: 'Update system installation information based on what the user tells you. Use this ONLY when the user provides SPECIFIC information about when a system was installed, replaced, or is original to the home. Do NOT use if the user is vague or uncertain.',
    parameters: {
      type: 'object',
      properties: {
        system_type: { 
          type: 'string', 
          enum: ['hvac', 'roof', 'water_heater'],
          description: 'The type of system being updated' 
        },
        install_year: { 
          type: 'number', 
          description: 'The SPECIFIC year the system was installed (e.g., 2008). Do NOT guess or infer — only provide if user stated explicitly.' 
        },
        replacement_status: { 
          type: 'string', 
          enum: ['original', 'replaced', 'unknown'],
          description: 'Whether this is the original system from when the home was built, a replacement, or unknown' 
        },
        knowledge_source: {
          type: 'string',
          enum: ['memory', 'receipt', 'permit', 'inspection'],
          description: 'How the user knows this information'
        }
      },
      required: ['system_type', 'replacement_status'],
      additionalProperties: false
    }
  }
}
```

### 2. Add Ambiguity Gate to System Prompt (CRITICAL FIX #1)

Add to `createSystemPrompt()`:

```typescript
SYSTEM UPDATE RULES (CRITICAL — READ CAREFULLY):

When a user tells you about their home systems (installation dates, replacements, etc.):

1. AMBIGUITY GATE (MANDATORY):
   - If the user provides a SPECIFIC year (e.g., "2008", "three years ago"), call update_system_info
   - If the user is VAGUE (e.g., "late 2000s", "maybe around 2010", "I think"), DO NOT call the tool
   - Instead, ask a clarifying question: "Do you recall the specific year, even approximately?"
   
2. TOOL INVOCATION:
   - ALWAYS use update_system_info to persist specific information
   - Wait for the tool response before confirming the update
   - Only say "I've saved..." AFTER the tool confirms success
   - If the tool fails, acknowledge the failure and ask to try again

3. CONFIRMATION LANGUAGE (MANDATORY):
   - Say: "I've saved that the [system] was [action] in [year] (owner-reported). You'll see it reflected in your system timeline."
   - DO NOT say: "I've updated your home profile" (too vague)
   - Reference provenance: "owner-reported"
   - Reference visibility: "You'll see it reflected"

NEVER claim to have updated information without actually calling the tool.

EXAMPLES THAT REQUIRE update_system_info:
- "The roof was added in 2008" → update_system_info(system_type: 'roof', install_year: 2008, replacement_status: 'replaced')
- "The AC is original to the house" → update_system_info(system_type: 'hvac', replacement_status: 'original')
- "We replaced the water heater 3 years ago" → Calculate year (2023), then update_system_info(system_type: 'water_heater', install_year: 2023, replacement_status: 'replaced')

EXAMPLES THAT DO NOT CALL THE TOOL (ask clarifying question instead):
- "I think the roof was replaced sometime in the late 2000s" → Ask for specific year
- "The AC might be around 10 years old" → Ask for confirmation
- "I'm not sure when we got the water heater" → Acknowledge uncertainty, do not call tool
```

### 3. Pass homeId Through Context (CRITICAL FIX #3)

Update `getPropertyContext()` to include homeId:

```typescript
return {
  homeId: propertyId,  // ADD THIS LINE
  systems: enrichedSystems,
  activeRecommendations: recommendations || [],
  recentPredictions: predictions || [],
  homeLocation: home ? { ... } : null
};
```

### 4. Add Handler for `update_system_info` with Duplicate Detection (FIX #4, #5)

Add to `handleFunctionCall()` switch statement:

```typescript
case 'update_system_info': {
  const homeId = context?.homeId;
  
  // CRITICAL FIX #3: Intelligible failure state
  if (!homeId) {
    console.error('[update_system_info] No homeId in context');
    return JSON.stringify({
      type: 'system_update',
      success: false,
      reason: 'no_home_context',
      message: 'I can\'t save that update because I don\'t have a home selected. Please make sure you\'re viewing a specific property.'
    });
  }
  
  // Extract auth header from the original request (passed via closure or stored)
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return JSON.stringify({
      type: 'system_update',
      success: false,
      reason: 'no_auth',
      message: 'I can\'t save that update because you\'re not signed in.'
    });
  }
  
  try {
    const response = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/update-system-install`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
          'apikey': Deno.env.get('SUPABASE_ANON_KEY') || '',
        },
        body: JSON.stringify({
          homeId,
          systemKey: parsedArgs.system_type,
          replacementStatus: parsedArgs.replacement_status,
          installYear: parsedArgs.install_year,
          installSource: 'owner_reported',
          installMetadata: {
            knowledge_source: parsedArgs.knowledge_source || 'memory',
            source: 'chat_conversation',
          }
        })
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      console.error('[update_system_info] Failed:', error);
      return JSON.stringify({
        type: 'system_update',
        success: false,
        reason: 'api_error',
        message: 'I wasn\'t able to save that update. Please try again.'
      });
    }
    
    const result = await response.json();
    
    // CRITICAL FIX #4: Structured response envelope
    return JSON.stringify({
      type: 'system_update',
      success: true,
      systemKey: parsedArgs.system_type,
      alreadyRecorded: result.alreadyRecorded || false,
      installedLine: result.installedLine,
      confidenceLevel: result.confidenceLevel,
      message: result.alreadyRecorded 
        ? `That's already recorded. Your ${parsedArgs.system_type} shows as ${result.installedLine}.`
        : result.message,
    });
  } catch (error) {
    console.error('[update_system_info] Error:', error);
    return JSON.stringify({
      type: 'system_update',
      success: false,
      reason: 'exception',
      message: 'I encountered an error saving your update. Please try again.'
    });
  }
}
```

### 5. Fix `update-system-install` for Replaced + No Year (CRITICAL FIX #2)

Update `update-system-install/index.ts` to handle edge cases:

**Add duplicate detection (around line 176):**

```typescript
// CRITICAL FIX #5: Prevent duplicate writes
const isIdenticalWrite = 
  existingSystem &&
  existingSystem.install_year === installYear &&
  existingSystem.replacement_status === replacementStatus &&
  existingSystem.install_source === 'owner_reported';

if (isIdenticalWrite) {
  console.log(`[update-system-install] Skipping duplicate write for ${systemKey}`);
  return new Response(
    JSON.stringify({
      alreadyRecorded: true,
      system: existingSystem,
      confidenceLevel: scoreInstallConfidence(existingSystem.install_source as InstallSource, !!existingSystem.install_month).level,
      installedLine: formatInstalledLine(existingSystem.install_year, existingSystem.install_source as InstallSource, existingSystem.replacement_status as ReplacementStatus),
      message: 'This information is already on record.',
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

**Clarify replaced + no year behavior (around line 190):**

```typescript
} else if (replacementStatus === 'replaced') {
  // CRITICAL FIX #2: Clarify behavior when no year provided
  // Rule: Write replacement_status ONLY, do NOT infer year
  // Confidence is capped because we lack specificity
  if (installYear) {
    newInstallYear = installYear;
    newInstallSource = installSource || 'owner_reported';
    newInstallMonth = installMonth ?? null;
  } else {
    // No year provided — mark as replaced but preserve existing year (if any)
    // Do NOT infer a year. Just record the replacement fact.
    // This is valid: user confirmed replacement but doesn't recall when.
    console.log(`[update-system-install] Replaced + no year: recording status only`);
  }
  newMetadata = {
    ...newMetadata,
    ...installMetadata,
    replaced_without_year: !installYear, // Explicit audit flag
  };
}
```

### 6. Update Hook to Return Function Result (useAIHomeAssistant.ts)

Update `sendMessage` to return the full response data:

```typescript
const sendMessage = async (message: string): Promise<AssistantResponse | void> => {
  // ... existing code ...
  
  // Add assistant response to chat
  const assistantMessage: ChatMessage = {
    id: `assistant-${Date.now()}`,
    role: 'assistant',
    content: data.message,
    timestamp: new Date().toISOString(),
    functionCall: data.functionCall,
    suggestions: data.suggestions,
    functionResult: data.functionResult, // ADD THIS
  };

  setMessages(prev => [...prev, assistantMessage]);
  
  // Return the response for callers that need it
  return data;
};
```

Also update the `ChatMessage` interface:

```typescript
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  functionCall?: any;
  functionResult?: string;  // ADD THIS
  suggestions?: string[];
  attachedArtifact?: ChatArtifact;
}
```

### 7. Update ChatConsole to Use Response Envelope (CRITICAL FIX #4)

Update `handleSend` in ChatConsole.tsx:

```typescript
const handleSend = async () => {
  if (!input.trim() || loading) return;
  const message = input;
  setInput("");
  
  onUserReply?.();
  
  const response = await sendMessage(message);
  
  // CRITICAL FIX #4: Check response envelope, not tool name
  if (response?.functionResult) {
    try {
      const result = JSON.parse(response.functionResult);
      if (result.type === 'system_update' && result.success && !result.alreadyRecorded) {
        console.log('[ChatConsole] System updated via chat:', result.systemKey);
        onSystemUpdated?.();
      }
    } catch {
      // Not JSON or no system update — that's fine
    }
  }
};
```

---

## Data Flow After Fix

```
User: "The roof was replaced in 2008"
    ↓
AI checks ambiguity gate ✓ (specific year provided)
    ↓
AI calls update_system_info tool
    ↓
update_system_info → calls update-system-install edge function
    ↓
update-system-install checks for duplicate → not found
    ↓
Writes to 'systems' table with:
  - install_year: 2008
  - install_source: 'owner_reported'
  - replacement_status: 'replaced'
  - confidence: 0.60
    ↓
Returns structured envelope:
  { type: 'system_update', success: true, systemKey: 'roof', ... }
    ↓
AI confirms with provenance:
  "I've saved that the roof was replaced in 2008 (owner-reported). You'll see it reflected in your system timeline."
    ↓
ChatConsole detects system_update envelope → calls onSystemUpdated()
    ↓
Dashboard refreshes → System Outlook shows "2008 · Owner-reported"
```

---

## Hardening Summary

| Gap | Fix |
|-----|-----|
| **#1: Missing Ambiguity Gate** | System prompt requires SPECIFIC year before calling tool; vague input triggers clarifying question |
| **#2: install_year Optional but Unguarded** | Explicit handling: replaced + no year writes status only, no inferred year |
| **#3: Home ID Context Brittle** | Intelligible error message when homeId missing ("I don't have a home selected") |
| **#4: UI Refresh Too Fragile** | Structured response envelope `{ type: 'system_update', ... }` instead of checking tool name |
| **#5: No Duplicate Protection** | Compare incoming values to canonical system; return "already recorded" if identical |

---

## Verification Checklist

After implementation:
- [ ] User says "the roof was added in 2008" → Database shows roof.install_year = 2008
- [ ] User says "I think it was the late 2000s" → AI asks for specific year (no write)
- [ ] User says "the AC is original" → Database shows hvac.replacement_status = 'original'
- [ ] User repeats same info → Response says "already recorded" (no duplicate write)
- [ ] Dashboard System Outlook refreshes to show new data
- [ ] Home Profile page shows updated system provenance
- [ ] AI confirmation includes provenance ("owner-reported") and visibility ("You'll see it reflected")
- [ ] Missing homeId shows clear error message, not silent failure

