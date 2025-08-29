export interface Alert {
  id: string;
  title: string;
  severity: "low" | "medium" | "high";
  score: number;
  consequence: string;
  deadline?: string;
  cost?: number;
  system: SystemKey;
  actions: AlertAction[];
  source: "maintenance" | "monitoring" | "lifecycle" | "weather" | "safety";
}

export interface AlertAction {
  type: "diagnose" | "diy" | "book_pro" | "buy_parts";
  label: string;
  duration?: string;
  cost?: number;
}

export type SystemKey = "hvac" | "water" | "roof" | "electrical" | "plumbing" | "appliances";

export interface SystemHealthStatus {
  system: SystemKey;
  status: "green" | "yellow" | "red";
  label: string;
  nextService?: string;
  issues?: string[];
}