

# Revised: Chat History Persistence with QA Fixes

## Summary of QA Feedback Addressed

| Issue | Status | Solution |
|-------|--------|----------|
| #1 Race condition with async propertyId | ✅ Fixed | Use `useEffect` for restoration, not `useState` initializer |
| #2 Opening message duplicate risk | ✅ Fixed | Add `isRestoring` state, wait before injecting opening |
| #3 Property switching behavior | ✅ Fixed | Clear messages when propertyId changes |
| #5 Quota exceeded handling | ✅ Added | Fallback to last 50 messages |
| #6 Simplify clearConversation | ✅ Fixed | Let useEffect handle storage sync |
| #8 Initialization guard | ✅ Fixed | Export `isRestoring`, wait in ChatConsole |

---

## Implementation

### File 1: `src/hooks/useAIHomeAssistant.ts`

#### Add Storage Key Constant
```typescript
const CHAT_MESSAGES_KEY = 'habitta_chat_messages';
```

#### Add New State Variables
```typescript
const [messages, setMessages] = useState<ChatMessage[]>([]);
const [isRestoring, setIsRestoring] = useState(true); // NEW: Track restoration state
```

#### Add Restoration Effect (handles async propertyId)
```typescript
// Restore messages from sessionStorage when propertyId becomes available
useEffect(() => {
  if (!propertyId) {
    setIsRestoring(false);
    return;
  }
  
  try {
    const stored = sessionStorage.getItem(`${CHAT_MESSAGES_KEY}_${propertyId}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setMessages(parsed);
      }
    }
  } catch (e) {
    console.error('Failed to restore chat history:', e);
  } finally {
    setIsRestoring(false);
  }
}, [propertyId]);
```

#### Add Persistence Effect (with quota handling)
```typescript
// Persist messages to sessionStorage
useEffect(() => {
  if (!propertyId || isRestoring) return;
  
  try {
    if (messages.length > 0) {
      const serialized = JSON.stringify(messages);
      
      // Safety check: ~4MB limit
      if (serialized.length > 4_000_000) {
        console.warn('Chat history too large, truncating');
        sessionStorage.setItem(
          `${CHAT_MESSAGES_KEY}_${propertyId}`,
          JSON.stringify(messages.slice(-50))
        );
        return;
      }
      
      sessionStorage.setItem(`${CHAT_MESSAGES_KEY}_${propertyId}`, serialized);
    } else {
      // Explicitly clear on empty (handles clearConversation)
      sessionStorage.removeItem(`${CHAT_MESSAGES_KEY}_${propertyId}`);
    }
  } catch (e) {
    if (e instanceof Error && e.name === 'QuotaExceededError') {
      // Fallback: keep only last 50 messages
      try {
        sessionStorage.setItem(
          `${CHAT_MESSAGES_KEY}_${propertyId}`,
          JSON.stringify(messages.slice(-50))
        );
      } catch {
        // Silent failure
      }
    }
  }
}, [messages, propertyId, isRestoring]);
```

#### Add Property Change Handler
```typescript
// Clear messages when property changes (prevents cross-property pollution)
const prevPropertyIdRef = useRef(propertyId);

