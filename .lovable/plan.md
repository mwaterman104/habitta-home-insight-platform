

# Switch PropertyMap to Google Maps Static API (Refined)

## Current State Assessment

**Edge Function (`google-static-map`) - Already Has:**
- ✅ Explicit `markers=color:red|${lat},${lng}` param (line 54)
- ✅ Cache headers: `Cache-Control: public, max-age=86400` (line 79)  
- ✅ Returns non-200 status on Google API failure

**Needs Enhancement:**
- Content-type validation (Google can return 200 with error image)
- Size sanity check (error images are typically < 1KB)

---

## Phase 1: Harden Edge Function

**File: `supabase/functions/google-static-map/index.ts`**

Add response validation before returning the image:

| Check | Purpose |
|-------|---------|
| Content-Type header | Ensure Google returned `image/png` not `text/html` error page |
| Image size > 1KB | Google error images are tiny; valid maps are larger |
| Explicit error detection | Look for known error patterns |

```typescript
// After fetching from Google
const contentType = mapResponse.headers.get('content-type');
if (!contentType?.includes('image/')) {
  console.error('[google-static-map] Invalid content-type:', contentType);
  return new Response(
    JSON.stringify({ error: 'Invalid map response' }),
    { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

const imageBuffer = await mapResponse.arrayBuffer();

// Sanity check: Google error images are very small
if (imageBuffer.byteLength < 1024) {
  console.error('[google-static-map] Suspiciously small image:', imageBuffer.byteLength);
  return new Response(
    JSON.stringify({ error: 'Map service returned invalid image' }),
    { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

---

## Phase 2: Simplify PropertyMap Component

**File: `src/components/dashboard-v3/PropertyMap.tsx`**

Replace current OSM tile logic with Google Static Maps edge function. Per QA guidance, use a **two-step fallback** (not three):

```text
1. Google Static Map (via edge function)
   ↓ onError (HTTP error or load failure)
2. Coordinate placeholder with climate badge
```

**Remove:**
- OSM tile fallback (adds complexity, still has centering issues)
- Manual `MapPin` overlay (Google marker handles this)
- `getOsmTileUrl()` function
- `getStaticMapUrl()` function (unused Geoapify code)

**Add:**
- `getGoogleMapUrl()` - builds edge function URL
- `useMemo` for URL stability (prevents re-renders from regenerating URLs)

### New URL Generator

```typescript
const getGoogleMapUrl = useMemo(() => {
  if (!lat || !lng) return null;
  
  const params = new URLSearchParams({
    lat: lat.toString(),
    lng: lng.toString(),
    zoom: '16',
    size: '640x360',
    scale: '2',
    maptype: 'roadmap'
  });
  
  return `https://vbcsuoubxyhjhxcgrqco.supabase.co/functions/v1/google-static-map?${params}`;
}, [lat, lng]);
```

**Key:** Using `useMemo` ensures the URL is stable and doesn't regenerate on every render, respecting browser caching and avoiding unnecessary requests.

---

## Phase 3: Improve Climate Badge Contrast

**Current:** `bg-background/90 backdrop-blur-sm`

Google Maps have busier backgrounds than OSM tiles. Enhance for readability:

```typescript
<div className="absolute bottom-2 left-2 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-md border border-black/5">
  <ClimateIcon className="h-3.5 w-3.5 text-muted-foreground" />
  <span className="text-xs font-semibold text-foreground">{climate.label}</span>
</div>
```

**Changes:**
- Higher opacity: `bg-white/95` (was `/90`)
- Stronger blur: `backdrop-blur-md` (was `-sm`)
- Added border: `border border-black/5`
- Bolder text: `font-semibold` (was `font-medium`)
- Explicit z-index: `z-20`
- Slightly larger padding for touch targets

---

## Files Summary

| File | Action | Changes |
|------|--------|---------|
| `supabase/functions/google-static-map/index.ts` | Modify | Add content-type validation, size sanity check |
| `src/components/dashboard-v3/PropertyMap.tsx` | Modify | Switch to Google Maps, remove OSM, simplify fallback, enhance badge |

---

## Technical Details

### Visual Improvements

| Aspect | OSM (Current) | Google (After) |
|--------|---------------|----------------|
| Centering | Single tile, offset | Exact coordinates |
| Marker | Manual overlay | Native red marker |
| Resolution | 256x256 tile | 640x360 @ 2x scale |
| Labels | Limited | Full street names |
| Consistency | Varies by tile | Predictable |

### Fallback Behavior

```text
Coordinates present?
├── Yes → Load Google Static Map
│         ├── Success → Show map with marker
│         └── Error → Show coordinate placeholder
│                     (calm, no error banners)
└── No → Show climate gradient placeholder
         (enrichment may be in progress)
```

### Edge Function Defaults (Server-Side)

The edge function already enforces sensible defaults:
- `zoom: '15'` (overridden to 16 by client)
- `size: '400x200'` (overridden to 640x360 by client)
- `scale: '2'` (retina)
- `maptype: 'roadmap'`

### Caching Strategy

1. **Browser caching:** Edge function returns `Cache-Control: public, max-age=86400` (24 hours)
2. **React stability:** `useMemo` prevents URL regeneration between renders
3. **CDN caching:** Supabase edge functions support edge caching

---

## Product Behavior

**When map loads successfully:**
- High-resolution Google Map with red marker centered on property
- Climate zone badge (e.g., "High heat & humidity zone") in bottom-left
- Smooth fade-in transition

**When map fails to load:**
- Shows simple coordinate placeholder: `26.6234, -80.2156`
- Climate badge still visible
- No error banners or alerts

**When coordinates are missing:**
- Shows climate-appropriate gradient background
- Address text (if available)
- Climate badge
- Background enrichment may be running

This maintains Habitta's "calm even when incomplete" design philosophy.

