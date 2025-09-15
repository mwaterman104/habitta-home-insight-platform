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
  // Mortgage data
  loan_amount?: number;
  mortgage_amount_2?: number;
  mortgage_start_date?: string;
  mortgage_start_date_2?: string;
  mortgage_due_date?: string;
  mortgage_due_date_2?: string;
  mortgage_term?: number;
  mortgage_term_2?: number;
  mortgage_type?: string;
  mortgage_type_2?: string;
  interest_rate?: number;
  interest_rate_2?: number;
  // Lender information
  lender_name?: string;
  lender_name_2?: string;
  lender_address?: string;
  lender_city?: string;
  lender_state?: string;
  lender_zip?: string;
  // Calculated fields
  estimated_current_balance?: number;
  estimated_current_balance_2?: number;
  total_estimated_mortgage_balance?: number;
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

        // Calculate current mortgage balances if mortgage data exists
        const loanAmount = toNum(attributes?.loan_amount);
        const loanAmount2 = toNum(attributes?.mortgage_amount_2);
        const startDate = attributes?.mortgage_start_date;
        const startDate2 = attributes?.mortgage_start_date_2;
        const term = toNum(attributes?.mortgage_term);
        const term2 = toNum(attributes?.mortgage_term_2);

        let estimatedBalance = 0;
        let estimatedBalance2 = 0;

        // Calculate remaining balance for primary mortgage
        if (loanAmount && startDate && term) {
          const yearsElapsed = new Date().getFullYear() - new Date(startDate).getFullYear();
          const remainingYears = Math.max(0, term - yearsElapsed);
          // Simple estimation: assume standard amortization (rough approximation)
          estimatedBalance = remainingYears > 0 ? loanAmount * (remainingYears / term) * 0.8 : 0;
        }

        // Calculate remaining balance for secondary mortgage
        if (loanAmount2 && startDate2 && term2) {
          const yearsElapsed2 = new Date().getFullYear() - new Date(startDate2).getFullYear();
          const remainingYears2 = Math.max(0, term2 - yearsElapsed2);
          estimatedBalance2 = remainingYears2 > 0 ? loanAmount2 * (remainingYears2 / term2) * 0.8 : 0;
        }

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
          // Mortgage data
          loan_amount: loanAmount,
          mortgage_amount_2: loanAmount2,
          mortgage_start_date: startDate,
          mortgage_start_date_2: startDate2,
          mortgage_due_date: attributes?.mortgage_due_date,
          mortgage_due_date_2: attributes?.mortgage_due_date_2,
          mortgage_term: term,
          mortgage_term_2: term2,
          mortgage_type: attributes?.mortgage_type,
          mortgage_type_2: attributes?.mortgage_type_2,
          interest_rate: toNum(attributes?.interest_rate),
          interest_rate_2: toNum(attributes?.interest_rate_2),
          // Lender information
          lender_name: attributes?.lender_name,
          lender_name_2: attributes?.lender_name_2,
          lender_address: attributes?.lender_address,
          lender_city: attributes?.lender_city,
          lender_state: attributes?.lender_state,
          lender_zip: attributes?.lender_zip,
          // Calculated fields
          estimated_current_balance: Math.round(estimatedBalance),
          estimated_current_balance_2: Math.round(estimatedBalance2),
          total_estimated_mortgage_balance: Math.round(estimatedBalance + estimatedBalance2),
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
