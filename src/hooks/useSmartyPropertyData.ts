/**
 * NOTE (Doctrine Guardrail):
 * This hook must NEVER fabricate or estimate market dollar values.
 * When authoritative valuation is unavailable, return state — not numbers.
 * Heuristic estimates may only appear in chat or exploration views.
 */

import { useState, useEffect } from 'react';
import { smartyEnrich } from '@/lib/smarty';
import { mapEnrichment } from '@/adapters/smartyMappers';
import type { AddressPayload } from '@/lib/smarty';
import { useUserHome } from '@/hooks/useUserHome';
import { useSmartyFinancialData } from '@/hooks/useSmartyFinancialData';
import type { MarketValueState, MortgageSource } from '@/lib/equityPosition';

export interface SmartyPropertyData {
  // Core property data (preserved)
  yearBuilt: number | null;
  squareFeet: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  lotSize: number | null;
  propertyType: string | null;
  lastSalePrice: number | null;
  lastSaleDate: string | null;
  
  // Equity-related data (doctrine-compliant)
  marketValue: number | null;
  marketValueState: MarketValueState;
  mortgageBalance: number | null;
  mortgageSource: MortgageSource;
}

export interface PropertyEquityData {
  currentValue: number;
  estimatedMortgageBalance: number;
  currentEquity: number;
  equityPercent: number;
  potentialValueWithRepairs: number;
  potentialEquityIncrease: number;
  repairROI: number;
}

interface HomeContext {
  yearBuilt?: number | null;
  state?: string | null;
}

