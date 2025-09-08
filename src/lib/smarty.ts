import { supabase } from "@/integrations/supabase/client";

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
}

export async function smartyAutocomplete(options: AutocompleteOptions) {
  const { data, error } = await supabase.functions.invoke('smarty-proxy', {
    body: { 
      action: 'autocomplete', 
      payload: options 
    }
  });

  if (error) {
    console.error('Smarty autocomplete error:', error);
    throw error;
  }

  return data;
}

export async function smartyStandardizeGeocode(addr: AddressPayload) {
  const { data, error } = await supabase.functions.invoke('smarty-proxy', {
    body: { 
      action: 'standardize_geocode', 
      payload: addr 
    }
  });

  if (error) {
    console.error('Smarty standardize/geocode error:', error);
    throw error;
  }

  return data;
}

export async function smartyEnrich(addr: AddressPayload) {
  const { data, error } = await supabase.functions.invoke('smarty-proxy', {
    body: { 
      action: 'enrich', 
      payload: addr 
    }
  });

  if (error) {
    console.error('Smarty enrich error:', error);
    throw error;
  }

  return data;
}