import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LocalContractor {
  id: string;
  name: string;
  business_license?: string;
  florida_license_number?: string;
  license_type: string;
  service_areas: string[];
  service_radius_miles: number;
  specialties: string[];
  contact_info: any;
  business_hours: any;
  ratings: any;
  review_count: number;
  license_verified: boolean;
  insurance_verified: boolean;
  emergency_services: boolean;
  hurricane_response: boolean;
  typical_response_time_hours?: number;
  pricing_tier: string;
  is_active: boolean;
}

interface ContractorFilters {
  specialty?: string;
  zipCode?: string;
  emergencyServices?: boolean;
  hurricaneResponse?: boolean;
  minRating?: number;
  pricingTier?: string;
}

export const useLocalContractors = (filters?: ContractorFilters) => {
  const [contractors, setContractors] = useState<LocalContractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchContractors();
  }, [filters]);

  const fetchContractors = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('local_contractors')
        .select('*')
        .eq('is_active', true);

      // Apply filters
      if (filters?.specialty) {
        query = query.contains('specialties', [filters.specialty]);
      }

      if (filters?.zipCode) {
        query = query.contains('service_areas', [filters.zipCode]);
      }

      if (filters?.emergencyServices) {
        query = query.eq('emergency_services', true);
      }

      if (filters?.hurricaneResponse) {
        query = query.eq('hurricane_response', true);
      }

      if (filters?.pricingTier) {
        query = query.eq('pricing_tier', filters.pricingTier);
      }

      const { data: contractorsData, error: contractorsError } = await query
        .order('review_count', { ascending: false })
        .limit(20);

      if (contractorsError) throw contractorsError;

      // Filter by minimum rating if specified and type cast
      let filteredContractors = (contractorsData || []).map(contractor => ({
        ...contractor,
        contact_info: typeof contractor.contact_info === 'string' 
          ? JSON.parse(contractor.contact_info) 
          : contractor.contact_info || {},
        business_hours: typeof contractor.business_hours === 'string'
          ? JSON.parse(contractor.business_hours)
          : contractor.business_hours || {},
        ratings: typeof contractor.ratings === 'string'
          ? JSON.parse(contractor.ratings)
          : contractor.ratings || { overall: 0, response_time: 0, quality: 0, pricing: 0, communication: 0 }
      })) as LocalContractor[];

      if (filters?.minRating) {
        filteredContractors = filteredContractors.filter(
          contractor => contractor.ratings?.overall >= filters.minRating!
        );
      }

      setContractors(filteredContractors);

    } catch (err) {
      console.error('Error fetching contractors:', err);
      setError(err instanceof Error ? err.message : 'Failed to load contractors');
    } finally {
      setLoading(false);
    }
  };

  const getRecommendedContractors = (specialty: string, zipCode?: string) => {
    return contractors
      .filter(contractor => 
        contractor.specialties.includes(specialty) &&
        (!zipCode || contractor.service_areas.includes(zipCode)) &&
        contractor.ratings.overall >= 4.0 &&
        contractor.license_verified
      )
      .slice(0, 3);
  };

  const getEmergencyContractors = (zipCode?: string) => {
    return contractors
      .filter(contractor => 
        contractor.emergency_services &&
        (!zipCode || contractor.service_areas.includes(zipCode)) &&
        contractor.ratings.overall >= 4.0
      )
      .sort((a, b) => (a.typical_response_time_hours || 24) - (b.typical_response_time_hours || 24))
      .slice(0, 5);
  };

  const getHurricaneResponseContractors = (zipCode?: string) => {
    return contractors
      .filter(contractor => 
        contractor.hurricane_response &&
        (!zipCode || contractor.service_areas.includes(zipCode)) &&
        contractor.ratings.overall >= 4.0
      )
      .sort((a, b) => b.ratings.overall - a.ratings.overall)
      .slice(0, 5);
  };

  return {
    contractors,
    loading,
    error,
    refetch: fetchContractors,
    getRecommendedContractors,
    getEmergencyContractors,
    getHurricaneResponseContractors
  };
};