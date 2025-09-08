// Safe property access helper
const safe = (obj: any, path: string, defaultValue: any = null) => {
  return obj?.[path] ?? defaultValue;
};

export function mapStandardized(candidate: any) {
  // Pick first candidate if array, handle null/undefined
  const c = Array.isArray(candidate) ? candidate[0] : candidate ?? {};
  
  return {
    line1: safe(c, 'delivery_line_1', ''),
    line2: safe(c, 'delivery_line_2', ''),
    city: safe(c?.components, 'city_name', ''),
    state: safe(c?.components, 'state_abbreviation', ''),
    postal_code: `${safe(c?.components, 'zipcode', '')}${c?.components?.plus4_code ? '-' + c.components.plus4_code : ''}`,
    dpv_match: safe(c?.analysis, 'dpv_match'),
    carrier_route: safe(c?.metadata, 'carrier_route'),
    congressional_district: safe(c?.metadata, 'congressional_district'),
    raw: c
  };
}

export function mapGeocode(geo: any) {
  const g = Array.isArray(geo) ? geo[0] : geo ?? {};
  
  return {
    latitude: safe(g?.metadata, 'latitude'),
    longitude: safe(g?.metadata, 'longitude'), 
    precision: safe(g?.metadata, 'precision'),
    raw: g
  };
}

export function mapEnrichment(en: any) {
  const e = Array.isArray(en) ? en[0] : en ?? {};
  const a = e?.attributes ?? e ?? {}; // Handle different dataset structures
  
  return {
    attributes: {
      year_built: safe(a, 'year_built'),
      square_feet: safe(a, 'square_feet'),
      beds: safe(a, 'bedrooms'),
      baths: safe(a, 'bathrooms'),
      lot_size: safe(a, 'lot_size'),
      property_type: safe(a, 'property_type'),
      last_sale_price: safe(a, 'last_sale_price'),
      last_sale_date: safe(a, 'last_sale_date')
    },
    raw: e
  };
}

export function mapAutocompleteSuggestion(suggestion: any) {
  const s = suggestion ?? {};
  return {
    text: safe(s, 'text', ''),
    street_line: safe(s, 'street_line', ''),
    city: safe(s, 'city', ''),
    state: safe(s, 'state', ''),
    zipcode: safe(s, 'zipcode', ''),
    secondary: safe(s, 'secondary', '')
  };
}