useEffect(() => {
  if (prevPropertyIdRef.current && propertyId && prevPropertyIdRef.current !== propertyId) {
    // Property changed mid-session, clear UI
    setMessages([]);
  }
  prevPropertyIdRef.current = propertyId;
}, [propertyId]);
```

#### Simplify clearConversation
```typescript
const clearConversation = useCallback(() => {
  setMessages([]); // useEffect will handle storage removal
  setError(null);
}, []);
```

#### Update Return Statement
```typescript
return {
  messages,
  loading,
  error,
  isRestoring, // NEW: ChatConsole should wait for this
  sendMessage,
  sendSuggestion,
  clearConversation,
  injectMessage,
  injectMessageWithArtifact,
};
```

---

### File 2: `src/components/dashboard-v3/ChatConsole.tsx`

#### Update Hook Destructuring (line ~185)
```typescript
const { messages, loading, sendMessage, injectMessage, isRestoring } = useAIHomeAssistant(propertyId, {
  // ... existing options
});
```

#### Update Opening Message Effect (line ~211)

The current effect checks `messages.length === 0`, which is correct. However, we need to also wait for restoration to complete:

```typescript
// Inject personal blurb explaining the System Outlook artifact
// Wait for restoration to complete before deciding to show opening
useEffect(() => {
  // Don't show opening while still restoring from storage
  if (isRestoring) return;
  
  if (
    messages.length === 0 && 
    !hasShownBaselineOpening &&
    baselineSystems.length > 0
  ) {
    const planningCount = baselineSystems.filter(
      s => s.state === 'planning_window' || s.state === 'elevated'
    ).length;
    
    const message = generatePersonalBlurb({
      yearBuilt,
      systemCount: baselineSystems.length,
      planningCount,
      confidenceLevel,
      isFirstVisit: isFirstUserVisit,
    });
    
    injectMessage(message);
    markBaselineOpeningShown();
    setHasShownBaselineOpening(true);
    
    if (isFirstUserVisit) {
      markFirstVisitComplete();
    }
  }
}, [isRestoring, messages.length, hasShownBaselineOpening, injectMessage, baselineSystems, confidenceLevel, yearBuilt, isFirstUserVisit]);
```

#### Update hasShownBaselineOpening Initialization (line ~173)

Check if storage already has messages for this property:

```typescript
const [hasShownBaselineOpening, setHasShownBaselineOpening] = useState(() => {
  // Check both the explicit flag AND existing messages
  const flagSet = wasBaselineOpeningShown();
  const hasStoredMessages = (() => {
    try {
      const stored = sessionStorage.getItem(`habitta_chat_messages_${propertyId}`);
      return stored !== null && JSON.parse(stored).length > 0;
    } catch {
      return false;
    }
  })();
  return flagSet || hasStoredMessages;
});
```

---

## Sequence Diagram

```text
┌─────────────┐     ┌──────────────────┐     ┌────────────────┐
│ User Action │     │ useAIHomeAssistant│     │ sessionStorage │
└──────┬──────┘     └────────┬─────────┘     └───────┬────────┘
       │                     │                       │
       │ Mount component     │                       │
       │ (propertyId=abc)    │                       │
       ├────────────────────►│                       │
       │                     │ isRestoring=true      │
       │                     │                       │
       │                     │ Read storage          │
       │                     ├──────────────────────►│
       │                     │◄──────────────────────┤
       │                     │ [messages from prev]  │
       │                     │                       │
       │                     │ setMessages(restored) │
       │                     │ isRestoring=false     │
       │                     │                       │
       │ ChatConsole checks  │                       │
       │ isRestoring=false   │                       │
       │ messages.length>0   │                       │
       │ → Skip opening msg  │                       │
       │                     │                       │
       │ Navigate to /systems│                       │
       ├────────────────────►│ Component unmounts    │
       │                     │ (messages in storage) │
       │                     │                       │
       │ Return to /dashboard│                       │
       ├────────────────────►│                       │
       │                     │ Mount again           │
       │                     │ Read storage          │
       │                     ├──────────────────────►│
       │                     │◄──────────────────────┤
       │                     │ Messages restored     │
       │                     │                       │
       │ User continues chat │                       │
       └─────────────────────┴───────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useAIHomeAssistant.ts` | Add sessionStorage persistence with all QA fixes |
| `src/components/dashboard-v3/ChatConsole.tsx` | Wait for `isRestoring`, update initialization |

---

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| `propertyId` undefined on mount | `isRestoring` becomes `false` immediately, no read attempt |
| `propertyId` becomes available async | Restoration happens via `useEffect`, not initializer |
| User switches properties | Messages cleared on property change |
| Storage quota exceeded | Falls back to last 50 messages |
| Corrupted JSON in storage | Silent failure, starts fresh |
| User clears conversation | `setMessages([])` triggers storage removal via effect |
| Very large history (>4MB) | Truncates to last 50 messages |
| Two tabs same property | Last write wins (acceptable for session storage) |
| Tab close | History cleared (correct session semantics) |

---

## Testing Checklist

After implementation:
1. Chat with home → Navigate to /systems → Return → Messages preserved
2. Clear conversation → Navigate away → Return → No messages (correct)
3. Different property → No cross-pollution
4. Send many messages → No quota errors
5. Opening message appears once (not duplicated after restoration)

---

## No Rollback Needed

This is additive functionality with graceful degradation:
- If storage fails → Chat works normally, just loses persistence
- If restoration fails → Chat starts fresh (existing behavior)
- No feature flag needed for MVP

