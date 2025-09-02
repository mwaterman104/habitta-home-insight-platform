import { useMemo } from "react";
import { Task, LifecycleItem, NeighborhoodPoint, SeasonalChecklistItem, Season } from "../types/habitta";
import { Alert, SystemHealthStatus, SystemKey } from "../types/alerts";
import { HomeSystem, LifestyleMetrics, SeasonalExperience, PartnerOffer } from "../types/lifestyle";
import { generateAlertsFromTasks, calculateMoneySavings } from "../utils/alerts";
import maintenanceData from "../mock/maintenance_timeline.json";
import lifecycleData from "../mock/lifecycle.json";
import neighborhoodData from "../mock/neighborhood_comparison.json";
import maintenanceHistory from "../mock/maintenance_history.json";
import chatdiyGuides from "../mock/chatdiy_guides.json";
import costModel from "../mock/cost_model.json";
import neighborhoodBenchmark from "../mock/neighborhood_benchmark.json";
import propertyData from "../mock/property_summary.json";
import homeSystemsData from "../mock/home_systems.json";
import lifestyleMetricsData from "../mock/lifestyle_metrics.json";
import seasonalExperiencesData from "../mock/seasonal_experiences.json";
import partnerOffersData from "../mock/partner_offers.json";
import { getTasks } from "../utils/tasksMock";
import { generateSeasonalChecklist } from "../utils/seasonalPlan";

export const useUpcomingTasks = (windowDays: 30 | 60 | 90 = 30) => {
  return useMemo(() => {
    const mockTasks = maintenanceData as Task[];
    const localTasks = getTasks();
    
    // Rebase mock task dates to current/next year so we always have data
    const currentYear = new Date().getFullYear();
    const rebasedMockTasks = mockTasks.map(task => {
      const taskDate = new Date(task.due_date);
      const rebasedDate = new Date(currentYear, taskDate.getMonth(), taskDate.getDate());
      
      // If date is in the past, move to next year
      if (rebasedDate < new Date()) {
        rebasedDate.setFullYear(currentYear + 1);
      }
      
      return {
        ...task,
        due_date: rebasedDate.toISOString().split('T')[0]
      };
    });
    
    // Combine and dedupe tasks
    const allTasks = [...rebasedMockTasks, ...localTasks];
    const deduped = allTasks.reduce((acc, task) => {
      const existing = acc.find(t => t.id === task.id);
      if (!existing) {
        acc.push(task);
      }
      return acc;
    }, [] as Task[]);
    
    // Filter by date window
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(now.getDate() + windowDays);
    
    const filtered = deduped.filter(task => {
      const dueDate = new Date(task.due_date);
      return dueDate >= now && dueDate <= endDate && task.status === "pending";
    });
    
    return filtered.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  }, [windowDays]);
};

export const useLifecycle = () => {
  return useMemo(() => {
    const data = lifecycleData as LifecycleItem[];
    const currentYear = new Date().getFullYear();
    
    return data.map(item => ({
      ...item,
      nextReplacementYear: item.installed_year + item.lifespan_years
    })).sort((a, b) => a.nextReplacementYear - b.nextReplacementYear);
  }, []);
};

export const useNeighborhoodComparison = () => {
  return useMemo(() => {
    return neighborhoodData as NeighborhoodPoint[];
  }, []);
};

export const useSeasonalChecklist = (season?: Season) => {
  return useMemo(() => {
    return generateSeasonalChecklist(season);
  }, [season]);
};

export const useAllTasks = () => {
  return useMemo(() => {
    const mockTasks = maintenanceData as Task[];
    const localTasks = getTasks();
    
    // Combine and dedupe tasks
    const allTasks = [...mockTasks, ...localTasks];
    return allTasks.reduce((acc, task) => {
      const existing = acc.find(t => t.id === task.id);
      if (!existing) {
        acc.push(task);
      }
      return acc;
    }, [] as Task[]);
  }, []);
};

export const useTasksSummary = () => {
  const allTasks = useAllTasks();
  
  return useMemo(() => {
    const completedFromHistory = maintenanceHistory.length;
    
    const pending = allTasks.filter(t => t.status === "pending").length;
    const inProgress = allTasks.filter(t => t.status === "in_progress").length;
    const completed = allTasks.filter(t => t.status === "completed").length + completedFromHistory;
    
    return { pending, inProgress, completed, total: pending + inProgress + completed };
  }, [allTasks]);
};

