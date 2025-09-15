import { useState, useEffect } from 'react';
import { smartyEnrich } from '@/lib/smarty';
import { mapEnrichment } from '@/adapters/smartyMappers';
import type { AddressPayload } from '@/lib/smarty';
import { useUserHome } from '@/hooks/useUserHome';
import { useSmartyFinancialData } from '@/hooks/useSmartyFinancialData';

export interface SmartyPropertyData {
  currentValue: number;
  lastSalePrice: number;
  lastSaleDate: string;
  yearBuilt: number;
  squareFeet: number;
  bedrooms: number;
  bathrooms: number;
  lotSize: number;
  propertyType: string;
  estimatedEquity?: number;
  estimatedMortgageBalance?: number;
  marketAppreciation?: number;
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

export const useSmartyPropertyData = () => {
  const { fullAddress } = useUserHome();
  const { data: financialData } = useSmartyFinancialData();
  const [data, setData] = useState<SmartyPropertyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      // Get enriched property data from Smarty
      const enrichedData = await smartyEnrich(addressPayload);
      const mappedData = mapEnrichment(enrichedData);

      if (mappedData.attributes) {
        const attrs = mappedData.attributes as any;

        const lastSale = Number(attrs.last_sale_price || attrs.sale_amount || 0);
        const saleDate = attrs.last_sale_date || attrs.sale_date || '';
        const yearsSinceSale = saleDate ? new Date().getFullYear() - new Date(saleDate).getFullYear() : 0;
        const appreciationRate = 0.04; // assumption
        
        // Use financial data for current value if available, otherwise calculate from last sale
        const currentValue = financialData?.avm_value || financialData?.market_value || 
          (lastSale ? lastSale * Math.pow(1 + appreciationRate, yearsSinceSale) : Number(attrs.total_market_value || 0));

        // Use real mortgage data if available, otherwise estimate
        const estimatedMortgageBalance = financialData?.total_estimated_mortgage_balance || 
          (lastSale ? lastSale * 0.8 * Math.pow(0.97, yearsSinceSale) : 0);

        const propertyData: SmartyPropertyData = {
          currentValue: Math.round(currentValue || 0),
          lastSalePrice: Number(lastSale) || 0,
          lastSaleDate: saleDate,
          yearBuilt: Number(attrs.year_built) || 0,
          squareFeet: Number(attrs.square_feet) || 0,
          bedrooms: Number(attrs.beds) || 0,
          bathrooms: Number(attrs.baths) || 0,
          lotSize: Number(attrs.lot_size) || 0,
          propertyType: attrs.property_type || '',
          estimatedEquity: Math.round((currentValue || 0) - (estimatedMortgageBalance || 0)),
          estimatedMortgageBalance: Math.round(estimatedMortgageBalance || 0),
          marketAppreciation: appreciationRate * 100,
        };

        setData(propertyData);
      } else {
        setData(null);
      }
    } catch (err: any) {
      console.error('Error fetching Smarty property data:', err);
      // Gracefully handle 404s from enrichment without breaking UI
      if (err?.name === 'FunctionsHttpError' || String(err?.message || '').includes('non-2xx')) {
        setError('Property enrichment unavailable');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch property data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (fullAddress) fetchPropertyData();
  }, [fullAddress]);

  return {
    data,
    loading,
    error,
    refetch: fetchPropertyData,
  };
};

export const calculateRepairImpact = (
  propertyData: SmartyPropertyData,
  repairCosts: number,
  valueIncrease: number
): PropertyEquityData => {
  const currentEquity = propertyData.currentValue - (propertyData.estimatedMortgageBalance || 0);
  const potentialValueWithRepairs = propertyData.currentValue + valueIncrease;
  const potentialEquityIncrease = valueIncrease;
  const repairROI = repairCosts > 0 ? (valueIncrease / repairCosts) * 100 : 0;

  return {
    currentValue: propertyData.currentValue,
    estimatedMortgageBalance: propertyData.estimatedMortgageBalance || 0,
    currentEquity,
    equityPercent: propertyData.currentValue ? (currentEquity / propertyData.currentValue) * 100 : 0,
    potentialValueWithRepairs,
    potentialEquityIncrease,
    repairROI,
  };
};
