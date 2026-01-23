
# Integrate Google Maps API for Property Location

## Overview

Replace the placeholder map visualization in `PropertyMap` with an actual Google Maps embed showing the property location with a marker.

---

## Approach: Google Maps Static API (Recommended)

For a dashboard context rail, the **Static Maps API** is the optimal choice because:
- No JavaScript SDK required (lighter weight)
- Works via simple image URL
- Can be proxied through an edge function (keeps API key secure)
- Fast loading, no interactivity overhead needed
- Perfect for "glanceable" location context

---

## Implementation

### 1. Create Static Map Edge Function

**Create**: `supabase/functions/google-static-map/index.ts`

This edge function will:
- Accept `lat`, `lng`, and optional `zoom` parameters
- Generate a signed Static Maps API URL
- Return the image or a redirect URL
- Keep the API key server-side (secure)

```typescript
// Parameters
- lat: number (required)
- lng: number (required)  
- zoom: number (default: 15)
- size: string (default: "400x200")
- maptype: string (default: "roadmap")

// Returns: Image URL or proxied image
```

### 2. Update PropertyMap Component

**Modify**: `src/components/dashboard-v3/PropertyMap.tsx`

Changes:
- Replace placeholder `div` with `img` that loads from edge function
- Add loading state with skeleton
- Add error fallback (graceful degradation to current placeholder)
- Preserve climate zone indicator below the map

```tsx
// Map image URL construction
const mapUrl = hasCoordinates 
  ? `${SUPABASE_URL}/functions/v1/google-static-map?lat=${lat}&lng=${lng}&zoom=15`
  : null;

// Render
{mapUrl ? (
  <img 
    src={mapUrl}
    alt={`Map of ${address}`}
    className="w-full h-full object-cover rounded-lg"
    onError={() => setMapError(true)}
  />
) : (
  <PlaceholderMap />
)}
```

### 3. API Key Considerations

Your existing `GOOGLE_PLACES_API_KEY` may already have Static Maps API enabled. If not, you'll need to enable the **Maps Static API** in Google Cloud Console for that key.

The edge function approach ensures the API key is never exposed to the client.

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/google-static-map/index.ts` | Create | Edge function to proxy Static Maps API |
| `supabase/config.toml` | Modify | Add function config with `verify_jwt = false` |
| `src/components/dashboard-v3/PropertyMap.tsx` | Modify | Replace placeholder with actual map image |

---

## Visual Result

```text
Property Location
┌────────────────────────────────────────┐
│                                        │
│    [Actual Google Map with marker]     │
│              📍                        │
│                                        │
└────────────────────────────────────────┘

🌡 High heat & humidity zone
Impacts HVAC, roof, and water heater lifespan
```

---

## Alternative: Google Maps Embed API

If you prefer an interactive map (pan/zoom), we could use the Maps Embed API instead:
- Also works via URL (iframe)
- Free for basic usage
- Slightly heavier than static image

Let me know if you prefer interactive over static.

---

## Technical Notes

- **Caching**: Static map images can be cached by the browser for performance
- **Responsive sizing**: Image scales with container via `object-cover`
- **Graceful fallback**: If API fails, falls back to current placeholder with coordinates
- **Climate overlay**: Preserved below the map (the "why it matters" context)