export const useSmartyPropertyData = (homeContext?: HomeContext) => {
  const { fullAddress, userHome } = useUserHome();
  const { data: financialData } = useSmartyFinancialData();
  const [data, setData] = useState<SmartyPropertyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use homeContext if provided, otherwise fall back to userHome
  const contextYearBuilt = homeContext?.yearBuilt ?? userHome?.year_built;
  const contextState = homeContext?.state ?? userHome?.state;

  const fetchPropertyData = async () => {
    if (!fullAddress) return;

    setLoading(true);
    setError(null);

    try {
      const parts = fullAddress.split(',').map((p) => p.trim());
      const street = parts[0] || '';
      const city = parts[1] || '';
      const stateZip = (parts[2] || '').split(' ').filter(Boolean);
      const state = stateZip[0] || '';
      const postalCode = stateZip[1] || '';

      if (!street || !city || !state) {
        throw new Error(`Invalid address format. Expected "street, city, state [zip]" but got: ${fullAddress}`);
      }

      const addressPayload: AddressPayload = {
        street,
        city,
        state,
        postal_code: postalCode,
      };

      // Attempt 1: Get enriched property data from Smarty
      let enrichedData: any = null;
      let enrichFailed = false;
      
      try {
        enrichedData = await smartyEnrich(addressPayload);
      } catch (err) {
        console.warn('Smarty enrich failed:', err);
        enrichFailed = true;
      }
      
      const mappedData = enrichedData ? mapEnrichment(enrichedData) : null;

      // Check for authoritative market value from financial data first
      const authoritativeValue = financialData?.avm_value || financialData?.market_value;
      const authoritativeMortgage = financialData?.total_estimated_mortgage_balance;
      
      if (authoritativeValue) {
        // Case 1: Verified - authoritative API value available
        const attrs = mappedData?.attributes as any || {};
        
        setData({
          marketValue: authoritativeValue,
          marketValueState: 'verified',
          mortgageBalance: authoritativeMortgage || null,
          mortgageSource: authoritativeMortgage ? 'public_records' : null,
          yearBuilt: Number(attrs.year_built) || contextYearBuilt || null,
          squareFeet: Number(attrs.square_feet) || null,
          bedrooms: Number(attrs.beds) || null,
          bathrooms: Number(attrs.baths) || null,
          lotSize: Number(attrs.lot_size) || null,
          propertyType: attrs.property_type || null,
          lastSalePrice: Number(attrs.last_sale_price || attrs.sale_amount) || null,
          lastSaleDate: attrs.last_sale_date || attrs.sale_date || null,
        });
        return;
      }
      
      // Check if enrichment succeeded with market value
      if (mappedData?.attributes) {
        const attrs = mappedData.attributes as any;
        const enrichedMarketValue = Number(attrs.total_market_value) || null;
        
        if (enrichedMarketValue) {
          // Case 1b: Verified from enrichment
          setData({
            marketValue: enrichedMarketValue,
            marketValueState: 'verified',
            mortgageBalance: null, // Enrichment doesn't provide mortgage
            mortgageSource: null,
            yearBuilt: Number(attrs.year_built) || contextYearBuilt || null,
            squareFeet: Number(attrs.square_feet) || null,
            bedrooms: Number(attrs.beds) || null,
            bathrooms: Number(attrs.baths) || null,
            lotSize: Number(attrs.lot_size) || null,
            propertyType: attrs.property_type || null,
            lastSalePrice: Number(attrs.last_sale_price || attrs.sale_amount) || null,
            lastSaleDate: attrs.last_sale_date || attrs.sale_date || null,
          });
          return;
        }
        
        // Has enrichment data but no market value - still populate property details
        const hasOwnershipContext = contextYearBuilt || contextState || attrs.year_built;
        
        setData({
          marketValue: null,
          marketValueState: hasOwnershipContext ? 'unverified' : 'unknown',
          mortgageBalance: null,
          mortgageSource: null,
          yearBuilt: Number(attrs.year_built) || contextYearBuilt || null,
          squareFeet: Number(attrs.square_feet) || null,
          bedrooms: Number(attrs.beds) || null,
          bathrooms: Number(attrs.baths) || null,
          lotSize: Number(attrs.lot_size) || null,
          propertyType: attrs.property_type || null,
          lastSalePrice: Number(attrs.last_sale_price || attrs.sale_amount) || null,
          lastSaleDate: attrs.last_sale_date || attrs.sale_date || null,
        });
        return;
      }
      
      // Case 2: Unverified - APIs failed but ownership context exists
      if (contextYearBuilt || contextState) {
        setData({
          marketValue: null,
          marketValueState: 'unverified',
          mortgageBalance: null,
          mortgageSource: null,
          yearBuilt: contextYearBuilt || null,
          squareFeet: null,
          bedrooms: null,
          bathrooms: null,
          lotSize: null,
          propertyType: null,
          lastSalePrice: null,
          lastSaleDate: null,
        });
        return;
      }
      
      // Case 3: Unknown - insufficient data
      setData({
        marketValue: null,
        marketValueState: 'unknown',
        mortgageBalance: null,
        mortgageSource: null,
        yearBuilt: null,
        squareFeet: null,
        bedrooms: null,
        bathrooms: null,
        lotSize: null,
        propertyType: null,
        lastSalePrice: null,
        lastSaleDate: null,
      });
      
    } catch (err: any) {
      console.error('Error fetching Smarty property data:', err);
      
      // Gracefully handle errors - determine state based on context
      const hasContext = contextYearBuilt || contextState;
      
      setData({
        marketValue: null,
        marketValueState: hasContext ? 'unverified' : 'unknown',
        mortgageBalance: null,
        mortgageSource: null,
        yearBuilt: contextYearBuilt || null,
        squareFeet: null,
        bedrooms: null,
        bathrooms: null,
        lotSize: null,
        propertyType: null,
        lastSalePrice: null,
        lastSaleDate: null,
      });
      
      // Only set error for non-expected failures
      if (err?.name !== 'FunctionsHttpError' && !String(err?.message || '').includes('non-2xx')) {
        setError(err instanceof Error ? err.message : 'Failed to fetch property data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (fullAddress) fetchPropertyData();
  }, [fullAddress, contextYearBuilt, contextState]);

  return {
    data,
    loading,
    error,
    refetch: fetchPropertyData,
  };
};

export const calculateRepairImpact = (
  propertyData: { currentValue?: number; estimatedMortgageBalance?: number; marketValue?: number | null; mortgageBalance?: number | null },
  repairCosts: number,
  valueIncrease: number
): PropertyEquityData => {
  const currentValue = propertyData.currentValue || propertyData.marketValue || 0;
  const mortgageBalance = propertyData.estimatedMortgageBalance || propertyData.mortgageBalance || 0;
  const currentEquity = currentValue - mortgageBalance;
  const potentialValueWithRepairs = currentValue + valueIncrease;
  const potentialEquityIncrease = valueIncrease;
  const repairROI = repairCosts > 0 ? (valueIncrease / repairCosts) * 100 : 0;

  return {
    currentValue,
    estimatedMortgageBalance: mortgageBalance,
    currentEquity,
    equityPercent: currentValue ? (currentEquity / currentValue) * 100 : 0,
    potentialValueWithRepairs,
    potentialEquityIncrease,
    repairROI,
  };
};
