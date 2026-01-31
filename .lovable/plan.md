

# Habitta Chat Interface Formatting Normalization Layer - Implementation Plan

## Overview

This plan implements a comprehensive formatting normalization layer for the Habitta chat interface. The core problem is that AI responses containing structured data (contractor recommendations, section labels, bullet lists) are displaying as raw text/XML instead of properly formatted UI components.

---

## Problem Summary

From the codebase analysis:

1. **Current Sanitization**: `ChatConsole.tsx` has a `sanitizeAIResponse()` function that strips known pseudo-XML tags, but it only removes them — it doesn't render them as UI components
2. **Contractor Flow**: The AI assistant edge function has a `get_contractor_recommendations` tool that returns plain text, not structured data
3. **Missing Components**: No parser exists for structured JSON/XML data, no contractor card component, no section label formatting

---

## Architecture

```text
┌─────────────────────────────────────────────┐
│   AI Response (Raw Text)                    │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│   Normalization Layer                       │
│   ├── Extract structured data (JSON/XML)   │
│   ├── Protect code blocks                   │
│   ├── Normalize section labels              │
│   ├── Convert bullet characters to lists    │
│   └── Clean remaining prose                 │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│   Presentation Layer                        │
│   ├── ContractorCard components            │
│   ├── Section labels with styling          │
│   ├── Proper list markup                   │
│   └── Markdown prose                        │
└─────────────────────────────────────────────┘
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/chatFormatting.ts` | Core normalization utilities: detection, extraction, sanitization, parsing |
| `src/components/chat/ContractorCard.tsx` | Individual contractor recommendation card |
| `src/components/chat/ContractorRecommendations.tsx` | Container for multiple contractor cards with header |
| `src/components/chat/SectionLabel.tsx` | Styled section label component |
| `src/components/chat/BulletList.tsx` | Formatted bullet list component |
| `src/components/chat/ChatMessageContent.tsx` | Smart renderer that routes content to appropriate components |
| `src/components/chat/index.ts` | Barrel exports |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard-v3/ChatConsole.tsx` | Replace inline `sanitizeAIResponse()` and `ReactMarkdown` rendering with `ChatMessageContent` component |

---

## Technical Section

### 1. Chat Formatting Utilities (`src/lib/chatFormatting.ts`)

**Types:**
```typescript
export interface ContractorRecommendation {
  name: string;
  rating: number;
  specialty: string;
  notes?: string;
  licenseVerified?: boolean;
}

export interface ExtractedStructuredData {
  contractors?: {
    service?: string;
    items: ContractorRecommendation[];
  };
}

