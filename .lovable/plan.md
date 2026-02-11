

# Fix: Tool Call Follow-Up (Record AND Respond)

## Problem

Lines 812-831 of `ai-home-assistant/index.ts` treat a tool call as a terminal state. After executing `record_home_event` (or any tool), the function returns the raw tool result as the message. The user never gets an answer to their question.

## Fix

Replace the tool-call return block (lines 812-831) with a two-pass pattern:

1. Execute the tool (unchanged)
2. Build a follow-up messages array that includes:
   - The original system prompt
   - The conversation history + user message
   - The assistant message with its `tool_calls` array (from the first LLM response)
   - A `tool` role message with matching `tool_call_id` containing the stringified tool result
3. Make a second LLM call -- same model, same system prompt, **no tools**, `max_tokens: 600`
4. Return the second call's `content` as the user-facing `message`, with `functionCall` and `functionResult` still attached for UI badges

## Key Constraints

- The second call explicitly omits `tools` and `tool_choice` to prevent infinite chaining (max 2 LLM calls)
- The `tool_call_id` in the follow-up `tool` role message must exactly match the `id` from `aiMessage.tool_calls[0]`
- A runtime guard ensures `tool_call_id` exists before making the second call; if missing, falls back to current behavior
- The second call gets a small appended instruction: "The tool has already executed. Respond naturally -- explain what was recorded AND answer the user's question. Do not reference tool names or IDs."

## Pseudocode

```text
if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
  const toolCall = aiMessage.tool_calls[0];
  const functionResult = await handleFunctionCall(...);

  // Guard: tool_call_id must exist for second pass
  if (!toolCall.id) {
    // fallback to current behavior
    return { message: functionResult, functionCall: toolCall.function, functionResult };
  }

  // Build follow-up messages
  const followUpMessages = [
    ...messages,  // original system + history + user
    {
      role: 'assistant',
      tool_calls: aiMessage.tool_calls,
      content: aiMessage.content || null,
    },
    {
      role: 'tool',
      tool_call_id: toolCall.id,
      content: typeof functionResult === 'string' ? functionResult : JSON.stringify(functionResult),
    },
    {
      role: 'system',
      content: 'The tool has already executed. Respond naturally to the user: acknowledge what was recorded AND answer their original question. Do not reference tool names or IDs.',
    }
  ];

  // Second LLM call -- NO tools
  const followUpResponse = await fetch(API_URL, {
    method: 'POST',
    headers: { ... },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: followUpMessages,
      max_tokens: 600,
      temperature: 0.7,
      // NO tools, NO tool_choice
    }),
  });

  const followUpData = await followUpResponse.json();
  const followUpContent = followUpData.choices?.[0]?.message?.content;

  return {
    message: followUpContent || functionResult,
    functionCall: toolCall.function,
    functionResult,
    suggestions: generateFollowUpSuggestions(message, context),
  };
}
```

## File to Modify

| File | Lines | Change |
|------|-------|--------|
| `supabase/functions/ai-home-assistant/index.ts` | 812-831 | Replace single-turn return with two-pass follow-up pattern |

## What Does NOT Change

- Tool definitions (lines 641-793)
- `handleFunctionCall` logic (all tool handlers)
- System prompt construction
- Non-tool-call response path (lines 834-837)
- Client-side hooks, message format, or UI components
- `HomeEventConfirmation` component (still reads `functionResult`)
- Chat persistence

## Future Guard (Not Implemented Now, Noted for Later)

For purely transactional intents ("Mark this as fixed"), a future intent classifier could skip the second LLM call and return a brief acknowledgment directly. This is deferred -- every tool call gets a follow-up for now, which is the safer default.
