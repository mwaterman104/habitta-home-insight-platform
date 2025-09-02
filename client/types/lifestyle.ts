export interface HomeSystem {
  key: string;
  currentScore: number;
  nextMaintenance?: string;
  nextInspection?: string;
  nextService?: string;
  efficiency: string;
  condition?: string;
  lastService?: string;
  lastMaintenance?: string;
  riskFactors?: string[];
  status: "green" | "yellow" | "red";
}

export interface LifestyleMetrics {
  energyWellness: {
    score: number;
    neighborhoodAverage: number;
    monthlySavings: number;
    trend: "improving" | "stable" | "declining";
  };
  comfortIndex: {
    rating: "Excellent" | "Good" | "Fair" | "Poor";
    temperatureStability: string;
    airQuality: string;
    summary: string;
  };
  outdoorReadiness: {
    status: "Ready" | "Needs Attention" | "Not Ready";
    systems: string[];
    seasonalNote: string;
  };
  safetyConfidence: {
    score: number;
    status: "High" | "Medium" | "Low";
    summary: string;
  };
}

export interface SeasonalExperience {
  season: "spring" | "summer" | "fall" | "winter";
  trigger: string[];
  title: string;
  message: string;
  bullets: string[];
  primaryCta: {
    text: string;
    route: string;
  };
  secondaryCta: {
    text: string;
    action: string;
  };
  imagery: string;
}

export interface PartnerOffer {
  id: string;
  partner: string;
  type: "energy_rebate" | "home_improvement" | "financing" | "smart_home" | "energy_efficiency";
  trigger: string;
  title: string;
  description: string;
  value: number;
  unit: "usd" | "percent" | "rate" | "consultation";
  expiry: string;
  qualified: boolean;
}

export type LifestyleCategory = "comfort" | "outdoor_living" | "energy_wellness" | "safety_confidence";

export type Season = "spring" | "summer" | "fall" | "winter";