import { useState, useEffect } from 'react';
import { useUserHome } from '@/contexts/UserHomeContext';
import { useSystemsData } from './useSystemsData';
import { useValidationInsights } from './useValidationInsights';
import { useIntelligencePredictions, useIntelligenceTasks, useIntelligenceBudget } from './useIntelligenceEngine';

export interface HomeIntelligenceData {
  // Core data
  userHome: any;
  systems: any[];
  validationInsights: any[];
  
  // Intelligence Engine data
  predictions: any;
  smartTasks: any;
  budgetPredictions: any;
  
  // Loading states
  loading: boolean;
  error: string | null;
  
  // Derived data for compatibility
  systemHealth: any[];
  upcomingTasks: any[];
  alerts: any[];
  lifecycle: any[];
  
  // Actions
  refreshAll: () => Promise<void>;
}

export function useHomeIntelligence(): HomeIntelligenceData {
  const { userHome, loading: homeLoading, error: homeError, refreshHome } = useUserHome();
  const { systems, loading: systemsLoading, error: systemsError, refetch: refetchSystems } = useSystemsData(userHome?.id);
  const { insights, loading: insightsLoading, error: insightsError, refetch: refetchInsights } = useValidationInsights(userHome?.property_id);
  
  // Intelligence Engine hooks
  const { data: predictions, loading: predictionsLoading, refetch: refetchPredictions } = useIntelligencePredictions(userHome?.property_id);
  const { data: smartTasks, loading: tasksLoading, refetch: refetchTasks } = useIntelligenceTasks(userHome?.property_id);
  const { data: budgetPredictions, loading: budgetLoading, refetch: refetchBudget } = useIntelligenceBudget(userHome?.property_id);

  const [error, setError] = useState<string | null>(null);

  // Aggregate loading state
  const loading = homeLoading || systemsLoading || insightsLoading || predictionsLoading || tasksLoading || budgetLoading;

  // Aggregate errors - only show critical errors that prevent core functionality
  useEffect(() => {
    // Only treat home and systems errors as critical, insights can be gracefully degraded
    const criticalErrors = [homeError, systemsError].filter(Boolean);
    if (criticalErrors.length > 0) {
      setError(criticalErrors[0]);
    } else {
      setError(null);
    }
    
    // Log insights errors for debugging but don't fail the whole component
    if (insightsError) {
      console.warn('Property insights error (non-critical):', insightsError);
    }
  }, [homeError, systemsError, insightsError]);

  // Refresh all data
  const refreshAll = async () => {
    await Promise.all([
      refreshHome(),
      refetchSystems(),
      refetchInsights(),
      refetchPredictions(),
      refetchTasks(),
      refetchBudget()
    ]);
  };

  // Transform data for compatibility with existing components
  const systemHealth = systems.map(system => {
    const insight = insights.find(i => i.system === system.kind);
    return {
      system: system.kind,
      status: insight?.status === 'excellent' || insight?.status === 'good' ? 'green' : 
              insight?.status === 'fair' ? 'yellow' : 'red',
      label: system.kind.charAt(0).toUpperCase() + system.kind.slice(1).replace('_', ' '),
      nextService: insight?.nextService,
      confidence: system.confidence
    };
  });

  // Combine smart tasks with system-based alerts
  const upcomingTasks = [
    ...(smartTasks?.tasks || []).filter(task => task.dueDate && new Date(task.dueDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    ...insights.filter(insight => insight.status === 'poor' || insight.status === 'fair').map(insight => ({
      id: `system-${insight.system}`,
      title: `${insight.system} attention needed`,
      description: insight.recommendations[0] || `${insight.system} requires maintenance`,
      priority: insight.status === 'poor' ? 'high' : 'medium',
      category: insight.system,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }))
  ];

  // Generate alerts from system conditions
  const alerts = insights.filter(insight => insight.status === 'poor' || insight.status === 'fair').map(insight => ({
    id: `alert-${insight.system}`,
    title: `${insight.system.charAt(0).toUpperCase() + insight.system.slice(1)} Attention Required`,
    description: insight.findings[0],
    severity: insight.status === 'poor' ? 'high' : 'medium',
    system: insight.system,
    type: 'system_condition'
  }));

  // Generate lifecycle data from systems
  const lifecycle = systems.map(system => {
    const insight = insights.find(i => i.system === system.kind);
    const currentYear = new Date().getFullYear();
    const installYear = system.install_year || (currentYear - 10);
    
    // Typical lifespans by system type
    const lifespans = {
      hvac: 18,
      roof: 25,
      water_heater: 12,
      electrical: 30,
      plumbing: 20
    };
    
    const lifespan = lifespans[system.kind as keyof typeof lifespans] || 15;
    
    return {
      id: system.id,
      name: system.kind.charAt(0).toUpperCase() + system.kind.slice(1).replace('_', ' '),
      installed_year: installYear,
      lifespan_years: lifespan,
      replacement_cost: getEstimatedCost(system.kind),
      nextReplacementYear: installYear + lifespan,
      confidence: system.confidence
    };
  });

  return {
    userHome,
    systems,
    validationInsights: insights,
    predictions,
    smartTasks,
    budgetPredictions,
    loading,
    error,
    systemHealth,
    upcomingTasks,
    alerts,
    lifecycle,
    refreshAll
  };
}

function getEstimatedCost(systemKind: string): number {
  const costs = {
    hvac: 8000,
    roof: 15000,
    water_heater: 2000,
    electrical: 5000,
    plumbing: 3000
  };
  
  return costs[systemKind as keyof typeof costs] || 2000;
}