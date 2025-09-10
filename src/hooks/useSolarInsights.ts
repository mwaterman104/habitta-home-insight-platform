import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SolarInsights {
  roofAnalysis: {
    totalRoofArea: number;
    maxPanels: number;
    sunshineHoursPerYear: number;
    carbonOffsetFactor: number;
  };
  systemOptions: Array<{
    panelCount: number;
    annualGenerationKwh: number;
    roofSegments: number;
  }>;
  financialProjections: Array<{
    panelCount: number;
    monthlyBillOffset: number;
    currency: string;
    annualGenerationKwh: number;
    lifetimeGenerationKwh: number;
    totalSavings20Years: number;
    lifetimeSavings: number;
    paybackYears: number;
  }>;
  roofSegments: Array<{
    pitch: number;
    azimuth: number;
    area: number;
    sunshineScore: number;
    sunshineQuantiles?: number[];
  }>;
  imagery?: {
    roofImageUrl: string | null;
    solarFluxUrl: string | null;
    imageryDate?: {
      year: number;
      month: number;
      day: number;
    };
    buildingId?: string;
  };
  coverage: boolean;
  lastUpdated: string;
}

export const useSolarInsights = (latitude?: number, longitude?: number, addressId?: string) => {
  const [data, setData] = useState<SolarInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSolarData = async () => {
      if (!latitude || !longitude) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data: response, error: functionError } = await supabase.functions.invoke(
          'google-solar-analysis',
          {
            body: {
              latitude,
              longitude,
              addressId,
            },
          }
        );

        if (functionError) {
          throw new Error(functionError.message);
        }

        if (response?.error) {
          throw new Error(response.error);
        }

        setData(response);
      } catch (err) {
        console.error('Error fetching solar insights:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch solar data');
        
        // Set fallback data indicating no coverage
        setData({
          roofAnalysis: {
            totalRoofArea: 0,
            maxPanels: 0,
            sunshineHoursPerYear: 0,
            carbonOffsetFactor: 0,
          },
          systemOptions: [],
          financialProjections: [],
          roofSegments: [],
          coverage: false,
          lastUpdated: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSolarData();
  }, [latitude, longitude, addressId]);

  return { data, loading, error };
};