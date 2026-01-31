

# Fix Chat Formatting - Bracket-Style Artifact Tags Leaking Through

## Problem

The AI is outputting artifact notation in **bracket-style** format:
```
[system_validation_evidence(system="Water Heater", state="elevated", reasons=["The estimated age is approaching...", ...])]
```

But the current `stripArtifactTags` function only handles **XML-style** tags:
- `<system_validation_evidence ... />`
- `<system_validation_evidence>...</system_validation_evidence>`

This causes raw artifact syntax to appear in the chat, breaking trust and UX.

---

## Root Cause

The LLM is generating artifact tags as literal text output rather than structured tool calls. While we could fix this at the prompt layer, the formatting layer MUST be resilient to unexpected LLM output formats.

---

## Solution

Add bracket-style artifact stripping to `stripArtifactTags()` in `src/lib/chatFormatting.ts`.

---

## File to Modify

| File | Changes |
|------|---------|
| `src/lib/chatFormatting.ts` | Add regex patterns to strip bracket-style artifact notation |

---

## Technical Details

**Current code (lines 129-161) handles:**
```typescript
// XML self-closing: <tag ... />
// XML block: <tag>...</tag>
```

**New patterns to add:**

1. **Bracket function-call style**: `[artifact_name(...)]`
   - Pattern: `\[artifact_name\([^\]]*\)\]`
   - Example: `[system_validation_evidence(system="Water Heater", ...)]`

2. **Bracket with nested arrays**: The `reasons=[...]` portion contains nested brackets
   - Need to handle nested content within the outer brackets

**Updated `stripArtifactTags` function:**

```typescript
function stripArtifactTags(content: string): string {
  let cleaned = content;
  
  const tagsToStrip = [
    'system_validation_evidence',
    'cost_impact_analysis',
    'system_aging_profile',
    'cost_range',
    'comparison_table',
    'confidence_explainer',
    'local_context',
    'local_contractor_recommendations',
    'contractor_recommendations',
  ];
  
  for (const tag of tagsToStrip) {
    // XML self-closing: <tag ... />
    const selfClosingRegex = new RegExp(`<${tag}[^>]*\\/>`, 'gi');
    cleaned = cleaned.replace(selfClosingRegex, '');
    
    // XML block: <tag>...</tag>
    const blockRegex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    cleaned = cleaned.replace(blockRegex, '');
    
    // ADDED: Bracket-style function call: [tag(...)]
    // Handles nested brackets by matching balanced content
    const bracketFuncRegex = new RegExp(`\\[${tag}\\([^\\]]*(?:\\[[^\\]]*\\][^\\]]*)*\\)\\]`, 'gi');
    cleaned = cleaned.replace(bracketFuncRegex, '');
  }
  
  // Also strip any remaining pseudo-XML
  cleaned = cleaned.replace(/<[a-z_]+[^>]*\/>/gi, '');
  cleaned = cleaned.replace(/<([a-z_]+)[^>]*>[\s\S]*?<\/\1>/gi, '');
  
  // ADDED: Strip any remaining bracket-style artifact patterns
  // Pattern: [word_with_underscores(...)] with possible nested content
  cleaned = cleaned.replace(/\[[a-z_]+\([^\]]*(?:\[[^\]]*\][^\]]*)*\)\]/gi, '');
  
  return cleaned;
}
```

---

## Edge Cases Handled

| Scenario | Pattern | Result |
|----------|---------|--------|
| Simple bracket artifact | `[system_validation_evidence(system="HVAC")]` | Stripped |
| With nested array | `[...(reasons=["a", "b"])]` | Stripped |
| Multiple artifacts | Two `[...]` blocks in same message | Both stripped |
| Mixed XML and bracket | Message has both formats | Both stripped |
| Partial/malformed | `[system_validation_evidence(` without closing | Left as-is (safe fallback) |

---

## Testing Checklist

After implementation:
- [ ] Bracket-style artifacts like `[system_validation_evidence(...)]` are stripped
- [ ] Nested arrays within brackets are handled
- [ ] XML-style artifacts still stripped
- [ ] Prose text between artifacts preserved
- [ ] No false positives (regular bracketed text like `[citation needed]` unaffected)

