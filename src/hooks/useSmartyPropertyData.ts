import { useState, useEffect } from 'react';
import { smartyEnrich, smartyStandardizeGeocode, AddressPayload } from '@/lib/smarty';
import { mapEnrichment } from '@/adapters/smartyMappers';

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

export const useSmartyPropertyData = (address: string) => {
  const [data, setData] = useState<SmartyPropertyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPropertyData = async () => {
    if (!address) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Parse address for Smarty API
      const addressParts = address.split(',');
      const street = addressParts[0]?.trim() || '';
      const cityState = addressParts[1]?.trim() || '';
      const [city, state] = cityState.split(' ');
      const postalCode = addressParts[2]?.trim() || '';

      const addressPayload: AddressPayload = {
        street,
        city: city || '',
        state: state || '',
        postal_code: postalCode
      };

      // Get enriched property data from Smarty
      const enrichedData = await smartyEnrich(addressPayload);
      const mappedData = mapEnrichment(enrichedData);

      if (mappedData.attributes) {
        const attrs = mappedData.attributes;
        
        // Estimate current value based on last sale + appreciation
        const lastSale = attrs.last_sale_price || 0;
        const saleDate = attrs.last_sale_date;
        const yearsSinceSale = saleDate ? new Date().getFullYear() - new Date(saleDate).getFullYear() : 0;
        const appreciationRate = 0.04; // 4% annual appreciation assumption
        const currentValue = lastSale * Math.pow(1 + appreciationRate, yearsSinceSale);

        // Estimate mortgage balance (assuming 30-year loan at purchase)
        const estimatedMortgageBalance = lastSale * 0.8 * Math.pow(0.97, yearsSinceSale); // Rough calculation

        const propertyData: SmartyPropertyData = {
          currentValue: Math.round(currentValue),
          lastSalePrice: lastSale,
          lastSaleDate: saleDate || '',
          yearBuilt: attrs.year_built || 0,
          squareFeet: attrs.square_feet || 0,
          bedrooms: attrs.beds || 0,
          bathrooms: attrs.baths || 0,
          lotSize: attrs.lot_size || 0,
          propertyType: attrs.property_type || '',
          estimatedEquity: Math.round(currentValue - estimatedMortgageBalance),
          estimatedMortgageBalance: Math.round(estimatedMortgageBalance),
          marketAppreciation: appreciationRate * 100
        };

        setData(propertyData);
      }
    } catch (err) {
      console.error('Error fetching Smarty property data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch property data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPropertyData();
  }, [address]);

  return {
    data,
    loading,
    error,
    refetch: fetchPropertyData
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
  const repairROI = (valueIncrease / repairCosts) * 100;

  return {
    currentValue: propertyData.currentValue,
    estimatedMortgageBalance: propertyData.estimatedMortgageBalance || 0,
    currentEquity,
    equityPercent: (currentEquity / propertyData.currentValue) * 100,
    potentialValueWithRepairs,
    potentialEquityIncrease,
    repairROI
  };
};