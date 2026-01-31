

# Google Places Contractor Discovery — Trust-Aligned Implementation Plan

## Overview

This plan replaces hallucinated contractor recommendations with real Google Places data while treating the feature as a **discovery aid, not an endorsement engine**. The implementation incorporates explicit liability guardrails, neutral framing, and honest provenance disclosure.

---

## Problem Being Solved

**Current state (broken)**:
```typescript
case 'get_contractor_recommendations':
  return `For ${parsedArgs.service_type} services, I recommend getting quotes from 3 licensed contractors...`;
```

This is a credibility leak — generic advice pretending to be intelligence.

**Target state**:
Real businesses from Google Places, rendered as structured cards with explicit provenance disclosure.

---

## Trust Doctrine Alignment

| Risk | Mitigation |
|------|------------|
| Implied endorsement | Mandatory disclaimer: "Habitta does not vet or endorse contractors" |
| Ranking bias | No numbering, no "top/best" language, labeled as "options" |
| False specialty inference | Renamed `specialty` → `category`, labeled "Listed as" |
| Authority creep | Confidence field locked to `discovery_only` |
| Hallucination fallback | Always return structured JSON, even on failure |

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/ai-home-assistant/index.ts` | Add Google Places lookup, modify tool handler, add home location to context |
| `src/lib/chatFormatting.ts` | Update types to match new contract, add disclaimer/message handling |
| `src/components/chat/ContractorCard.tsx` | Rename `specialty` → `category`, update display labels |
| `src/components/chat/ContractorRecommendations.tsx` | Add mandatory disclaimer, rename header, handle empty state |

---

## Technical Section

### 1. Revised Data Contract (JSON)

```typescript
// This is the contract the tool will return
interface ContractorDiscoveryResponse {
  type: 'contractor_recommendations';
  service: string;
  disclaimer: string; // Always present
  confidence: 'discovery_only'; // Future-proofing
  contractors: ContractorResult[];
  message?: string; // For empty state or notes
}

interface ContractorResult {
  name: string;
  rating: number;
  reviewCount: number;
  category: string; // Was "specialty" — now descriptive only
  location: string;
  websiteUri?: string;
  phone?: string;
}
```

### 2. Edge Function Changes (`ai-home-assistant/index.ts`)

**2.1 Add Home Location to Property Context**

Modify `getPropertyContext()` to fetch coordinates:

```typescript
async function getPropertyContext(supabase: any, propertyId: string) {
  const [
    { data: systems },
    { data: recommendations },
    { data: predictions },
    { data: home }
  ] = await Promise.all([
    supabase.from('system_lifecycles').select('*').eq('property_id', propertyId),
    supabase.from('smart_recommendations').select('*').eq('property_id', propertyId).eq('is_completed', false).limit(5),
    supabase.from('prediction_accuracy').select('*').eq('property_id', propertyId).limit(3),
    supabase.from('homes').select('latitude, longitude, city, state, zip_code').eq('id', propertyId).single()
  ]);

  return {
    systems: systems || [],
    activeRecommendations: recommendations || [],
    recentPredictions: predictions || [],
    homeLocation: home ? {
      lat: home.latitude,
      lng: home.longitude,
      city: home.city,
      state: home.state,
      zipCode: home.zip_code
    } : null
  };
}
```

**2.2 Add Google Places Search Function**

```typescript
// Contractor recommendations are discovery aids only.
// No ranking, endorsement, or quality judgment is implied.

interface GooglePlaceResult {
  name: string;
  rating: number;
  userRatingCount: number;
  formattedAddress: string;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  types?: string[];
}

