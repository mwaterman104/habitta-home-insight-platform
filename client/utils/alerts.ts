import { Alert, SystemKey, AlertAction } from "../types/alerts";
import { Task } from "../types/habitta";

interface AlertConfig {
  deadline_weight: number;
  impact_weight: number;
  failure_weight: number;
  energy_weight: number;
  safety_weight: number;
}

const DEFAULT_CONFIG: AlertConfig = {
  deadline_weight: 0.3,
  impact_weight: 0.25,
  failure_weight: 0.2,
  energy_weight: 0.15,
  safety_weight: 0.1
};

const SYSTEM_MAPPING: Record<string, SystemKey> = {
  "hvac": "hvac",
  "water heater": "water",
  "plumbing": "plumbing",
  "roof": "roof",
  "electrical": "electrical",
  "appliances": "appliances",
  "safety": "electrical",
  "exterior": "roof",
  "interior": "appliances",
  "energy efficiency": "hvac",
  "landscaping": "roof"
};

const COST_MULTIPLIERS: Record<SystemKey, number> = {
  hvac: 0.06,
  water: 0.08,
  roof: 0.10,
  electrical: 0.05,
  plumbing: 0.07,
  appliances: 0.04
};

function mapCategoryToSystem(category: string): SystemKey {
  const lowerCategory = category.toLowerCase();
  for (const [key, system] of Object.entries(SYSTEM_MAPPING)) {
    if (lowerCategory.includes(key)) {
      return system;
    }
  }
  return "appliances"; // fallback
}

function calculateUrgencyScore(task: Task): number {
  const dueDate = new Date(task.due_date);
  const now = new Date();
  const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilDue <= 0) return 1.0; // overdue
  if (daysUntilDue <= 7) return 0.8;
  if (daysUntilDue <= 30) return 0.6;
  return Math.max(0, 1 - daysUntilDue / 90); // decay over 90 days
}

function calculateImpactScore(task: Task, system: SystemKey): number {
  const baseMultiplier = COST_MULTIPLIERS[system] || 0.05;
  const priorityMultiplier = task.priority === "high" ? 1.2 : task.priority === "medium" ? 1.0 : 0.8;
  return baseMultiplier * priorityMultiplier;
}

function calculateSafetyScore(task: Task): number {
  const safetyKeywords = ["smoke", "detector", "carbon monoxide", "gas", "electrical", "safety"];
  const isSafety = safetyKeywords.some(keyword => 
    task.title.toLowerCase().includes(keyword) || 
    task.category.toLowerCase().includes(keyword) ||
    task.labels?.some(label => label.toLowerCase().includes(keyword))
  );
  return isSafety ? 1.0 : 0.0;
}

function generateConsequence(task: Task, urgencyScore: number, impactScore: number): string {
  const dueDate = new Date(task.due_date);
  const now = new Date();
  const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilDue <= 0) {
    const daysOverdue = Math.abs(daysUntilDue);
    const costIncrease = Math.round(impactScore * daysOverdue * 100);
    return `Overdue by ${daysOverdue} days — increases repair cost by ~${costIncrease}%.`;
  }
  
  if (impactScore > 0.08) {
    const monthlyCost = Math.round((task.cost || 100) * impactScore);
    return `Efficiency down ${Math.round(impactScore * 100)}% — costs ~$${monthlyCost}/mo until fixed.`;
  }
  
  if (urgencyScore > 0.7) {
    return `Due in ${daysUntilDue} days — critical for system health.`;
  }
  
  return `Recommended within ${daysUntilDue} days — prevents larger issues.`;
}

function generateActions(task: Task, system: SystemKey): AlertAction[] {
  const actions: AlertAction[] = [];
  
  // Always offer diagnose
  actions.push({
    type: "diagnose",
    label: "Diagnose",
    duration: "5m"
  });
  
  // Add DIY if cost is reasonable
  if (!task.cost || task.cost < 200) {
    actions.push({
      type: "diy",
      label: "DIY Guide",
      duration: "30-60m",
      cost: task.cost
    });
  }
  
  // Add professional option for complex/expensive tasks
  if (task.cost && task.cost > 100) {
    actions.push({
      type: "book_pro",
      label: "Book Pro",
      cost: task.cost
    });
  }
  
  return actions;
}

export function generateAlertsFromTasks(
  tasks: Task[],
  config: AlertConfig = DEFAULT_CONFIG
): Alert[] {
  const alerts: Alert[] = [];
  
  tasks.forEach(task => {
    if (task.status !== "pending") return;
    
    const system = mapCategoryToSystem(task.category);
    const urgencyScore = calculateUrgencyScore(task);
    const impactScore = calculateImpactScore(task, system);
    const safetyScore = calculateSafetyScore(task);
    
    // Calculate overall score
    const score = Math.min(100, Math.round(
      (urgencyScore * config.deadline_weight +
       impactScore * config.impact_weight +
       urgencyScore * config.failure_weight + // use urgency as proxy for failure risk
       impactScore * config.energy_weight + // use impact as proxy for energy waste
       safetyScore * config.safety_weight) * 100
    ));
    
    // Only create alerts for scores above threshold
    if (score < 20) return;
    
    const severity = score >= 70 ? "high" : score >= 40 ? "medium" : "low";
    const consequence = generateConsequence(task, urgencyScore, impactScore);
    const actions = generateActions(task, system);
    
    alerts.push({
      id: `alert-${task.id}`,
      title: task.title,
      severity,
      score,
      consequence,
      deadline: task.due_date,
      cost: task.cost,
      system,
      actions,
      source: "maintenance"
    });
  });
  
  return alerts.sort((a, b) => b.score - a.score);
}

export function calculateMoneySavings(alerts: Alert[]): {
  monthlySavings: number;
  avoidedSurprise: number;
} {
  let monthlySavings = 0;
  let avoidedSurprise = 0;
  
  alerts.forEach(alert => {
    // Monthly savings from energy efficiency
    if (alert.system === "hvac" || alert.system === "water") {
      const baseCost = alert.cost || 100;
      monthlySavings += Math.round(baseCost * 0.1); // 10% efficiency gain
    }
    
    // Avoided emergency costs
    if (alert.severity === "high" && alert.cost) {
      const emergencyMultiplier = 2.5; // emergency costs 2.5x planned
      avoidedSurprise += Math.round(alert.cost * (emergencyMultiplier - 1));
    }
  });
  
  return { monthlySavings, avoidedSurprise };
}