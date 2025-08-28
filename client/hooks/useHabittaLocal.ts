import { useMemo } from "react";
import { Task, LifecycleItem, NeighborhoodPoint, SeasonalChecklistItem, Season } from "../types/habitta";
import maintenanceData from "../mock/maintenance_timeline.json";
import lifecycleData from "../mock/lifecycle.json";
import neighborhoodData from "../mock/neighborhood_comparison.json";
import { getTasks } from "../utils/tasksMock";
import { generateSeasonalChecklist } from "../utils/seasonalPlan";

export const useUpcomingTasks = (windowDays: 30 | 60 | 90 = 30) => {
  return useMemo(() => {
    const mockTasks = maintenanceData as Task[];
    const localTasks = getTasks();
    
    // Combine and dedupe tasks
    const allTasks = [...mockTasks, ...localTasks];
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