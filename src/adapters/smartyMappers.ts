export function mapStandardized(candidate: any) {
  // Pick first candidate if array
  const c = Array.isArray(candidate) ? candidate[0] : candidate;
  
  return {
    line1: c?.delivery_line_1 ?? "",
    line2: c?.delivery_line_2 ?? "",
    city: c?.components?.city_name ?? "",
    state: c?.components?.state_abbreviation ?? "",
    postal_code: `${c?.components?.zipcode ?? ""}${c?.components?.plus4_code ? "-" + c.components.plus4_code : ""}`,
    dpv_match: c?.analysis?.dpv_match ?? null,
    carrier_route: c?.metadata?.carrier_route ?? null,
    congressional_district: c?.metadata?.congressional_district ?? null,
    raw: c
  };
}

export function mapGeocode(geo: any) {
  const g = Array.isArray(geo) ? geo[0] : geo;
  
  return {
    latitude: g?.metadata?.latitude ?? null,
    longitude: g?.metadata?.longitude ?? null,
    precision: g?.metadata?.precision ?? null,
    raw: g
  };
}

export function mapEnrichment(en: any) {
  const e = Array.isArray(en) ? en[0] : en;
  const a = e?.attributes ?? e; // Depending on dataset structure
  
  return {
    attributes: {
      year_built: a?.year_built ?? null,
      square_feet: a?.square_feet ?? null,
      beds: a?.bedrooms ?? null,
      baths: a?.bathrooms ?? null,
      lot_size: a?.lot_size ?? null,
      property_type: a?.property_type ?? null,
      last_sale_price: a?.last_sale_price ?? null,
      last_sale_date: a?.last_sale_date ?? null
    },
    raw: e
  };
}

export function mapAutocompleteSuggestion(suggestion: any) {
  return {
    text: suggestion.text,
    street_line: suggestion.street_line,
    city: suggestion.city,
    state: suggestion.state,
    zipcode: suggestion.zipcode,
    secondary: suggestion.secondary
  };
}