import { supabase } from '@/integrations/supabase/client';

// Property history API service
export interface PropertyHistory {
  address: string;
  saleHistory: Array<{
    date: string;
    price: number;
    type: string;
  }>;
  propertyDetails: {
    yearBuilt: number;
    sqft: number;
    bedrooms: number;
    bathrooms: number;
    propertyType: string;
  };
  extendedDetails?: {
    lot: {
      sizeAcres: number;
      sizeSqFt: number;
      hasPool: boolean;
    };
    building: {
      condition: string;
      quality: string;
      constructionType: string;
      roofMaterial: string;
      wallType: string;
      levels: number;
      garageSize: number;
    };
    utilities: {
      cooling: string;
      heatingFuel: string;
      heatingType: string;
    };
    location: {
      latitude: number;
      longitude: number;
      subdivision: string;
      municipality: string;
    };
    ownership: {
      ownerOccupied: boolean;
      propertyClass: string;
      landUse: string;
    };
    assessment: {
      apn: string;
      taxCode: string;
    };
  };
  normalizedProfile?: {
    effectiveYearBuilt: number;
    buildQuality: string | null;
    archStyle: string | null;
    grossSqft: number | null;
    roomsTotal: number | null;
    dataMatchConfidence: string;
    fipsCode: string | null;
    lastSale?: {
      amount: number | null;
      date: string | null;
      pricePerSqft: number | null;
    };
  };
  lastUpdated: string;
  _attomData?: any; // Raw Attom API data for additional details
}

export const getPropertyHistory = async (address: string): Promise<PropertyHistory> => {
  try {
    console.log('Fetching property data for:', address);
    
    const { data, error } = await supabase.functions.invoke('attom-property', {
      body: { address }
    });

    if (error) {
      console.error('Supabase function error:', error);
      throw new Error(`Property API Error: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from property API');
    }

    return data;
  } catch (error) {
    console.error('Error fetching property history:', error);
    if (error instanceof Error) {
      throw new Error(`Property API Error: ${error.message}`);
    }
    throw new Error('Failed to fetch property history');
  }
};