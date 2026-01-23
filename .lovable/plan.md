

# Fix PropertyMap - Switch to Leaflet + OpenStreetMap

## Problem Diagnosis

The current Google Maps Embed API implementation is failing because:

1. **Deprecated URL format**: The URL `https://maps.google.com/maps?q=lat,lng&output=embed` is an older format that Google no longer fully supports
2. **API key required**: The modern Google Maps Embed API (`/maps/embed/v1/`) requires a valid API key
3. **The iframe loads but displays a "search results" page instead of a map**, which is why you see the address text centered

The database confirms valid coordinates exist for all homes (e.g., Miami: `25.8444436, -80.2237496`).

---

## Solution: Leaflet + OpenStreetMap

Switch to Leaflet.js with OpenStreetMap tiles. This is:

- **Free** - No API key required
- **Reliable** - OpenStreetMap is the standard open-source mapping solution
- **Interactive** - Users can pan/zoom (optional)
- **Lightweight** - ~40KB gzipped

---

## Implementation

### 1. Install Dependencies

Add `react-leaflet` and `leaflet`:

```bash
npm install react-leaflet leaflet
npm install -D @types/leaflet
```

### 2. Add Leaflet CSS

**File**: `index.html`

Add the Leaflet CSS in the `<head>`:

```html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
  crossorigin="" />
```

### 3. Rewrite PropertyMap Component

**File**: `src/components/dashboard-v3/PropertyMap.tsx`

Replace the iframe approach with Leaflet:

```typescript
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon (Leaflet quirk with bundlers)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Component to recenter map when coordinates change
function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 15);
  }, [lat, lng, map]);
  return null;
}

export function PropertyMap({ lat, lng, city, state, className }: PropertyMapProps) {
  const hasCoordinates = lat != null && lng != null;
  const climate = deriveClimateZone(state, city, lat);
  const ClimateIcon = climate.icon;

  if (!hasCoordinates) {
    // Fallback placeholder (keep existing code)
    return <FallbackPlaceholder ... />;
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="aspect-video relative">
        <MapContainer
          center={[lat, lng]}
          zoom={15}
          scrollWheelZoom={false}
          className="h-full w-full z-0"
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[lat, lng]} />
          <MapRecenter lat={lat} lng={lng} />
        </MapContainer>
        
        {/* Climate zone overlay badge */}
        <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/90 backdrop-blur-sm shadow-sm pointer-events-none">
          <ClimateIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">{climate.label}</span>
        </div>
      </div>
    </Card>
  );
}
```

Key changes:
- Uses `MapContainer` from react-leaflet
- OpenStreetMap tiles (free, no API key)
- Includes a marker at the property location
- `scrollWheelZoom={false}` prevents accidental zooming
- `MapRecenter` component handles coordinate changes
- Climate badge overlay preserved

### 4. Alternative: Static Image (No Dependencies)

If you prefer zero dependencies, use OpenStreetMap's static image service via a simple `<img>` tag:

```typescript
const mapUrl = hasCoordinates
  ? `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=640x360&markers=${lat},${lng},red-pushpin`
  : null;

return (
  <img 
    src={mapUrl} 
    alt={`Map of ${address}`}
    className="w-full h-full object-cover"
    onError={() => setIframeError(true)}
  />
);
```

This is simpler but less interactive.

---

## Recommendation

**Use Leaflet (Option 3)** because:
- Provides the best user experience (interactive, familiar)
- No API keys needed
- Industry-standard solution
- Works reliably across all browsers

The static image option is a good fallback if you want to minimize dependencies.

---

## Files to Change

| File | Change |
|------|--------|
| `package.json` | Add `react-leaflet` and `leaflet` dependencies |
| `index.html` | Add Leaflet CSS link |
| `src/components/dashboard-v3/PropertyMap.tsx` | Replace iframe with Leaflet MapContainer |

---

## Post-Implementation

After this change:
- Maps will render for all properties with valid coordinates
- Users can pan and zoom the map
- Climate zone badge continues to appear as an overlay
- Fallback placeholder shows when coordinates are missing

