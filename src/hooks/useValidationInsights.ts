import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ValidationInsight {
  system: string;
  conditionScore: number;
  status: 'excellent' | 'good' | 'fair' | 'poor';
  installYear?: number;
  estimatedAge: number;
  confidence: number;
  material?: string;
  nextService?: string;
  replacementTimeline?: string;
  findings: string[];
  recommendations: string[];
}

export interface ValidationInsightsHook {
  insights: ValidationInsight[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useValidationInsights(propertyId?: string): ValidationInsightsHook {
  const [insights, setInsights] = useState<ValidationInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    if (!propertyId) {
      setInsights([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch systems for the property
      const { data: systemsData, error: systemsError } = await supabase
        .from('systems')
        .select(`
          *,
          homes!inner(property_id)
        `)
        .eq('homes.property_id', propertyId);

      if (systemsError) throw systemsError;

      // Transform systems data into validation insights
      const currentYear = new Date().getFullYear();
      const transformedInsights: ValidationInsight[] = (systemsData || []).map(system => {
        const estimatedAge = system.install_year ? currentYear - system.install_year : 10;
        const confidence = system.confidence || 0.5;
        
        // Calculate condition score based on age and confidence
        let conditionScore = Math.max(10, 100 - (estimatedAge * 3) - ((1 - confidence) * 20));
        
        let status: 'excellent' | 'good' | 'fair' | 'poor';
        if (conditionScore >= 85) status = 'excellent';
        else if (conditionScore >= 70) status = 'good';
        else if (conditionScore >= 55) status = 'fair';
        else status = 'poor';

        // Generate findings and recommendations based on system type
        const findings = generateFindings(system, estimatedAge);
        const recommendations = generateRecommendations(system, estimatedAge, status);
        
        return {
          system: system.kind,
          conditionScore: Math.round(conditionScore),
          status,
          installYear: system.install_year,
          estimatedAge,
          confidence,
          material: system.material,
          nextService: generateNextService(system.kind, estimatedAge),
          replacementTimeline: generateReplacementTimeline(system.kind, estimatedAge),
          findings,
          recommendations
        };
      });

      setInsights(transformedInsights);
    } catch (err: any) {
      console.error('Error fetching validation insights:', err);
      setError(err.message || 'Failed to fetch validation insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [propertyId]);

  return {
    insights,
    loading,
    error,
    refetch: fetchInsights
  };
}

function generateFindings(system: any, estimatedAge: number): string[] {
  const findings = [];
  
  if (system.kind === 'hvac') {
    findings.push(`HVAC age: ${estimatedAge} years`);
    if (system.material) findings.push(`System type: ${system.material}`);
    findings.push(`Confidence: ${Math.round(system.confidence * 100)}%`);
    findings.push(`Status: ${system.status}`);
  } else if (system.kind === 'roof') {
    findings.push(`Roof age: ${estimatedAge} years`);
    if (system.material) findings.push(`Material: ${system.material}`);
    findings.push(`Confidence: ${Math.round(system.confidence * 100)}%`);
    if (estimatedAge > 20) findings.push('Approaching replacement age');
  } else if (system.kind === 'water_heater') {
    findings.push(`Water heater age: ${estimatedAge} years`);
    if (system.material) findings.push(`Type: ${system.material}`);
    findings.push(`Confidence: ${Math.round(system.confidence * 100)}%`);
  }
  
  return findings;
}

function generateRecommendations(system: any, estimatedAge: number, status: string): string[] {
  const recommendations = [];
  
  if (system.kind === 'hvac') {
    recommendations.push('Regular filter changes every 3 months');
    recommendations.push('Annual professional maintenance');
    if (estimatedAge > 12) recommendations.push('Consider efficiency upgrade evaluation');
  } else if (system.kind === 'roof') {
    recommendations.push('Annual inspection recommended');
    if (estimatedAge > 15) recommendations.push('Monitor for replacement planning');
    recommendations.push('Keep gutters clean and clear');
  } else if (system.kind === 'water_heater') {
    recommendations.push('Annual maintenance inspection');
    if (estimatedAge > 8) recommendations.push('Consider replacement planning');
    recommendations.push('Monitor for efficiency decline');
  }
  
  return recommendations;
}

function generateNextService(systemKind: string, estimatedAge: number): string {
  if (systemKind === 'hvac') {
    return estimatedAge > 15 ? 'Replacement evaluation' : 'Annual maintenance';
  } else if (systemKind === 'roof') {
    return estimatedAge > 20 ? 'Replacement planning' : 'Annual inspection';
  } else if (systemKind === 'water_heater') {
    return estimatedAge > 10 ? 'Replacement planning' : 'Annual service';
  }
  return 'Regular maintenance';
}

function generateReplacementTimeline(systemKind: string, estimatedAge: number): string {
  if (systemKind === 'hvac') {
    const yearsLeft = Math.max(0, 18 - estimatedAge);
    return yearsLeft <= 2 ? 'Next 1-2 years' : `${yearsLeft} years`;
  } else if (systemKind === 'roof') {
    const yearsLeft = Math.max(0, 25 - estimatedAge);
    return yearsLeft <= 3 ? 'Next 2-3 years' : `${yearsLeft} years`;
  } else if (systemKind === 'water_heater') {
    const yearsLeft = Math.max(0, 12 - estimatedAge);
    return yearsLeft <= 2 ? 'Next 1-2 years' : `${yearsLeft} years`;
  }
  return 'Monitor condition';
}