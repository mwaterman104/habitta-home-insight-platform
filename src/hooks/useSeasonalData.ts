import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SeasonalExperience {
  season: string;
  trigger: string[];
  title: string;
  message: string;
  bullets: string[];
  primaryCta: {
    text: string;
    route: string;
  };
  secondaryCta: {
    text: string;
    action: string;
  };
  imagery: string;
}

export function useSeasonalExperiences() {
  const [experiences, setExperiences] = useState<SeasonalExperience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchExperiences() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('seasonal_experiences')
          .select('*');

        if (error) throw error;

        if (data && data.length > 0) {
          const formatted = data.map(exp => ({
            season: exp.season,
            trigger: exp.trigger_conditions || [],
            title: exp.title,
            message: exp.message || '',
            bullets: exp.bullets || [],
            primaryCta: {
              text: exp.primary_cta_text || '',
              route: exp.primary_cta_route || ''
            },
            secondaryCta: {
              text: exp.secondary_cta_text || '',
              action: exp.secondary_cta_action || ''
            },
            imagery: exp.imagery || ''
          }));
          setExperiences(formatted);
        } else {
          // Return mock data if no real data exists
          setExperiences([
            {
              season: "spring",
              trigger: ["roof_clear", "gutters_clean"],
              title: "Spring Outdoor Living Ready",
              message: "Your roof and gutters are in excellent condition",
              bullets: ["Exterior systems optimized", "Ready for spring weather", "Outdoor space prepared"],
              primaryCta: {
                text: "Plan Spring Projects",
                route: "/seasonal"
              },
              secondaryCta: {
                text: "View Checklist",
                action: "checklist"
              },
              imagery: "spring-garden"
            }
          ]);
        }
      } catch (err: any) {
        console.error('Error fetching seasonal experiences:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchExperiences();
  }, []);

  return { experiences, loading, error };
}

export function useDIYGuides() {
  const [guides, setGuides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGuides() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('diy_guides')
          .select('*');

        if (error) throw error;

        if (data && data.length > 0) {
          setGuides(data);
        } else {
          // Return mock data if no real data exists
          setGuides([
            {
              id: "hvac-filter",
              topic: "HVAC Maintenance",
              match: ["hvac", "filter", "air", "maintenance"],
              title: "Replace HVAC Filter",
              safety: ["Turn off HVAC system", "Wear gloves if filter is dirty"],
              tools: ["None required"],
              parts: ["HVAC filter (check size on current filter)"],
              steps: [
                "Turn off your HVAC system",
                "Locate the filter compartment",
                "Remove the old filter",
                "Insert the new filter with airflow arrows pointing toward unit",
                "Turn system back on"
              ]
            }
          ]);
        }
      } catch (err: any) {
        console.error('Error fetching DIY guides:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchGuides();
  }, []);

  return { guides, loading, error };
}