import { SeasonalChecklistItem, SeasonalCategory, Season, MonitoringItem, Task } from "../types/habitta";
import monitoringData from "../mock/monitoring.json";
import maintenanceData from "../mock/maintenance_timeline.json";

export const generateSeasonalChecklist = (season?: Season): { category: SeasonalCategory, items: SeasonalChecklistItem[] }[] => {
  const monitoring = monitoringData as MonitoringItem[];
  const maintenance = maintenanceData as Task[];
  
  // Filter monitoring items by season if specified
  const filteredMonitoring = season 
    ? monitoring.filter(item => item.season === season)
    : monitoring;
  
  // Convert monitoring items to checklist items
  const monitoringItems: SeasonalChecklistItem[] = filteredMonitoring.map(item => ({
    id: item.id,
    name: item.name,
    category: item.category,
    notes: item.notes,
    planned: false
  }));
  
  // Add relevant maintenance tasks as planned items
  const maintenanceItems: SeasonalChecklistItem[] = maintenance
    .filter(task => task.status === "pending")
    .map(task => ({
      id: task.id,
      name: task.title,
      category: "Maintenance" as SeasonalCategory,
      notes: `Due: ${task.due_date} - Cost: $${task.cost || 0}`,
      planned: true,
      labels: task.labels
    }));
  
  // Combine and dedupe by name
  const allItems = [...monitoringItems, ...maintenanceItems];
  const deduped = allItems.reduce((acc, item) => {
    const existing = acc.find(i => i.name === item.name);
    if (!existing) {
      acc.push(item);
    } else if (item.planned) {
      // Prefer planned items over suggestions
      const index = acc.indexOf(existing);
      acc[index] = item;
    }
    return acc;
  }, [] as SeasonalChecklistItem[]);
  
  // Group by category
  const categories: SeasonalCategory[] = ["Maintenance", "Energy", "Safety"];
  
  return categories.map(category => ({
    category,
    items: deduped.filter(item => item.category === category)
  })).filter(group => group.items.length > 0);
};