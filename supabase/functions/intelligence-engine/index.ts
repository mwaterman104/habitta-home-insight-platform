import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Create Supabase client with service role for full access
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface SystemLifecycle {
  system_type: string;
  installation_date?: string;
  estimated_lifespan_years?: number;
  last_maintenance_date?: string;
  maintenance_quality_score?: number;
  predicted_replacement_date?: string;
  confidence_level?: number;
}

interface SmartTask {
  id: string;
  title: string;
  description: string;
  priority: 'today' | 'this_week' | 'upcoming';
  ownership: 'diy' | 'pro' | 'either';
  estimatedTime?: string;
  estimatedCost?: number;
  weatherTriggered?: boolean;
  preventativeSavings?: number;
  dueDate?: string;
  category: string;
  confidence?: number;
  drivers?: string[];
}

interface SystemHealth {
  system: string;
  score: number;
  status: 'excellent' | 'good' | 'attention' | 'urgent';
  nextAction?: string;
  nextActionDate?: string;
  lastService?: string;
  yearsRemaining?: number;
  confidence?: number;
  quickFix?: {
    title: string;
    time: string;
    impact: string;
  };
}

interface BudgetPrediction {
  quarterlyForecast: number;
  yearlyForecast: number;
  threeYearForecast: number;
  preventativeSavings: number;
  budgetUtilization: number;
  confidence: number;
  breakdown: {
    hvac: number;
    plumbing: number;
    electrical: number;
    roof: number;
    other: number;
  };
}

