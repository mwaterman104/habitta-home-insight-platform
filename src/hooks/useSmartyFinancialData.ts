import { useState, useEffect } from 'react';
import { smartyFinancialLookup, AddressPayload } from '@/lib/smarty';

export interface SmartyFinancialData {
  avm_value?: number;
  avm_confidence?: string;
  avm_date?: string;
  market_value?: number;
  assessed_value?: number;
  tax_value?: number;
  last_sale_price?: number;
  last_sale_date?: string;
  price_per_sqft?: number;
  value_range_low?: number;
  value_range_high?: number;
  raw?: any;
}

export function useSmartyFinancialData(address: string) {
  const [data, setData] = useState<SmartyFinancialData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFinancialData = async (addr: AddressPayload) => {
    if (!addr.street || !addr.city || !addr.state) {
      console.log('Missing address components:', addr);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('Calling smartyFinancialLookup with:', addr);
      const result = await smartyFinancialLookup(addr);
      console.log('Financial lookup result:', result);
      
      if (result && Array.isArray(result) && result.length > 0) {
        const financial = result[0];
        const attributes = financial?.attributes || financial;
        
        console.log('Financial attributes:', attributes);
        
        setData({
          avm_value: attributes?.avm_value,
          avm_confidence: attributes?.avm_confidence,
          avm_date: attributes?.avm_date,
          market_value: attributes?.market_value,
          assessed_value: attributes?.assessed_value,
          tax_value: attributes?.tax_value,
          last_sale_price: attributes?.last_sale_price,
          last_sale_date: attributes?.last_sale_date,
          price_per_sqft: attributes?.price_per_sqft,
          value_range_low: attributes?.value_range_low,
          value_range_high: attributes?.value_range_high,
          raw: financial
        });
      } else {
        console.log('No financial data returned');
        setData(null);
      }
    } catch (err) {
      console.error('Failed to fetch financial data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch financial data');
    } finally {
      setLoading(false);
    }
  };

  const parseAddress = (addressString: string): AddressPayload => {
    const parts = addressString.split(',').map(p => p.trim());
    if (parts.length < 3) {
      return { street: '', city: '', state: '' };
    }
    
    const street = parts[0];
    const city = parts[1];
    const stateZip = parts[2].split(' ');
    const state = stateZip[0];
    const postal_code = stateZip[1];
    
    return { street, city, state, postal_code };
  };

  useEffect(() => {
    if (address) {
      const addr = parseAddress(address);
      fetchFinancialData(addr);
    }
  }, [address]);

  const refetch = () => {
    if (address) {
      const addr = parseAddress(address);
      fetchFinancialData(addr);
    }
  };

  return { data, loading, error, refetch };
}