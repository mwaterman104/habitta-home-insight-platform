import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface HabittaDataHook {
  loading: boolean;
  error: string | null;
  tasks: any[];
  systems: any[];
  replacements: any[];
  profile: any | null;
  // Add methods that match existing hooks
  alerts: any[];
  systemHealth: any[];
  moneySavings: any;
  tasksSummary: any;
  upcomingTasks: any[];
  lifecycle: any[];
  allTasks: any[];
}

export function useHabittaData(propertyId?: string): HabittaDataHook {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [systems, setSystems] = useState<any[]>([]);
  const [replacements, setReplacements] = useState<any[]>([]);
  const [profile, setProfile] = useState<any | null>(null);

  useEffect(() => {
    if (!propertyId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('Fetching data for property:', propertyId);
        
        const [tasksResult, systemsResult, replacementsResult, profileResult] = await Promise.all([
          supabase.from("v_dashboard_smart_tasks").select("*").eq("property_id", propertyId),
          supabase.from("v_dashboard_systems").select("*").eq("property_id", propertyId),
          supabase.from("v_dashboard_replacements").select("*").eq("property_id", propertyId),
          supabase.from("v_property_profile").select("*").eq("property_id", propertyId).maybeSingle(),
        ]);

        const anyError = tasksResult.error || systemsResult.error || replacementsResult.error || profileResult.error;
        if (anyError) {
          console.error('Database error:', anyError);
          throw anyError;
        }

        if (!cancelled) {
          console.log('Data fetched successfully:', {
            tasks: tasksResult.data?.length || 0,
            systems: systemsResult.data?.length || 0,
            replacements: replacementsResult.data?.length || 0,
            profile: profileResult.data ? 'found' : 'none'
          });

          setTasks(tasksResult.data || []);
          setSystems(systemsResult.data || []);
          setReplacements(replacementsResult.data || []);
          setProfile(profileResult.data || null);
        }
      } catch (e: any) {
        console.error('Error fetching habitta data:', e);
        if (!cancelled) {
          setError(e.message || "Failed to load data");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  // Transform data to match existing hook interfaces
  const transformedData = {
    loading,
    error,
    tasks,
    systems,
    replacements,
    profile,
    
    // Transform for compatibility with existing components
    alerts: tasks.filter(task => {
      const dueDate = new Date(task.due_date);
      const today = new Date();
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7; // alerts for tasks due within a week
    }).map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      severity: task.priority === 'high' ? 'high' : task.priority === 'medium' ? 'medium' : 'low',
      system: task.category?.toLowerCase() || 'general',
      dueDate: task.due_date,
      estimatedCost: task.estimated_cost,
      type: 'maintenance'
    })),

    systemHealth: systems.map(system => ({
      system: system.system_type,
      status: system.confidence_level > 0.8 ? 'green' : system.confidence_level > 0.5 ? 'yellow' : 'red',
      label: system.system_type.charAt(0).toUpperCase() + system.system_type.slice(1),
      nextService: system.maintenance_frequency_months ? `Next: ${system.maintenance_frequency_months}mo` : undefined
    })),

    moneySavings: {
      monthlyPotential: replacements.reduce((sum, r) => sum + (r.cost_avg || 0), 0) / 12,
      annualPotential: replacements.reduce((sum, r) => sum + (r.cost_avg || 0), 0),
      preventativeActions: tasks.filter(t => t.preventative_savings > 0).length
    },

    tasksSummary: {
      pending: tasks.filter(t => t.priority === 'pending' || !t.priority).length,
      inProgress: tasks.filter(t => t.priority === 'in_progress').length,
      completed: 0, // Will need to track completed tasks separately
      total: tasks.length
    },

    upcomingTasks: tasks.filter(task => {
      const dueDate = new Date(task.due_date);
      const today = new Date();
      const inMonth = new Date();
      inMonth.setMonth(today.getMonth() + 1);
      return dueDate >= today && dueDate <= inMonth;
    }),

    lifecycle: systems.map(system => ({
      id: system.id,
      name: system.system_type,
      installed_year: parseInt(system.installation_date) || new Date().getFullYear() - 10,
      lifespan_years: system.estimated_lifespan_years,
      replacement_cost: replacements.find(r => r.system_type === system.system_type)?.cost_avg || 5000,
      nextReplacementYear: (parseInt(system.installation_date) || new Date().getFullYear() - 10) + system.estimated_lifespan_years
    })),

    allTasks: tasks
  };

  return transformedData;
}