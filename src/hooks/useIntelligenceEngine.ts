import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SystemHealth {
  system: string;
  score: number;
  status: 'excellent' | 'good' | 'attention' | 'urgent';
  nextAction?: string;
  nextActionDate?: string;
  lastService?: string;
  yearsRemaining?: number;
  confidence?: number;
  quickFix?: {
    title: string;
    time: string;
    impact: string;
  };
}

interface SmartTask {
  id: string;
  title: string;
  description: string;
  priority: 'today' | 'this_week' | 'upcoming';
  ownership: 'diy' | 'pro' | 'either';
  estimatedTime?: string;
  estimatedCost?: number;
  weatherTriggered?: boolean;
  preventativeSavings?: number;
  dueDate?: string;
  category: string;
  confidence?: number;
  drivers?: string[];
}

interface BudgetPrediction {
  quarterlyForecast: number;
  yearlyForecast: number;
  threeYearForecast: number;
  preventativeSavings: number;
  budgetUtilization: number;
  confidence: number;
  breakdown: {
    hvac: number;
    plumbing: number;
    electrical: number;
    roof: number;
    other: number;
  };
}

interface PredictionsData {
  systems: SystemHealth[];
  overallHealth: number;
  confidence: number;
  lastUpdated: string;
}

interface TasksData {
  tasks: SmartTask[];
  completionRate: number;
  totalSavings: number;
  confidence: number;
}

interface ExplanationsData {
  drivers: string[];
  confidence: number;
  missingData: string[];
  methodology: string;
}

export function useIntelligencePredictions(propertyId?: string) {
  const [data, setData] = useState<PredictionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPredictions = async () => {
    if (!propertyId) {
      setData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: result, error } = await supabase.functions.invoke('intelligence-engine', {
        body: { action: 'predictions', property_id: propertyId }
      });

      if (error) throw error;
      
      setData(result);
    } catch (err: any) {
      console.error('Intelligence predictions error:', err);
      setError(err.message || 'Failed to fetch predictions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, [propertyId]);

  return { data, loading, error, refetch: fetchPredictions };
}

export function useIntelligenceTasks(propertyId?: string) {
  const [data, setData] = useState<TasksData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    if (!propertyId) {
      setData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: result, error } = await supabase.functions.invoke('intelligence-engine', {
        body: { action: 'tasks', property_id: propertyId }
      });

      if (error) throw error;
      
      setData(result);
    } catch (err: any) {
      console.error('Intelligence tasks error:', err);
      setError(err.message || 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [propertyId]);

  return { data, loading, error, refetch: fetchTasks };
}

export function useIntelligenceBudget(propertyId?: string) {
  const [data, setData] = useState<BudgetPrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBudget = async () => {
    if (!propertyId) {
      setData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: result, error } = await supabase.functions.invoke('intelligence-engine', {
        body: { action: 'budget', property_id: propertyId }
      });

      if (error) throw error;
      
      setData(result);
    } catch (err: any) {
      console.error('Intelligence budget error:', err);
      setError(err.message || 'Failed to fetch budget predictions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudget();
  }, [propertyId]);

  return { data, loading, error, refetch: fetchBudget };
}

export function useIntelligenceExplanations(entityId?: string, entityType?: 'system' | 'task' | 'prediction') {
  const [data, setData] = useState<ExplanationsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExplanations = async () => {
    if (!entityId || !entityType) {
      setData(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: result, error } = await supabase.functions.invoke('intelligence-engine', {
        body: { action: 'explanations', entity_id: entityId, entity_type: entityType }
      });

      if (error) throw error;
      
      setData(result);
    } catch (err: any) {
      console.error('Intelligence explanations error:', err);
      setError(err.message || 'Failed to fetch explanations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExplanations();
  }, [entityId, entityType]);

  return { data, loading, error, refetch: fetchExplanations };
}