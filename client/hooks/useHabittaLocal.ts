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
import userProfileData from "../mock/user_profile.json";
import propertyIntelligenceData from "../mock/property_intelligence.json";
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

export const useUserProfile = () => {
  return useMemo(() => userProfileData, []);
};

export const useCurrentSeason = () => {
  return useMemo(() => {
    const now = new Date();
    const month = now.getMonth(); // 0-11
    
    if (month >= 2 && month <= 4) return "Spring";
    if (month >= 5 && month <= 7) return "Summer";  
    if (month >= 8 && month <= 10) return "Fall";
    return "Winter";
  }, []);
};

export function getSeasonInfo(): { current: Season; next: Season } {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return { current: "Spring", next: "Summer" };
  if (month >= 5 && month <= 7) return { current: "Summer", next: "Fall" };
  if (month >= 8 && month <= 10) return { current: "Fall", next: "Winter" };
  return { current: "Winter", next: "Spring" };
}

export const useRepairReadiness = () => {
  const lifestyleMetrics = useLifestyleMetrics();
  const lifecycle = useLifecycle();
  
  return useMemo(() => {
    // Calculate annual reserve from monthly savings
    const monthlySavings = lifestyleMetrics.energyWellness.monthlySavings;
    const annualReserve = monthlySavings * 12;
    
    // Find next major service cost (most expensive item in next 2 years)
    const currentYear = new Date().getFullYear();
    const nextMajorItems = lifecycle.filter(item => 
      item.nextReplacementYear <= currentYear + 2
    ).sort((a, b) => b.replacement_cost - a.replacement_cost);
    
    const nextMajorService = nextMajorItems.length > 0 ? nextMajorItems[0] : null;
    const upcomingMajorCost = nextMajorService ? nextMajorService.replacement_cost : 800; // fallback
    
    // Determine user path
    const isEfficiencyAchiever = annualReserve >= upcomingMajorCost;
    
    return {
      userType: isEfficiencyAchiever ? "efficiency_achiever" : "opportunity_identifier",
      annualReserve,
      monthlySavings,
      upcomingMajorCost,
      nextMajorService: nextMajorService?.name || "HVAC Service",
      remainingBuffer: Math.max(0, annualReserve - upcomingMajorCost),
      missedOpportunity: Math.max(0, upcomingMajorCost - annualReserve)
    };
  }, [lifestyleMetrics, lifecycle]);
};

export const useSeasonalHero = () => {
  const allSeasonalExperiences = useSeasonalExperiences();
  const { current: currentSeason, next: nextSeason } = getSeasonInfo();
  const lifestyleMetrics = useLifestyleMetrics();
  const propertyData = usePropertySummary();
  const maintenanceHistory = useMaintenanceHistory();
  
  return useMemo(() => {
    if (!allSeasonalExperiences || allSeasonalExperiences.length === 0) {
      return null;
    }
    
    // Find experiences for current or next season
    const relevantExperiences = allSeasonalExperiences.filter(exp => 
      exp.season.toLowerCase() === currentSeason.toLowerCase() || exp.season.toLowerCase() === nextSeason.toLowerCase()
    );
    
    // Check trigger conditions for matching
    const triggers = {
      roof_clear: maintenanceHistory.some(item => 
        item.category?.toLowerCase().includes('exterior') || 
        item.category?.toLowerCase().includes('roof')
      ),
      gutters_clean: maintenanceHistory.some(item => 
        item.title?.toLowerCase().includes('gutter')
      ),
      energy_efficiency_above_avg: lifestyleMetrics.energyWellness.score > lifestyleMetrics.energyWellness.neighborhoodAverage,
      safety_high: propertyData.metrics.safety_compliance >= 90,
      heating_optimized: currentSeason === "Winter",
      hvac_optimized: true, // Assume HVAC is optimized
      outdoor_ready: lifestyleMetrics.outdoorReadiness.status === "Ready"
    };
    
    // Find best matching experience for current season first
    for (const experience of relevantExperiences) {
      if (experience.season.toLowerCase() === currentSeason.toLowerCase()) {
        const triggersMatch = experience.trigger.every(trigger => 
          triggers[trigger as keyof typeof triggers]
        );
        if (triggersMatch) {
          return experience;
        }
      }
    }
    
    // Fallback to first experience for current season or next season
    return relevantExperiences.find(exp => exp.season.toLowerCase() === currentSeason.toLowerCase()) || 
           relevantExperiences.find(exp => exp.season.toLowerCase() === nextSeason.toLowerCase()) || 
           allSeasonalExperiences[0];
  }, [allSeasonalExperiences, currentSeason, nextSeason, lifestyleMetrics, propertyData, maintenanceHistory]);
};

// Property Intelligence Hook
export const usePropertyIntelligence = () => {
  return useMemo(() => {
    return propertyIntelligenceData;
  }, []);
};