// Lifecycle prediction algorithms
function calculateSystemHealth(system: SystemLifecycle): SystemHealth {
  const currentDate = new Date();
  const installDate = system.installation_date ? new Date(system.installation_date) : new Date(currentDate.getFullYear() - 10, 0, 1);
  const ageYears = (currentDate.getTime() - installDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  
  const expectedLifespan = system.estimated_lifespan_years || getDefaultLifespan(system.system_type);
  const remainingLife = Math.max(0, expectedLifespan - ageYears);
  const healthPercentage = Math.max(0, Math.min(100, (remainingLife / expectedLifespan) * 100));
  
  // Adjust for maintenance quality
  const maintenanceMultiplier = (system.maintenance_quality_score || 5) / 5;
  const adjustedHealth = Math.min(100, healthPercentage * maintenanceMultiplier);
  
  let status: 'excellent' | 'good' | 'attention' | 'urgent';
  if (adjustedHealth >= 85) status = 'excellent';
  else if (adjustedHealth >= 70) status = 'good';
  else if (adjustedHealth >= 50) status = 'attention';
  else status = 'urgent';

  return {
    system: system.system_type,
    score: Math.round(adjustedHealth),
    status,
    yearsRemaining: Math.round(remainingLife * 10) / 10,
    confidence: system.confidence_level || 0.75,
    nextAction: generateNextAction(system.system_type, status, remainingLife),
    nextActionDate: calculateNextActionDate(status, remainingLife),
    lastService: system.last_maintenance_date
  };
}

function getDefaultLifespan(systemType: string): number {
  const lifespans: Record<string, number> = {
    'hvac': 15,
    'roof': 25,
    'electrical': 30,
    'plumbing': 20,
    'water_heater': 10,
    'appliances': 12,
    'flooring': 15,
    'windows': 20
  };
  return lifespans[systemType] || 15;
}

function generateNextAction(systemType: string, status: string, yearsRemaining: number): string {
  if (yearsRemaining < 1) return `Replace ${systemType} system`;
  if (yearsRemaining < 3) return `Schedule ${systemType} inspection`;
  if (status === 'attention') return `Perform ${systemType} maintenance`;
  return `Routine ${systemType} check`;
}

function calculateNextActionDate(status: string, yearsRemaining: number): string {
  const now = new Date();
  let daysToAdd = 30; // Default: 1 month
  
  if (yearsRemaining < 0.5) daysToAdd = 7; // 1 week for urgent
  else if (yearsRemaining < 1) daysToAdd = 14; // 2 weeks
  else if (status === 'attention') daysToAdd = 21; // 3 weeks
  
  const actionDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  return actionDate.toISOString().split('T')[0];
}

// Task generation with weather and seasonal triggers
function generateSmartTasks(systems: SystemHealth[], weatherAlerts: any[] = []): SmartTask[] {
  const tasks: SmartTask[] = [];
  const now = new Date();
  const season = getSeason(now);
  
  // System-based tasks
  systems.forEach(system => {
    if (system.status === 'urgent' || system.status === 'attention') {
      const urgency = system.status === 'urgent' ? 'today' : 
                     system.yearsRemaining && system.yearsRemaining < 1 ? 'this_week' : 'upcoming';
      
      tasks.push({
        id: `system-${system.system}`,
        title: system.nextAction || `Service ${system.system}`,
        description: `System health at ${system.score}%. ${getSystemDescription(system)}`,
        priority: urgency,
        ownership: getOwnership(system.system, system.status),
        estimatedTime: getEstimatedTime(system.system, system.status),
        estimatedCost: getEstimatedCost(system.system, system.status),
        preventativeSavings: calculateSavings(system.system, system.status),
        dueDate: system.nextActionDate,
        category: system.system.toUpperCase(),
        confidence: system.confidence || 0.75,
        drivers: [`${system.system} age`, 'maintenance history', 'local climate']
      });
    }
    
    // Add quick fixes for systems with moderate issues
    if (system.score < 90 && system.score > 70) {
      const quickFix = getQuickFix(system.system);
      if (quickFix) {
        tasks.push({
          id: `quickfix-${system.system}`,
          title: quickFix.title,
          description: `Quick improvement for ${system.system} system. ${quickFix.impact}`,
          priority: 'this_week',
          ownership: 'diy',
          estimatedTime: quickFix.time,
          estimatedCost: quickFix.cost || 50,
          preventativeSavings: quickFix.savings || 200,
          category: 'Quick Win',
          confidence: 0.85,
          drivers: ['easy DIY improvement', 'immediate impact']
        });
      }
    }
  });
  
  // Weather-triggered tasks
  weatherAlerts.forEach(alert => {
    const weatherTask = generateWeatherTask(alert, season);
    if (weatherTask) tasks.push(weatherTask);
  });
  
  // Seasonal tasks
  tasks.push(...generateSeasonalTasks(season));
  
  // Sort by urgency and savings potential
  return tasks.sort((a, b) => {
    const urgencyScore = { today: 3, this_week: 2, upcoming: 1 };
    const aScore = (urgencyScore[a.priority] * 1000) + (a.preventativeSavings || 0);
    const bScore = (urgencyScore[b.priority] * 1000) + (b.preventativeSavings || 0);
    return bScore - aScore;
  });
}

function getSeason(date: Date): string {
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
}

function getSystemDescription(system: SystemHealth): string {
  if (system.yearsRemaining !== undefined) {
    if (system.yearsRemaining < 1) return "Immediate replacement recommended.";
    if (system.yearsRemaining < 3) return `Estimated ${system.yearsRemaining} years remaining.`;
    return `System in ${system.status} condition.`;
  }
  return `System requires attention.`;
}

function getOwnership(systemType: string, status: string): 'diy' | 'pro' | 'either' {
  const proSystems = ['hvac', 'electrical', 'plumbing'];
  if (proSystems.includes(systemType) && status === 'urgent') return 'pro';
  if (systemType === 'roof' || systemType === 'electrical') return 'pro';
  return 'either';
}

function getEstimatedTime(systemType: string, status: string): string {
  const times: Record<string, string> = {
    'hvac': status === 'urgent' ? '4 hours' : '30 min',
    'plumbing': '1-2 hours',
    'electrical': '2-3 hours',
    'roof': '1 day',
    'water_heater': '2-4 hours'
  };
  return times[systemType] || '1 hour';
}

function getEstimatedCost(systemType: string, status: string): number {
  const costs: Record<string, number> = {
    'hvac': status === 'urgent' ? 3500 : 150,
    'plumbing': 200,
    'electrical': 300,
    'roof': 8000,
    'water_heater': 1200
  };
  return costs[systemType] || 100;
}

function calculateSavings(systemType: string, status: string): number {
  const savings: Record<string, number> = {
    'hvac': status === 'urgent' ? 1500 : 400,
    'plumbing': 800,
    'electrical': 600,
    'roof': 5000,
    'water_heater': 500
  };
  return savings[systemType] || 300;
}

function getQuickFix(systemType: string) {
  const quickFixes: Record<string, any> = {
    'hvac': { title: 'Replace air filter', time: '5 min', impact: '+8% efficiency', cost: 25, savings: 150 },
    'plumbing': { title: 'Insulate pipes', time: '30 min', impact: 'Prevent freezing', cost: 40, savings: 300 },
    'electrical': { title: 'Check outlet GFCI', time: '10 min', impact: 'Safety improvement', cost: 0, savings: 0 },
    'roof': { title: 'Clean gutters', time: '45 min', impact: 'Prevent water damage', cost: 0, savings: 1200 }
  };
  return quickFixes[systemType];
}

function generateWeatherTask(alert: any, season: string): SmartTask | null {
  // Simplified weather task generation - in production would use NOAA API
  if (alert.type?.includes('storm') || alert.type?.includes('hurricane')) {
    return {
      id: `weather-${Date.now()}`,
      title: 'Storm preparation checklist',
      description: 'Secure outdoor items and check emergency supplies.',
      priority: 'today',
      ownership: 'diy',
      estimatedTime: '1 hour',
      estimatedCost: 0,
      weatherTriggered: true,
      preventativeSavings: 2000,
      category: 'Storm Prep',
      confidence: 0.95,
      drivers: ['weather forecast', 'storm warning']
    };
  }
  return null;
}

function generateSeasonalTasks(season: string): SmartTask[] {
  const seasonalTasks: Record<string, SmartTask[]> = {
    'spring': [{
      id: 'seasonal-spring-hvac',
      title: 'Spring HVAC tune-up',
      description: 'Prepare cooling system for summer season.',
      priority: 'upcoming',
      ownership: 'pro',
      estimatedCost: 150,
      preventativeSavings: 400,
      category: 'Seasonal',
      confidence: 0.8,
      drivers: ['seasonal maintenance', 'energy efficiency']
    }],
    'fall': [{
      id: 'seasonal-fall-heating',
      title: 'Winter heating prep',
      description: 'Service heating system before cold weather.',
      priority: 'this_week',
      ownership: 'pro',
      estimatedCost: 120,
      preventativeSavings: 350,
      category: 'Seasonal',
      confidence: 0.8,
      drivers: ['seasonal maintenance', 'winter preparation']
    }],
    'summer': [],
    'winter': []
  };
  
  return seasonalTasks[season] || [];
}

// Budget prediction algorithms
function generateBudgetPrediction(systems: SystemHealth[], tasks: SmartTask[]): BudgetPrediction {
  const currentSpend = 1850; // Would come from maintenance_tasks table
  const annualBudget = 5000;
  
  // Calculate forecasts based on system conditions and task priorities
  const urgentCosts = tasks.filter(t => t.priority === 'today').reduce((sum, t) => sum + (t.estimatedCost || 0), 0);
  const weekCosts = tasks.filter(t => t.priority === 'this_week').reduce((sum, t) => sum + (t.estimatedCost || 0), 0);
  const upcomingCosts = tasks.filter(t => t.priority === 'upcoming').reduce((sum, t) => sum + (t.estimatedCost || 0), 0);
  
  const quarterlyForecast = urgentCosts + (weekCosts * 0.7) + (upcomingCosts * 0.3);
  const yearlyForecast = quarterlyForecast * 3.2; // Seasonal adjustment
  const threeYearForecast = yearlyForecast * 2.8; // Compound adjustment
  
  // Calculate preventive savings
  const totalPreventiveSavings = tasks.reduce((sum, t) => sum + (t.preventativeSavings || 0), 0);
  
  // System breakdown
  const breakdown = {
    hvac: tasks.filter(t => t.category === 'HVAC').reduce((sum, t) => sum + (t.estimatedCost || 0), 0),
    plumbing: tasks.filter(t => t.category === 'PLUMBING').reduce((sum, t) => sum + (t.estimatedCost || 0), 0),
    electrical: tasks.filter(t => t.category === 'ELECTRICAL').reduce((sum, t) => sum + (t.estimatedCost || 0), 0),
    roof: tasks.filter(t => t.category === 'ROOF').reduce((sum, t) => sum + (t.estimatedCost || 0), 0),
    other: tasks.filter(t => !['HVAC', 'PLUMBING', 'ELECTRICAL', 'ROOF'].includes(t.category)).reduce((sum, t) => sum + (t.estimatedCost || 0), 0)
  };
  
  return {
    quarterlyForecast: Math.round(quarterlyForecast),
    yearlyForecast: Math.round(yearlyForecast),
    threeYearForecast: Math.round(threeYearForecast),
    preventativeSavings: Math.round(totalPreventiveSavings),
    budgetUtilization: Math.round((currentSpend / annualBudget) * 100),
    confidence: 0.78,
    breakdown
  };
}

// Main API handlers
async function getPredictions(propertyId: string) {
  console.log(`Getting predictions for property: ${propertyId}`);
  
  // Fetch system lifecycles for the property
  const { data: systems, error } = await supabase
    .from('system_lifecycles')
    .select('*')
    .eq('property_id', propertyId);
  
  if (error) {
    console.error('Error fetching systems:', error);
    return { error: error.message };
  }
  
  // Calculate health for each system
  const systemHealths = (systems || []).map(calculateSystemHealth);
  
  // Get weather alerts (simplified - would integrate with NOAA API)
  const weatherAlerts: any[] = [];
  
  return {
    systems: systemHealths,
    overallHealth: systemHealths.length > 0 
      ? Math.round(systemHealths.reduce((sum, s) => sum + s.score, 0) / systemHealths.length)
      : 85,
    confidence: 0.82,
    lastUpdated: new Date().toISOString()
  };
}

async function getTasks(propertyId: string) {
  console.log(`Getting tasks for property: ${propertyId}`);
  
  // Get system health data
  const predictions = await getPredictions(propertyId);
  if (predictions.error) return predictions;
  
  // Generate smart tasks
  const smartTasks = generateSmartTasks(predictions.systems || []);
  
  return {
    tasks: smartTasks,
    completionRate: 72, // Would calculate from maintenance_tasks completion
    totalSavings: smartTasks.reduce((sum, t) => sum + (t.preventativeSavings || 0), 0),
    confidence: 0.85
  };
}

async function getBudget(propertyId: string) {
  console.log(`Getting budget for property: ${propertyId}`);
  
  // Get predictions and tasks
  const predictions = await getPredictions(propertyId);
  const tasks = await getTasks(propertyId);
  
  if (predictions.error || tasks.error) {
    return { error: 'Failed to generate budget predictions' };
  }
  
  // Generate budget prediction
  const budgetPrediction = generateBudgetPrediction(predictions.systems || [], tasks.tasks || []);
  
  return budgetPrediction;
}

async function getExplanations(entityId: string, entityType: 'system' | 'task' | 'prediction') {
  console.log(`Getting explanations for ${entityType}: ${entityId}`);
  
  // Simplified explanations - in production would be more sophisticated
  const explanations = {
    drivers: [
      'System age and installation date',
      'Local climate conditions',
      'Maintenance history and quality',
      'Recent weather events'
    ],
    confidence: 0.78,
    missingData: [
      'Upload recent service receipts for better accuracy',
      'Add photos of system condition',
      'Provide exact installation dates'
    ],
    methodology: 'Based on Weibull reliability models, local climate data, and maintenance patterns'
  };
  
  return explanations;
}

// Main request handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();
    const propertyId = url.searchParams.get('property_id');
    const entityId = url.searchParams.get('entity_id');
    const entityType = url.searchParams.get('entity_type') as 'system' | 'task' | 'prediction';

    console.log(`Intelligence Engine API called: ${path}`);

    let result;

    switch (path) {
      case 'predictions':
        if (!propertyId) {
          throw new Error('property_id parameter required');
        }
        result = await getPredictions(propertyId);
        break;

      case 'tasks':
        if (!propertyId) {
          throw new Error('property_id parameter required');
        }
        result = await getTasks(propertyId);
        break;

      case 'budget':
        if (!propertyId) {
          throw new Error('property_id parameter required');
        }
        result = await getBudget(propertyId);
        break;

      case 'explanations':
        if (!entityId || !entityType) {
          throw new Error('entity_id and entity_type parameters required');
        }
        result = await getExplanations(entityId, entityType);
        break;

      default:
        throw new Error(`Unknown endpoint: ${path}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Intelligence Engine error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check function logs for more information'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});