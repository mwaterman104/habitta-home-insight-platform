import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PropertyHistory } from '@/lib/propertyAPI';

interface UseAttomPropertyResult {
  data: PropertyHistory | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useAttomProperty = (address: string): UseAttomPropertyResult => {
  const [data, setData] = useState<PropertyHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPropertyData = async () => {
    if (!address || address.trim().length === 0) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    console.log('Fetching Attom property data for:', address);
    setLoading(true);
    setError(null);

    try {
      const { data: attomData, error: attomError } = await supabase.functions.invoke('attom-property', {
        body: { address: address.trim() }
      });

      if (attomError) {
        console.error('Supabase function error:', attomError);
        throw new Error(`Property API Error: ${attomError.message}`);
      }

      if (!attomData) {
        throw new Error('No property data returned from Attom API');
      }

      console.log('Successfully fetched Attom property data:', {
        address: attomData.address,
        yearBuilt: attomData.propertyDetails?.yearBuilt,
        sqft: attomData.propertyDetails?.sqft,
        bedrooms: attomData.propertyDetails?.bedrooms,
        bathrooms: attomData.propertyDetails?.bathrooms
      });

      setData(attomData);
    } catch (err: any) {
      console.error('Error fetching Attom property data:', err);
      setError(err.message || 'Failed to fetch property data');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const refetch = async () => {
    await fetchPropertyData();
  };

  useEffect(() => {
    fetchPropertyData();
  }, [address]);

  return {
    data,
    loading,
    error,
    refetch
  };
};