export interface NormalizedContent {
  cleanText: string;
  structuredData: ExtractedStructuredData;
}
```

**Core Functions:**

1. `extractAndSanitize(content: string): NormalizedContent`
   - Extracts JSON contractor blocks before stripping them
   - Strips all pseudo-XML artifact tags (existing logic, consolidated)
   - Returns both clean text and extracted structured data

2. `parseContractorRecommendations(jsonString: string): ContractorRecommendation[] | null`
   - Parses JSON contractor data with validation
   - Handles malformed data gracefully (returns null)

3. `normalizeSectionLabels(text: string): string`
   - Detects "Label:" patterns on their own lines
   - Returns text with `<span class="section-label">` wrappers

4. `normalizeBulletLists(text: string): string`
   - Converts `•` character bullets to proper `<ul><li>` markup
   - Handles consecutive bullet lines as a single list

5. `escapeHtml(text: string): string`
   - Utility for safe HTML rendering

### 2. ContractorCard Component (`src/components/chat/ContractorCard.tsx`)

Visual structure following the spec:
```text
┌─────────────────────────────────────────────┐
│ 🔧 Evergreen Plumbing Solutions      [✓]   │
│ ★★★★★ 4.9/5                                │
│ Specialty: Tankless & High-Efficiency       │
│                                             │
│ Known for clean installations and helpful   │
│ rebate filing.                              │
└─────────────────────────────────────────────┘
```

**Props:**
```typescript
interface ContractorCardProps {
  name: string;
  rating: number;
  specialty: string;
  notes?: string;
  licenseVerified?: boolean;
}
```

**Styling:**
- White background with subtle border (`border-stone-200`)
- Rounded corners (`rounded-lg`)
- Subtle hover shadow
- Rating stars in amber (`text-amber-500`)
- Wrench icon from Lucide (`Wrench`)
- Optional verified badge (`BadgeCheck`)

### 3. ContractorRecommendations Container (`src/components/chat/ContractorRecommendations.tsx`)

**Props:**
```typescript
interface ContractorRecommendationsProps {
  service?: string;
  contractors: ContractorRecommendation[];
}
```

**Layout:**
- Section header with clipboard icon
- Grid layout on larger screens (`grid-cols-2` at `md:` breakpoint)
- Matches artifact styling (calm, no heavy shadows)

### 4. SectionLabel Component (`src/components/chat/SectionLabel.tsx`)

**Visual:**
- Left accent bar (3px, blue)
- Semibold text
- Proper spacing above/below

**Implementation:**
- Simple styled span
- Accepts children (the label text)

### 5. BulletList Component (`src/components/chat/BulletList.tsx`)

**Props:**
```typescript
interface BulletListProps {
  items: string[];
}
```

**Styling:**
- Blue bullet accent color
- Proper indentation
- Line height 1.6

### 6. ChatMessageContent Component (`src/components/chat/ChatMessageContent.tsx`)

**The core rendering orchestrator:**

```typescript
export function ChatMessageContent({ content }: { content: string }) {
  // 1. Extract structured data and sanitize
  const { cleanText, structuredData } = extractAndSanitize(content);
  
  // 2. Apply text normalization to clean text
  const normalizedText = normalizeBulletLists(
    normalizeSectionLabels(cleanText)
  );
  
  // 3. Render structured components FIRST (Validation First pattern)
  // 4. Render normalized text via ReactMarkdown
  
  return (
    <div className="space-y-3">
      {structuredData.contractors && (
        <ContractorRecommendations 
          service={structuredData.contractors.service}
          contractors={structuredData.contractors.items} 
        />
      )}
      
      {normalizedText && (
        <div className="prose prose-sm prose-stone dark:prose-invert max-w-none">
          <ReactMarkdown>{normalizedText}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
```

### 7. ChatConsole Integration

**Before (lines 562-567):**
```typescript
<div className="prose prose-sm prose-stone dark:prose-invert max-w-none [&>p]:my-2 ...">
  <ReactMarkdown>
    {sanitizeAIResponse(message.content)}
  </ReactMarkdown>
</div>
```

**After:**
```typescript
<ChatMessageContent content={message.content} />
```

**Also:**
- Remove the inline `sanitizeAIResponse()` function (lines 38-51)
- Add import: `import { ChatMessageContent } from '@/components/chat';`

---

## Pattern Detection Rules

The normalization layer uses pattern detection, NOT semantic inference:

| Pattern | Detection Method | Rendering |
|---------|------------------|-----------|
| Structured JSON | `/\{[\s\S]*?"type":\s*"contractor_recommendations"/` | `ContractorRecommendations` component |
| Section Labels | `/(?:^|\n)([A-Z][^:\n]{2,50}:)\s*(?=\n)/` | `SectionLabel` component |
| Bullet Lists | `/(?:^|\n)((?:•\s[^\n]+(?:\n|$))+)/` | `BulletList` component |
| Prose | Everything else after sanitization | ReactMarkdown |

---

## Error Handling

All parsing operations include graceful degradation:

```typescript
try {
  return parseContractorRecommendations(content);
} catch (error) {
  console.warn('Failed to parse contractor data:', error);
  return null; // Fallback: strip the tag, show nothing
}
```

**Rule:** Never show raw JSON/XML to users. If parsing fails, silently remove the structured content.

---

## Styling Alignment with Habitta Design System

Using existing Tailwind utilities and Habitta's calm aesthetic:

| Element | Tailwind Classes |
|---------|------------------|
| Card background | `bg-white dark:bg-card` |
| Card border | `border border-stone-200 dark:border-border` |
| Card radius | `rounded-lg` |
| Card hover | `hover:shadow-sm transition-shadow` |
| Rating stars | `text-amber-500` |
| Section label accent | `border-l-3 border-blue-600` |
| Bullet accent | `text-blue-600` |

---

## Implementation Order

**Phase 1: Core Utilities (Foundation)**
1. Create `src/lib/chatFormatting.ts` with extraction, sanitization, and normalization functions
2. Create `src/components/chat/index.ts` barrel export

**Phase 2: UI Components**
3. Create `ContractorCard.tsx`
4. Create `ContractorRecommendations.tsx`
5. Create `SectionLabel.tsx` and `BulletList.tsx`

**Phase 3: Smart Renderer**
6. Create `ChatMessageContent.tsx` that orchestrates all components

**Phase 4: Integration**
7. Modify `ChatConsole.tsx` to use new `ChatMessageContent`
8. Remove inline `sanitizeAIResponse()` function

---

## Testing Considerations

After implementation, verify:
- Contractor JSON blocks render as styled cards
- Section labels ("What this means for you:") display with accent bar
- Bullet points render as proper list elements
- Raw XML/JSON never appears in chat
- Existing artifact rendering (SystemValidationEvidence) still works
- Markdown bold, lists, and paragraphs still render correctly