async function searchLocalContractors(
  serviceType: string,
  location: { lat: number; lng: number; city: string; state: string }
): Promise<GooglePlaceResult[]> {
  const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!apiKey) {
    console.error('[searchLocalContractors] GOOGLE_PLACES_API_KEY not configured');
    return [];
  }

  // Map service types to search queries
  const searchQueries: Record<string, string> = {
    'hvac': 'HVAC contractor',
    'water_heater': 'plumber water heater',
    'plumbing': 'licensed plumber',
    'electrical': 'licensed electrician',
    'roof': 'roofing contractor',
    'roofing': 'roofing contractor',
    'general': 'home repair contractor'
  };

  const query = searchQueries[serviceType.toLowerCase()] || `${serviceType} contractor`;
  const fullQuery = `${query} near ${location.city}, ${location.state}`;

  console.log('[searchLocalContractors] Searching:', fullQuery);

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.rating,places.userRatingCount,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.types'
      },
      body: JSON.stringify({
        textQuery: fullQuery,
        locationBias: {
          circle: {
            center: { latitude: location.lat, longitude: location.lng },
            radius: 40000.0  // 40km radius
          }
        },
        minRating: 4.0,  // Only 4+ star businesses
        pageSize: 5,
        rankPreference: 'RELEVANCE',
        regionCode: 'US',
        languageCode: 'en'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[searchLocalContractors] API error:', response.status, error);
      return [];
    }

    const data = await response.json();
    console.log('[searchLocalContractors] Found', data.places?.length || 0, 'results');
    
    return (data.places || []).map((place: any) => ({
      name: place.displayName?.text || 'Unknown',
      rating: place.rating || 0,
      userRatingCount: place.userRatingCount || 0,
      formattedAddress: place.formattedAddress || '',
      websiteUri: place.websiteUri,
      nationalPhoneNumber: place.nationalPhoneNumber,
      types: place.types
    }));
  } catch (error) {
    console.error('[searchLocalContractors] Error:', error);
    return [];
  }
}
```

**2.3 Category Mapper (Neutral, Not Inferential)**

```typescript
function mapToCategory(types: string[] | undefined, fallbackService: string): string {
  if (!types || types.length === 0) {
    return fallbackService.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  
  // Map Google place types to readable categories (descriptive, not authoritative)
  const categoryMap: Record<string, string> = {
    'plumber': 'Plumber',
    'electrician': 'Electrician',
    'roofing_contractor': 'Roofing Contractor',
    'hvac_contractor': 'HVAC Contractor',
    'general_contractor': 'General Contractor',
    'home_improvement_store': 'Home Improvement',
    'air_conditioning_contractor': 'HVAC Contractor',
    'heating_equipment_supplier': 'Heating Supplier'
  };

  for (const type of types) {
    if (categoryMap[type]) return categoryMap[type];
  }
  
  return fallbackService.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
```

**2.4 Updated Tool Handler**

```typescript
case 'get_contractor_recommendations': {
  const location = context?.homeLocation;
  
  // Always return structured JSON, even on failure
  const baseResponse = {
    type: 'contractor_recommendations',
    service: parsedArgs.service_type,
    disclaimer: 'Sourced from Google Places. Habitta does not vet or endorse contractors.',
    confidence: 'discovery_only'
  };
  
  if (!location?.lat || !location?.lng) {
    return JSON.stringify({
      ...baseResponse,
      contractors: [],
      message: 'Unable to find contractors — home location not available. Please update your home address.'
    });
  }

  const results = await searchLocalContractors(parsedArgs.service_type, location);
  
  if (results.length === 0) {
    return JSON.stringify({
      ...baseResponse,
      contractors: [],
      message: 'No highly-rated local results were found in this area.',
      suggestion: 'You can try a related service category or broaden your search.'
    });
  }

  // Return structured JSON — formatting layer handles presentation
  return JSON.stringify({
    ...baseResponse,
    contractors: results.slice(0, 3).map(r => ({
      name: r.name,
      rating: r.rating,
      reviewCount: r.userRatingCount,
      category: mapToCategory(r.types, parsedArgs.service_type),
      location: r.formattedAddress.split(',')[0], // First part only (street)
      websiteUri: r.websiteUri,
      phone: r.nationalPhoneNumber
    }))
  });
}
```

### 3. Formatting Layer Updates (`src/lib/chatFormatting.ts`)

**3.1 Updated Types**

```typescript
export interface ContractorRecommendation {
  name: string;
  rating: number;
  reviewCount: number;
  category: string;
  location: string;
  websiteUri?: string;
  phone?: string;
}

export interface ExtractedStructuredData {
  contractors?: {
    service?: string;
    disclaimer: string;
    confidence: string;
    items: ContractorRecommendation[];
    message?: string;
    suggestion?: string;
  };
}
```

**3.2 Updated Extraction Logic**

Modify `extractContractorData()` to handle new fields:

```typescript
function extractContractorData(content: string): {
  contractors?: { 
    service?: string; 
    disclaimer: string;
    confidence: string;
    items: ContractorRecommendation[];
    message?: string;
    suggestion?: string;
  };
  cleanedContent: string;
} {
  const jsonPattern = /\{[\s\S]*?"type":\s*"contractor_recommendations"[\s\S]*?\}/g;
  
  let cleanedContent = content;
  let contractors: /* type */ | undefined;
  
  const matches = content.match(jsonPattern);
  if (matches) {
    for (const match of matches) {
      try {
        const data = JSON.parse(match);
        if (data.type === 'contractor_recommendations') {
          const validContractors = (data.contractors || []).filter(
            (c: unknown): c is ContractorRecommendation =>
              typeof c === 'object' &&
              c !== null &&
              typeof (c as ContractorRecommendation).name === 'string' &&
              typeof (c as ContractorRecommendation).rating === 'number' &&
              typeof (c as ContractorRecommendation).category === 'string'
          );
          
          contractors = {
            service: data.service,
            disclaimer: data.disclaimer || 'Sourced from Google Places. Habitta does not vet or endorse contractors.',
            confidence: data.confidence || 'discovery_only',
            items: validContractors,
            message: data.message,
            suggestion: data.suggestion
          };
        }
        cleanedContent = cleanedContent.replace(match, '');
      } catch (e) {
        console.warn('Failed to parse contractor JSON:', e);
        cleanedContent = cleanedContent.replace(match, '');
      }
    }
  }
  
  return { contractors, cleanedContent };
}
```

### 4. Component Updates

**4.1 ContractorCard.tsx**

```typescript
interface ContractorCardProps {
  name: string;
  rating: number;
  reviewCount: number;
  category: string;
  location: string;
  websiteUri?: string;
  phone?: string;
  className?: string;
}

export function ContractorCard({
  name,
  rating,
  reviewCount,
  category,
  location,
  className,
}: ContractorCardProps) {
  const fullStars = Math.floor(rating);
  
  return (
    <div className={cn(
      'bg-card border border-border rounded-lg p-4 hover:shadow-sm transition-shadow',
      className
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
        <h4 className="font-semibold text-foreground text-sm leading-tight truncate">
          {name}
        </h4>
      </div>
      
      {/* Rating line: ⭐ 4.9 · 127 Google reviews */}
      <div className="flex items-center gap-1 mb-2">
        <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
        <span className="text-sm font-medium text-foreground">{rating}</span>
        <span className="text-sm text-muted-foreground">
          · {reviewCount} Google reviews
        </span>
      </div>
      
      {/* Category line: Listed as: Plumber */}
      <div className="mb-2 text-sm">
        <span className="text-muted-foreground">Listed as: </span>
        <span className="text-foreground">{category}</span>
      </div>
      
      {/* Location line */}
      <p className="text-sm text-muted-foreground">
        Near {location}
      </p>
    </div>
  );
}
```

**4.2 ContractorRecommendations.tsx**

```typescript
interface ContractorRecommendationsProps {
  service?: string;
  disclaimer: string;
  contractors: ContractorRecommendation[];
  message?: string;
  suggestion?: string;
}

export function ContractorRecommendations({
  service,
  disclaimer,
  contractors,
  message,
  suggestion,
}: ContractorRecommendationsProps) {
  // Empty state
  if (!contractors || contractors.length === 0) {
    if (!message) return null;
    
    return (
      <section className="my-3 p-4 bg-muted/50 rounded-lg" aria-label="Contractor Search Results">
        <p className="text-sm text-muted-foreground">{message}</p>
        {suggestion && (
          <p className="text-sm text-muted-foreground mt-1">{suggestion}</p>
        )}
      </section>
    );
  }
  
  return (
    <section className="my-3" aria-label="Local Contractor Options">
      {/* Neutral header — no "Recommended" */}
      <div className="flex items-center gap-2 mb-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold text-foreground text-sm">
          Local contractor options
        </h3>
      </div>
      
      {/* Mandatory disclaimer — ALWAYS visible */}
      <p className="text-xs text-muted-foreground mb-3">
        {disclaimer}
      </p>
      
      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {contractors.map((contractor, index) => (
          <ContractorCard
            key={`${contractor.name}-${index}`}
            {...contractor}
          />
        ))}
      </div>
    </section>
  );
}
```

**4.3 ChatMessageContent.tsx Update**

Pass new fields through to component:

```typescript
{structuredData.contractors && (
  <ContractorRecommendations
    service={structuredData.contractors.service}
    disclaimer={structuredData.contractors.disclaimer}
    contractors={structuredData.contractors.items}
    message={structuredData.contractors.message}
    suggestion={structuredData.contractors.suggestion}
  />
)}
```

---

## UI Copy Governance

**What we say:**
- "Local contractor options"
- "Listed as"
- "Google reviews"
- "Near [location]"

**What we never say:**
- "Recommended"
- "Best" / "Top"
- "Trusted" / "Expert"
- "Habitta approved"
- "Specialist"

---

## Edge Cases

| Scenario | Response |
|----------|----------|
| No home coordinates | Return structured JSON with message: "Unable to find contractors — home location not available." |
| Google API error | Log error, return empty contractors with neutral message |
| No results (rare area) | Return message + suggestion to broaden search |
| API key not configured | Log error, return empty contractors with generic message |

---

## Implementation Order

1. Update `getPropertyContext()` to include home location
2. Add `searchLocalContractors()` function
3. Add `mapToCategory()` helper
4. Update `handleFunctionCall()` for `get_contractor_recommendations`
5. Update types in `chatFormatting.ts`
6. Update extraction logic in `chatFormatting.ts`
7. Update `ContractorCard.tsx` with new field names and UI
8. Update `ContractorRecommendations.tsx` with disclaimer and empty state
9. Update `ChatMessageContent.tsx` to pass new props
10. Deploy edge function and test

---

## Testing Checklist

After implementation:
- [ ] Contractors are real businesses from Google
- [ ] Disclaimer is always visible above cards
- [ ] No "recommended" or "best" language anywhere
- [ ] Empty state renders gracefully with message
- [ ] Cards show "Listed as" not "Specialty"
- [ ] Rating shows "X Google reviews" not "/5"
- [ ] Location shows "Near [street]" format
- [ ] Works for properties with and without coordinates

