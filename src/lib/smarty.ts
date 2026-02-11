import { supabase } from "@/integrations/supabase/client";
import { invokeWithRetry } from "@/lib/supabaseRetry";

export interface AutocompleteOptions {
  search: string;
  cityFilter?: string;
  stateFilter?: string;
  limit?: number;
}

export interface AddressPayload {
  street: string;
  city: string;
  state: string;
  postal_code?: string;
  include?: string;
}

// Autocomplete is public (no JWT), no retry needed
export async function smartyAutocomplete(options: AutocompleteOptions) {
  const { data, error } = await supabase.functions.invoke('smarty-autocomplete', {
    body: options
  });

  if (error) {
    console.error('Smarty autocomplete error:', error);
    throw error;
  }

  return data;
}

export async function smartyStandardizeGeocode(addr: AddressPayload) {
  return invokeWithRetry('smarty-proxy', {
    body: { action: 'standardize_geocode', payload: addr }
  });
}

export async function smartyEnrich(addr: AddressPayload) {
  return invokeWithRetry('smarty-proxy', {
    body: { action: 'enrich', payload: addr }
  });
}

export async function smartyFinancialLookup(addr: AddressPayload) {
  return invokeWithRetry('smarty-proxy', {
    body: { action: 'financial_lookup', payload: addr }
  });
}

// Compute canonical hash for address deduplication
export function computeCanonicalHash(line1: string, city: string, state: string, postalCode: string): string {
  const normalized = [
    line1?.toUpperCase()?.trim() || '',
    city?.toUpperCase()?.trim() || '', 
    state?.toUpperCase()?.trim() || '',
    postalCode?.split('-')[0]?.trim() || '' // Remove +4 extension
  ].join('|');
  
  // Simple hash for client-side - server will use proper SHA256
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}