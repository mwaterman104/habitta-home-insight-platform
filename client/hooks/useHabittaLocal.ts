import { useMemo } from "react";
import { Task, LifecycleItem, NeighborhoodPoint, SeasonalChecklistItem, Season } from "../types/habitta";
import maintenanceData from "../mock/maintenance_timeline.json";
import lifecycleData from "../mock/lifecycle.json";
import neighborhoodData from "../mock/neighborhood_comparison.json";
import maintenanceHistory from "../mock/maintenance_history.json";
import chatdiyGuides from "../mock/chatdiy_guides.json";
import costModel from "../mock/cost_model.json";
import neighborhoodBenchmark from "../mock/neighborhood_benchmark.json";
import propertyData from "../mock/property_summary.json";
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