import { useState, useEffect } from 'react';
import { smartyFinancialLookup } from '@/lib/smarty';
import type { AddressPayload } from '@/lib/smarty';
import { useUserHome } from '@/hooks/useUserHome';

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

const toNum = (v: any): number | undefined => {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

export function useSmartyFinancialData() {
  const { fullAddress } = useUserHome();
  const [data, setData] = useState<SmartyFinancialData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFinancialData = async (addr: AddressPayload) => {
    if (!addr.street || !addr.city || !addr.state) {
      setError('No address on file');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const result = await smartyFinancialLookup(addr);
      clearTimeout(timeout);

      const records = Array.isArray(result) ? result : (result?.results || []);
      if (Array.isArray(records) && records.length > 0) {
        const financial = records[0];
        const attributes = financial?.attributes || financial;
        console.log('Financial attributes:', attributes);

        setData({
          avm_value: toNum(attributes?.avm_value) ?? toNum(attributes?.total_market_value),
          avm_confidence: attributes?.avm_confidence,
          avm_date: attributes?.avm_date,
          market_value: toNum(attributes?.market_value) ?? toNum(attributes?.total_market_value),
          assessed_value: toNum(attributes?.assessed_value),
          tax_value: toNum(attributes?.tax_value),
          last_sale_price: toNum(attributes?.sale_amount) ?? toNum(attributes?.last_sale_price),
          last_sale_date: attributes?.sale_date || attributes?.last_sale_date,
          price_per_sqft: toNum(attributes?.price_per_sqft),
          value_range_low: toNum(attributes?.value_range_low),
          value_range_high: toNum(attributes?.value_range_high),
          raw: financial,
        });
      } else {
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
    const parts = addressString.split(',').map((p) => p.trim());
    if (parts.length < 3) return { street: '', city: '', state: '' };
    const street = parts[0];
    const city = parts[1];
    const stateZip = parts[2].split(' ').filter(Boolean);
    const state = stateZip[0];
    const postal_code = stateZip[1];
    return { street, city, state, postal_code };
  };

  useEffect(() => {
    if (!fullAddress) {
      setError('No address on file');
      setLoading(false);
      return;
    }
    const addr = parseAddress(fullAddress);
    fetchFinancialData(addr);
  }, [fullAddress]);

  const refetch = () => {
    if (!fullAddress) return;
    const addr = parseAddress(fullAddress);
    fetchFinancialData(addr);
  };

  return { data, loading, error, refetch };
}
