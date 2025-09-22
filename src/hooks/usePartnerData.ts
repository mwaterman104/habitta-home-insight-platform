import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PartnerOffer {
  id: string;
  partner: string;
  type: string;
  trigger: string;
  title: string;
  description: string;
  value: number;
  unit: string;
  expiry: string;
  qualified: boolean;
}

export function usePartnerOffers() {
  const [offers, setOffers] = useState<PartnerOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOffers() {
      try {
        setLoading(true);
        
        // Get partner offers and user eligibility
        const { data: offersData, error: offersError } = await supabase
          .from('partner_offers')
          .select(`
            *,
            user_partner_offers!inner(is_qualified)
          `);

        if (offersError) throw offersError;

        if (offersData && offersData.length > 0) {
          const formatted = offersData.map(offer => ({
            id: offer.id,
            partner: offer.partner_name,
            type: offer.offer_type,
            trigger: offer.trigger_condition || '',
            title: offer.title,
            description: offer.description || '',
            value: offer.value || 0,
            unit: offer.value_unit || 'usd',
            expiry: offer.expiry_date ? offer.expiry_date.toString() : '2025-12-31',
            qualified: offer.user_partner_offers?.[0]?.is_qualified || false
          }));
          setOffers(formatted);
        } else {
          // Return mock data if no real data exists
          setOffers([
            {
              id: "utility-rebate-1",
              partner: "Local Utility",
              type: "energy_rebate", 
              trigger: "energy_score_improved",
              title: "$200 Smart Thermostat Rebate",
              description: "Your energy improvements qualify you for utility rebates",
              value: 200,
              unit: "usd",
              expiry: "2025-12-31",
              qualified: true
            },
            {
              id: "furniture-discount",
              partner: "Patio Plus",
              type: "home_improvement",
              trigger: "outdoor_ready", 
              title: "15% off Spring Patio Furniture",
              description: "Systems ready - outdoor space optimized for entertaining",
              value: 15,
              unit: "percent",
              expiry: "2025-05-31",
              qualified: true
            }
          ]);
        }
      } catch (err: any) {
        console.error('Error fetching partner offers:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchOffers();
  }, []);

  return { offers, loading, error };
}