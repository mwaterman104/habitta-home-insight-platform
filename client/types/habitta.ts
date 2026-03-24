export interface Task {
  id: string;
  title: string;
  due_date: string; // YYYY-MM-DD format
  category: string;
  priority: "low" | "medium" | "high";
  cost?: number;
  labels?: string[];
  status: "pending" | "in_progress" | "completed";
}

export interface LifecycleItem {
  id: string;
  name: string;
  installed_year: number;
  lifespan_years: number;
  replacement_cost: number;
}

export interface NeighborhoodPoint {
  month: string; // YYYY-MM format
  yours: number;
  neighborhood_avg: number;
}

export interface SeasonalChecklistItem {
  id: string;
  name: string;
  category: SeasonalCategory;
  notes?: string;
  planned?: boolean;
  labels?: string[];
}

export type SeasonalCategory = "Maintenance" | "Energy" | "Safety";

export type Season = "Spring" | "Summer" | "Fall" | "Winter";

export interface MonitoringItem {
  id: string;
  name: string;
  category: SeasonalCategory;
  season: Season;
  notes?: string;
}