export const useMaintenanceHistory = () => {
  return useMemo(() => {
    return (maintenanceHistory as any[]).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, []);
};

export const useChatDIYGuides = () => {
  return useMemo(() => {
    return chatdiyGuides as any[];
  }, []);
};

export const usePeerBenchmark = () => {
  return useMemo(() => {
    return neighborhoodBenchmark as any[];
  }, []);
};

export const useCostModel = () => {
  return useMemo(() => {
    return costModel as any;
  }, []);
};

export const usePropertySummary = () => {
  return useMemo(() => {
    return propertyData as any;
  }, []);
};

export const useAlerts = () => {
  const upcomingTasks = useUpcomingTasks(90); // get 90-day window for alerts
  
  return useMemo(() => {
    return generateAlertsFromTasks(upcomingTasks);
  }, [upcomingTasks]);
};

export const useSystemHealth = (): SystemHealthStatus[] => {
  const alerts = useAlerts();
  const lifecycle = useLifecycle();
  const currentYear = new Date().getFullYear();
  
  return useMemo(() => {
    const systems: SystemKey[] = ["hvac", "water", "roof", "electrical", "plumbing", "appliances"];
    
    return systems.map(system => {
      // Check for critical alerts for this system
      const systemAlerts = alerts.filter(alert => alert.system === system);
      const highSeverityAlerts = systemAlerts.filter(alert => alert.severity === "high");
      const mediumSeverityAlerts = systemAlerts.filter(alert => alert.severity === "medium");
      
      // Check lifecycle items approaching replacement
      const systemLifecycle = lifecycle.find(item => {
        const lowerName = item.name.toLowerCase();
        return lowerName.includes(system) || 
               (system === "hvac" && lowerName.includes("hvac")) ||
               (system === "water" && lowerName.includes("water")) ||
               (system === "roof" && lowerName.includes("roof")) ||
               (system === "appliances" && (lowerName.includes("appliance") || lowerName.includes("kitchen")));
      });
      
      let status: "green" | "yellow" | "red" = "green";
      let issues: string[] = [];
      let nextService: string | undefined;
      
      // Determine status based on alerts and lifecycle
      if (highSeverityAlerts.length > 0) {
        status = "red";
        issues = highSeverityAlerts.map(alert => alert.title);
      } else if (mediumSeverityAlerts.length > 0) {
        status = "yellow";
        issues = mediumSeverityAlerts.map(alert => alert.title);
      } else if (systemLifecycle && systemLifecycle.nextReplacementYear <= currentYear + 2) {
        status = "yellow";
        nextService = `Replace ${systemLifecycle.nextReplacementYear}`;
      } else if (systemLifecycle && systemLifecycle.nextReplacementYear <= currentYear + 5) {
        nextService = `Next service ${systemLifecycle.nextReplacementYear}`;
      }
      
      return {
        system,
        status,
        label: system.charAt(0).toUpperCase() + system.slice(1),
        nextService,
        issues: issues.length > 0 ? issues : undefined
      };
    });
  }, [alerts, lifecycle, currentYear]);
};

export const useMoneySavings = () => {
  const alerts = useAlerts();
  
  return useMemo(() => {
    return calculateMoneySavings(alerts);
  }, [alerts]);
};

// New lifestyle hooks
export const useHomeSystems = () => {
  return useMemo(() => {
    return homeSystemsData as HomeSystem[];
  }, []);
};

export const useLifestyleMetrics = () => {
  return useMemo(() => {
    return lifestyleMetricsData as LifestyleMetrics;
  }, []);
};

export const useSeasonalExperiences = () => {
  return useMemo(() => {
    return seasonalExperiencesData as SeasonalExperience[];
  }, []);
};

export const usePartnerOffers = () => {
  return useMemo(() => {
    return partnerOffersData as PartnerOffer[];
  }, []);
};

export const useSeasonalHero = () => {
  const allSeasonalExperiences = useSeasonalExperiences();
  const lifestyleMetrics = useLifestyleMetrics();
  const propertyData = usePropertySummary();
  const maintenanceHistory = useMaintenanceHistory();
  
  return useMemo(() => {
    console.log('useSeasonalHero debug:', { 
      allSeasonalExperiences: allSeasonalExperiences?.length,
      lifestyleMetrics: !!lifestyleMetrics,
      propertyData: !!propertyData,
      maintenanceHistory: maintenanceHistory?.length 
    });
    
    // Simple fallback - just return first experience for now
    if (!allSeasonalExperiences || allSeasonalExperiences.length === 0) {
      return null;
    }
    
    return allSeasonalExperiences[0];
  }, [allSeasonalExperiences, lifestyleMetrics, propertyData, maintenanceHistory]);
};