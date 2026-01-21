import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import { deriveHVACPermitSignal, type HVACPermitSignal } from '../_shared/permitSignal.ts';
import { SYSTEM_CONFIGS } from '../_shared/systemConfigs.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Create Supabase client with service role for full access
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============== Phase 2: Survival Prediction Interfaces ==============

interface SurvivalPrediction {
  failureProbability12mo: number;
  failureProbability24mo: number;
  failureProbability36mo: number;
  monthsRemaining: {
    p10: number;  // Pessimistic (10th percentile)
    p50: number;  // Expected
    p90: number;  // Optimistic (90th percentile)
  };
  drivers: Array<{
    factor: string;
    impact: 'high' | 'medium' | 'low';
    description: string;
  }>;
}

interface SystemSnapshot {
  systemKey: string;
  ageYears: number;
  ageSource: 'explicit' | 'permit' | 'inferred' | 'default';
  baselineLifespanYears: number;
  climateStressMultiplier: number;
  maintenanceQualityScore: number;
  dataCompleteness: number;
}

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
  // Phase 2: Survival prediction outputs (backward compatible)
  survival?: SurvivalPrediction;
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

// ============== Survival Prediction Functions ==============

/**
 * Build risk drivers for explainability
 */
function buildRiskDrivers(
  ageYears: number,
  lifespanYears: number,
  modifiers: { climate?: number; maintenance?: number }
): Array<{ factor: string; impact: 'high' | 'medium' | 'low'; description: string }> {
  const drivers: Array<{ factor: string; impact: 'high' | 'medium' | 'low'; description: string }> = [];
  
  const ageRatio = ageYears / lifespanYears;
  if (ageRatio > 0.8) {
    drivers.push({
      factor: 'age',
      impact: 'high',
      description: `System is ${Math.round(ageRatio * 100)}% through expected lifespan (${Math.round(ageYears)}y of ${lifespanYears}y)`
    });
  } else if (ageRatio > 0.6) {
    drivers.push({
      factor: 'age',
      impact: 'medium',
      description: `System is ${Math.round(ageRatio * 100)}% through expected lifespan`
    });
  } else if (ageRatio > 0.3) {
    drivers.push({
      factor: 'age',
      impact: 'low',
      description: `System at ${Math.round(ageRatio * 100)}% of lifespan - normal wear`
    });
  }
  
  if (modifiers.climate && modifiers.climate < 0.9) {
    drivers.push({
      factor: 'climate',
      impact: 'high',
      description: `Harsh climate reduces lifespan by ${Math.round((1 - modifiers.climate) * 100)}%`
    });
  } else if (modifiers.climate && modifiers.climate < 1.0) {
    drivers.push({
      factor: 'climate',
      impact: 'medium',
      description: `Climate impact reduces lifespan by ${Math.round((1 - modifiers.climate) * 100)}%`
    });
  }
  
  if (modifiers.maintenance && modifiers.maintenance < 0.8) {
    drivers.push({
      factor: 'maintenance',
      impact: 'high',
      description: 'Deferred maintenance significantly accelerates wear'
    });
  } else if (modifiers.maintenance && modifiers.maintenance < 0.95) {
    drivers.push({
      factor: 'maintenance',
      impact: 'medium',
      description: 'Maintenance quality could be improved'
    });
  }
  
  if (drivers.length === 0) {
    drivers.push({
      factor: 'baseline',
      impact: 'low',
      description: 'Normal wear and tear - system in good condition'
    });
  }
  
  return drivers;
}

/**
 * Calculate survival prediction using exponential decay model
 * NOTE: Assumes constant hazard rate - flag for future Weibull refinement with real failure data
 */
function calculateSurvivalPrediction(
  ageYears: number,
  lifespanYears: number,
  modifiers: { climate?: number; maintenance?: number }
): SurvivalPrediction {
  const remainingYears = Math.max(0, lifespanYears - ageYears);
  const climateMultiplier = modifiers.climate ?? 1.0;
  const maintenanceMultiplier = modifiers.maintenance ?? 1.0;
  const riskMultiplier = climateMultiplier * maintenanceMultiplier;
  const adjustedMonths = remainingYears * 12 * riskMultiplier;
  
  // Exponential decay survival function: P(fail) = 1 - exp(-λt)
  // where λ = 1/adjustedMonths (hazard rate)
  const calcProb = (horizonMonths: number): number => {
    if (adjustedMonths <= 0) return 0.99; // Near certain failure
    return parseFloat((1 - Math.exp(-horizonMonths / Math.max(1, adjustedMonths))).toFixed(4));
  };
  
  return {
    failureProbability12mo: calcProb(12),
    failureProbability24mo: calcProb(24),
    failureProbability36mo: calcProb(36),
    monthsRemaining: {
      p10: Math.round(adjustedMonths * 0.4),  // Pessimistic
      p50: Math.round(adjustedMonths),         // Expected
      p90: Math.round(adjustedMonths * 1.6)    // Optimistic
    },
    drivers: buildRiskDrivers(ageYears, lifespanYears, modifiers)
  };
}

// ============== Legacy Functions (backward compatible) ==============

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

  // Phase 2: Calculate survival prediction
  const survival = calculateSurvivalPrediction(ageYears, expectedLifespan, {
    climate: 1.0, // Would be enhanced with climate_factors table lookup
    maintenance: maintenanceMultiplier
  });

  return {
    system: system.system_type,
    score: Math.round(adjustedHealth),
    status,
    yearsRemaining: Math.round(remainingLife * 10) / 10,
    confidence: system.confidence_level || 0.75,
    nextAction: generateNextAction(system.system_type, status, remainingLife),
    nextActionDate: calculateNextActionDate(status, remainingLife),
    lastService: system.last_maintenance_date,
    // Phase 2: Include survival prediction
    survival
  };
}

function getDefaultLifespan(systemType: string): number {
  const lifespans: Record<string, number> = {
    'hvac': 15,
    'roof': 25,
    'electrical': 30,
    'electrical_panel': 30,
    'plumbing': 20,
    'water_heater': 10,
    'appliances': 12,
    'flooring': 15,
    'windows': 20,
    'pool': 15,
    'solar': 25
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
  const proSystems = ['hvac', 'electrical', 'electrical_panel', 'plumbing'];
  if (proSystems.includes(systemType) && status === 'urgent') return 'pro';
  if (systemType === 'roof' || systemType === 'electrical' || systemType === 'electrical_panel') return 'pro';
  return 'either';
}

function getEstimatedTime(systemType: string, status: string): string {
  const times: Record<string, string> = {
    'hvac': status === 'urgent' ? '4 hours' : '30 min',
    'plumbing': '1-2 hours',
    'electrical': '2-3 hours',
    'electrical_panel': '3-4 hours',
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
    'electrical_panel': 500,
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
    'electrical_panel': 600,
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
  const currentSpend = 1850;
  const annualBudget = 5000;
  
  const urgentCosts = tasks.filter(t => t.priority === 'today').reduce((sum, t) => sum + (t.estimatedCost || 0), 0);
  const weekCosts = tasks.filter(t => t.priority === 'this_week').reduce((sum, t) => sum + (t.estimatedCost || 0), 0);
  const upcomingCosts = tasks.filter(t => t.priority === 'upcoming').reduce((sum, t) => sum + (t.estimatedCost || 0), 0);
  
  const quarterlyForecast = urgentCosts + (weekCosts * 0.7) + (upcomingCosts * 0.3);
  const yearlyForecast = quarterlyForecast * 3.2;
  const threeYearForecast = yearlyForecast * 2.8;
  
  const totalPreventiveSavings = tasks.reduce((sum, t) => sum + (t.preventativeSavings || 0), 0);
  
  const breakdown = {
    hvac: tasks.filter(t => t.category === 'HVAC').reduce((sum, t) => sum + (t.estimatedCost || 0), 0),
    plumbing: tasks.filter(t => t.category === 'PLUMBING').reduce((sum, t) => sum + (t.estimatedCost || 0), 0),
    electrical: tasks.filter(t => t.category === 'ELECTRICAL' || t.category === 'ELECTRICAL_PANEL').reduce((sum, t) => sum + (t.estimatedCost || 0), 0),
    roof: tasks.filter(t => t.category === 'ROOF').reduce((sum, t) => sum + (t.estimatedCost || 0), 0),
    other: tasks.filter(t => !['HVAC', 'PLUMBING', 'ELECTRICAL', 'ELECTRICAL_PANEL', 'ROOF'].includes(t.category)).reduce((sum, t) => sum + (t.estimatedCost || 0), 0)
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

// ============== Weighted Home Health Score (Phase 2) ==============

const SYSTEM_WEIGHTS: Record<string, number> = {
  hvac: 0.30,
  roof: 0.25,
  water_heater: 0.15,
  electrical: 0.10,
  electrical_panel: 0.10,
  plumbing: 0.10,
  other: 0.05
};

function calculateWeightedHomeHealth(systems: SystemHealth[]): {
  score: number;
  confidence: number;
  drivers: string[];
} {
  if (systems.length === 0) {
    return { score: 85, confidence: 0.5, drivers: ['No system data available'] };
  }

  let weightedSum = 0;
  let weightTotal = 0;
  let minConfidence = 1;
  const drivers: string[] = [];

  for (const system of systems) {
    const weight = SYSTEM_WEIGHTS[system.system] || SYSTEM_WEIGHTS.other;
    const systemConfidence = system.confidence || 0.75;
    
    // Weight by system importance AND confidence
    weightedSum += system.score * weight * systemConfidence;
    weightTotal += weight * systemConfidence;
    minConfidence = Math.min(minConfidence, systemConfidence);
    
    if (system.status === 'urgent') {
      drivers.push(`${system.system}: urgent - needs immediate attention`);
    } else if (system.status === 'attention') {
      drivers.push(`${system.system}: attention needed`);
    }
  }

  const score = weightTotal > 0 ? Math.round(weightedSum / weightTotal) : 85;
  
  return {
    score,
    confidence: minConfidence,
    drivers: drivers.length > 0 ? drivers : ['All systems in good condition']
  };
}

// ============== API Handlers ==============

async function getPredictions(propertyId: string) {
  console.log(`Getting predictions for property: ${propertyId}`);
  
  const { data: systems, error } = await supabase
    .from('system_lifecycles')
    .select('*')
    .eq('property_id', propertyId);
  
  if (error) {
    console.error('Error fetching systems:', error);
    return { error: error.message };
  }
  
  const systemHealths = (systems || []).map(calculateSystemHealth);
  
  // Phase 2: Use weighted health calculation
  const weightedHealth = calculateWeightedHomeHealth(systemHealths);
  
  return {
    systems: systemHealths,
    overallHealth: weightedHealth.score,
    confidence: weightedHealth.confidence,
    healthDrivers: weightedHealth.drivers,
    lastUpdated: new Date().toISOString()
  };
}

async function getTasks(propertyId: string) {
  console.log(`Getting tasks for property: ${propertyId}`);
  
  const predictions = await getPredictions(propertyId);
  if (predictions.error) return predictions;
  
  const smartTasks = generateSmartTasks(predictions.systems || []);
  
  return {
    tasks: smartTasks,
    completionRate: 72,
    totalSavings: smartTasks.reduce((sum, t) => sum + (t.preventativeSavings || 0), 0),
    confidence: 0.85
  };
}

async function getBudget(propertyId: string) {
  console.log(`Getting budget for property: ${propertyId}`);
  
  const predictions = await getPredictions(propertyId);
  const tasks = await getTasks(propertyId);
  
  if (predictions.error || tasks.error) {
    return { error: 'Failed to generate budget predictions' };
  }
  
  const budgetPrediction = generateBudgetPrediction(predictions.systems || [], tasks.tasks || []);
  
  return budgetPrediction;
}

async function getExplanations(entityId: string, entityType: 'system' | 'task' | 'prediction') {
  console.log(`Getting explanations for ${entityType}: ${entityId}`);
  
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
    methodology: 'Based on exponential decay survival models, local climate data, and maintenance patterns. Future: Weibull distribution with real failure data.'
  };
  
  return explanations;
}

// ============== V1 HVAC Survival Logic (Miami-Dade Specific) ==============

const HVAC_BASELINE_LIFESPAN = 14;      // South Florida realistic average (years)
const HVAC_CLIMATE_MULTIPLIER = 0.85;   // Miami-Dade heat/humidity penalty (~15% reduction)
const HVAC_MAINTENANCE_BOOST = 1.1;     // ~10% extension for recent maintenance

// ============== HVAC Failure Window Scoring (v1) ==============
// Inline implementation - edge functions can't import from src/

/**
 * ARCHITECTURE NOTE: Data Flow
 * 
 * intelligence-engine = AUTHORITATIVE GENERATOR
 * - Computes predictions on-demand
 * - Returns fresh data to caller
 * 
 * predictions table = CACHED READ MODEL (future)
 * - Persisted for dashboard queries
 * - Invalidated when home data changes
 */

const HVAC_FAILURE_CONSTANTS = {
  model_version: 'hvac_failure_v1',
  baseline: {
    median_lifespan_years: 13,
    sigma_years: 2.5
  },
  clamps: {
    multiplier_min: 0.6,
    multiplier_max: 1.3
  }
};

function normalizeIndex(value: number | undefined): number {
  return Math.min(Math.max(value ?? 0, 0), 1);
}

function clampValue(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function yearsBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
}

function addYears(date: Date, years: number): Date {
  return new Date(date.getTime() + years * 365.25 * 24 * 60 * 60 * 1000);
}

/**
 * v1: Hardcoded climate stress mapping - CENTRALIZED for future upgrade
 * v2: Will use NOAA / ASHRAE / zone-based lookup
 */
function deriveClimateStressIndex(home: { 
  state?: string; 
  city?: string; 
  zip_code?: string 
}): number {
  const SOUTH_FLORIDA_ZIP_PREFIXES = ['330', '331', '332', '333', '334', '335'];
  const isSouthFlorida = home.state === 'FL' && 
    (home.city?.toLowerCase().includes('miami') || 
     home.city?.toLowerCase().includes('fort lauderdale') ||
     home.city?.toLowerCase().includes('hollywood') ||
     home.city?.toLowerCase().includes('hialeah') ||
     SOUTH_FLORIDA_ZIP_PREFIXES.some(prefix => home.zip_code?.startsWith(prefix)));
  
  return isSouthFlorida ? 0.80 : 0.40; // Default moderate for non-FL
}

interface HVACFailureInputs {
  installDate: Date;
  climateStressIndex: number;
  maintenanceScore: number;
  featureCompleteness: number;
  usageIndex?: number;
  environmentIndex?: number;
  installVerified: boolean;
  hasUsageSignal: boolean;
  /** Install context classification for quality penalty */
  installSource?: 'permit_replacement' | 'permit_install' | 'inferred' | 'default';
}

interface HVACFailureResult {
  p10_failure_date: string;
  p50_failure_date: string;
  p90_failure_date: string;
  years_remaining_p50: number;
  confidence_0_1: number;
  provenance: any;
}

function scoreHVACFailureWindow(
  inputs: HVACFailureInputs,
  now: Date = new Date()
): HVACFailureResult {
  const {
    installDate,
    climateStressIndex,
    maintenanceScore,
    featureCompleteness,
    usageIndex,
    environmentIndex,
    installVerified,
    hasUsageSignal,
    installSource
  } = inputs;

  // Normalize all indices
  const normClimate = normalizeIndex(climateStressIndex);
  const normMaintenance = normalizeIndex(maintenanceScore);
  const normCompleteness = normalizeIndex(featureCompleteness);
  const normUsage = normalizeIndex(usageIndex);
  const normEnvironment = normalizeIndex(environmentIndex);

  // Calculate multipliers
  const M_climate = 1 - 0.18 * normClimate;
  const M_maintenance = 0.85 + 0.25 * normMaintenance;
  
  // Replacement installs have slightly lower quality certainty
  // This affects install quality, NOT lifespan baseline or confidence directly
  const installQualityPenalty = installSource === 'permit_replacement' ? 0.03 : 0;
  const M_install = 0.97 + (installVerified ? 0.06 : 0) - installQualityPenalty;
  
  const M_usage = 1 - 0.12 * normUsage;
  const M_environment = 1 - 0.10 * normEnvironment;
  const M_unknowns = 0.90 + 0.10 * normCompleteness;

  let M_total = M_climate * M_maintenance * M_install * M_usage * M_environment * M_unknowns;
  M_total = clampValue(M_total, HVAC_FAILURE_CONSTANTS.clamps.multiplier_min, HVAC_FAILURE_CONSTANTS.clamps.multiplier_max);

  // Lifespan calculations
  const L50_base = HVAC_FAILURE_CONSTANTS.baseline.median_lifespan_years;
  const sigma_base = HVAC_FAILURE_CONSTANTS.baseline.sigma_years;
  const L50_effective = L50_base * M_total;

  const age_years = Math.max(yearsBetween(installDate, now), 0);
  const years_remaining_p50 = Math.max(L50_effective - age_years, 0);

  // Dynamic uncertainty expansion
  const sigma_effective = sigma_base * (1 + 0.9 * (1 - normCompleteness));
  const Z_10 = 1.2816;

  let L10 = L50_effective - Z_10 * sigma_effective;
  let L90 = L50_effective + Z_10 * sigma_effective;
  L10 = clampValue(L10, 3, 30);
  L90 = clampValue(L90, 3, 30);

  // Calculate failure dates
  const p10_failure_date = addYears(installDate, L10);
  const p50_failure_date = addYears(installDate, L50_effective);
  const p90_failure_date = addYears(installDate, L90);

  const ensureFutureDate = (date: Date): Date => date < now ? now : date;

  // Confidence score
  const confidence = clampValue(
    0.25 +
    (installVerified ? 0.30 : 0) +
    0.25 * normMaintenance +
    0.10 * normCompleteness +
    0.10 * (hasUsageSignal ? 1 : 0),
    0, 1
  );

  return {
    install_date: installDate.toISOString(),
    current_age_years: Number(age_years.toFixed(1)),
    p10_failure_date: ensureFutureDate(p10_failure_date).toISOString(),
    p50_failure_date: ensureFutureDate(p50_failure_date).toISOString(),
    p90_failure_date: ensureFutureDate(p90_failure_date).toISOString(),
    years_remaining_p50: Number(years_remaining_p50.toFixed(1)),
    confidence_0_1: Number(confidence.toFixed(2)),
    provenance: {
      model_version: HVAC_FAILURE_CONSTANTS.model_version,
      multipliers: { M_climate, M_maintenance, M_install, M_usage, M_environment, M_unknowns, M_total },
      baseline: { L50_base, sigma_base },
      effective: { L50_effective, sigma_effective }
    }
  };
}

interface HVACSurvivalCore {
  ageYears: number;
  remainingYears: number;
  adjustedLifespanYears: number;
  status: 'low' | 'moderate' | 'high';
  hasRecentMaintenance: boolean;
  installSource: 'permit_replacement' | 'permit_install' | 'inferred' | 'default';
}

interface HVACSystemPrediction {
  systemKey: 'hvac';
  status: 'low' | 'moderate' | 'high';
  header: {
    name: 'HVAC';
    installedLine: string;
    statusLabel: string;
  };
  forecast: {
    headline: 'What to Expect';
    summary: string;
    reassurance?: string;
    state: 'reassuring' | 'watch' | 'urgent';
  };
  why: {
    bullets: string[];
    riskContext?: string[];
    sourceLabel?: string;
  };
  factors: {
    helps: string[];
    hurts: string[];
  };
  actions: Array<{
    title: string;
    metaLine: string;
    priority: 'standard' | 'high';
    diyOrPro: 'DIY' | 'PRO' | 'Either';
    chatdiySlug: string;
  }>;
  planning?: {
    text: string;
  };
  history?: Array<{
    date: string;
    description: string;
    source: string;
  }>;
  lifespan?: {
    p10_failure_date: string;
    p50_failure_date: string;
    p90_failure_date: string;
    years_remaining_p50: number;
    confidence_0_1: number;
    provenance?: any;
  };
}

function determineHVACSystemAge(
  explicitInstallYear: number | null,
  homeYearBuilt: number | null,
  permits: any[]
): { ageYears: number; installSource: HVACSurvivalCore['installSource'] } {
  const currentYear = new Date().getFullYear();
  
  if (explicitInstallYear) {
    return { ageYears: currentYear - explicitInstallYear, installSource: 'permit_replacement' };
  }
  
  // Priority 2: HVAC replacement permit (includes "change out", "upgrade")
  const replacementKeywords = ['replace', 'change out', 'upgrade', 'new unit', 'changeout'];
  const hvacReplacementPermit = permits.find(p => {
    const desc = (p.description || p.work_description || '').toLowerCase();
    const isHVAC = desc.includes('hvac') || desc.includes('air condition') || 
                   desc.includes('a/c') || desc.includes('ac unit') ||
                   (p.permit_type || '').toLowerCase().includes('mechanical');
    return isHVAC && replacementKeywords.some(kw => desc.includes(kw));
  });
  
  if (hvacReplacementPermit?.issue_date) {
    return { 
      ageYears: currentYear - new Date(hvacReplacementPermit.issue_date).getFullYear(),
      installSource: 'permit_replacement'
    };
  }
  
  // Priority 3: Any HVAC permit (install, new)
  const hvacInstallPermit = permits.find(p => {
    const desc = (p.description || p.work_description || '').toLowerCase();
    const isHVAC = desc.includes('hvac') || desc.includes('air condition') || 
                   desc.includes('a/c') || desc.includes('ac unit') ||
                   (p.permit_type || '').toLowerCase().includes('mechanical');
    return isHVAC && (desc.includes('install') || desc.includes('new'));
  });
  
  if (hvacInstallPermit?.issue_date) {
    return { 
      ageYears: currentYear - new Date(hvacInstallPermit.issue_date).getFullYear(),
      installSource: 'permit_install'
    };
  }
  
  // Priority 4: Inferred from home age
  if (homeYearBuilt) {
    const homeAge = currentYear - homeYearBuilt;
    return { ageYears: homeAge < 15 ? homeAge : 7, installSource: 'inferred' };
  }
  
  return { ageYears: 8, installSource: 'default' };
}

function calculateHVACSurvivalCore(
  installYear: number | null,
  homeYearBuilt: number | null,
  hasRecentMaintenance: boolean,
  permits: any[]
): HVACSurvivalCore {
  const { ageYears, installSource } = determineHVACSystemAge(installYear, homeYearBuilt, permits);
  
  const maintenanceMultiplier = hasRecentMaintenance ? HVAC_MAINTENANCE_BOOST : 1.0;
  const adjustedLifespanYears = HVAC_BASELINE_LIFESPAN * HVAC_CLIMATE_MULTIPLIER * maintenanceMultiplier;
  const remainingYears = Math.max(0, adjustedLifespanYears - ageYears);
  
  const status: HVACSurvivalCore['status'] = 
    remainingYears > 3 ? 'low' : 
    remainingYears > 1 ? 'moderate' : 
    'high';

  return { ageYears, remainingYears, adjustedLifespanYears, status, hasRecentMaintenance, installSource };
}

function buildHVACPredictionOutput(
  core: HVACSurvivalCore,
  context: { 
    installYear?: number; 
    permits: any[]; 
    history?: any[];
    lifespan?: HVACFailureResult;
    isSouthFlorida?: boolean;
    hasLimitedHistory?: boolean;
    permitSignal?: HVACPermitSignal;  // Centralized permit signal
  }
): HVACSystemPrediction {
  const { status, remainingYears, hasRecentMaintenance, installSource, ageYears } = core;
  
  const statusLabels: Record<string, string> = {
    low: 'Low Risk',
    moderate: 'Moderate Risk',
    high: 'High Risk',
  };
  
  const forecasts: Record<string, { summary: string; reassurance?: string; state: 'reassuring' | 'watch' | 'urgent' }> = {
    low: {
      summary: "Low risk over the next year.",
      reassurance: "No urgent action is required right now.",
      state: 'reassuring',
    },
    moderate: {
      summary: "Likely to need attention in 6–12 months.",
      reassurance: "This is a watch item, not an emergency.",
      state: 'watch',
    },
    high: {
      summary: "Likely to need attention within the next 3–6 months.",
      reassurance: undefined,
      state: 'urgent',
    },
  };
  
  // PROTECTIVE factors - why things are going well (for Home Health card)
  // Canonical rule: Home Health card may only explain stability, not risk
  const protectiveBullets: string[] = [];
  
  if (remainingYears > 3) {
    protectiveBullets.push("HVAC system age is well within expected lifespan");
  }
  if (hasRecentMaintenance) {
    protectiveBullets.push("Recent maintenance activity is extending system life");
  }
  if (installSource.includes('permit')) {
    protectiveBullets.push("Install date verified through permit records");
  }
  // Always add baseline reassurance
  protectiveBullets.push("Local climate conditions are continuously monitored");
  
  // RISK context - for system drill-down only (never in Home Health card)
  const riskBullets: string[] = [];
  
  // TWEAK #3: Order bullets - permit absence FIRST, then low-confidence
  // Users first ask "why is data missing?" then "how does it improve?"
  
  // 1. Permit absence reassurance (if applicable)
  if (!context.permitSignal?.verified) {
    riskBullets.push("No permit records found for this system. Estimate based on property characteristics and regional data.");
  }
  
  // 2. Low-confidence improvement note (if applicable)
  if (context.lifespan?.confidence_0_1 && context.lifespan.confidence_0_1 < 0.5) {
    riskBullets.push("This estimate will improve as service history and usage data are added.");
  }
  
  // 3. Then add existing contextual bullets
  if (context.isSouthFlorida !== false) {
    riskBullets.push("High heat & humidity accelerate wear over time");
  }
  if (ageYears > 10) {
    riskBullets.push("System age increases likelihood of component fatigue");
  }
  if (remainingYears <= 3) {
    riskBullets.push("System age is approaching typical replacement range");
  }
  if (context.hasLimitedHistory) {
    riskBullets.push("Limited service history adds uncertainty");
  }
  
  const actions: HVACSystemPrediction['actions'] = status !== 'low' ? [
    {
      title: "Replace HVAC filter",
      metaLine: "$20 · 30 min DIY",
      priority: 'standard',
      diyOrPro: 'DIY',
      chatdiySlug: 'hvac-filter-replacement',
    },
    {
      title: "Seasonal HVAC inspection",
      metaLine: "$80–$120 · Schedule PRO",
      priority: status === 'high' ? 'high' : 'standard',
      diyOrPro: 'PRO',
      chatdiySlug: 'hvac-seasonal-inspection',
    },
  ] : [];
  
  const planning = remainingYears <= 3 ? {
    text: "If replacement is needed, typical costs range from $6,000–$12,000 depending on size and efficiency."
  } : undefined;
  
  const computedInstallYear = context.installYear || (new Date().getFullYear() - ageYears);
  const sourceNote = installSource === 'permit_replacement' || installSource === 'permit_install'
    ? '(based on permit)'
    : '(estimated)';
  
  const helps: string[] = hasRecentMaintenance ? ['Recent maintenance logged'] : [];
  const hurts: string[] = context.isSouthFlorida !== false ? ['South Florida climate stress'] : [];
  if (ageYears > 10) hurts.push('System age > 10 years');
  
  // Build lifespan block from failure window result (semantic only)
  const lifespan = context.lifespan ? {
    install_date: context.lifespan.install_date,
    current_age_years: context.lifespan.current_age_years,
    p10_failure_date: context.lifespan.p10_failure_date,
    p50_failure_date: context.lifespan.p50_failure_date,
    p90_failure_date: context.lifespan.p90_failure_date,
    years_remaining_p50: context.lifespan.years_remaining_p50,
    confidence_0_1: context.lifespan.confidence_0_1,
    provenance: context.lifespan.provenance,
  } : undefined;
  
  return {
    systemKey: 'hvac',
    status,
    header: {
      name: 'HVAC',
      installedLine: `Installed ~${computedInstallYear} ${sourceNote}`,
      statusLabel: statusLabels[status],
    },
    forecast: {
      headline: 'What to Expect',
      ...forecasts[status],
    },
    why: {
      bullets: protectiveBullets,
      riskContext: riskBullets,
      sourceLabel: installSource.includes('permit') ? 'Based on permit records' : undefined,
    },
    factors: { helps, hurts },
    actions,
    planning,
    history: context.history,
    lifespan,
  };
}

async function getHVACPrediction(homeId: string): Promise<HVACSystemPrediction> {
  console.log(`Getting HVAC prediction for home: ${homeId}`);
  
  // 1. Fetch home data for year_built, state, city, zip
  const { data: home } = await supabase
    .from('homes')
    .select('year_built, state, city, zip_code')
    .eq('id', homeId)
    .single();
  
  // 2. Fetch HVAC system from canonical 'systems' table (NOT home_systems)
  const { data: systemsData, error: systemsError } = await supabase
    .from('systems')
    .select('install_year, install_source, confidence')
    .eq('home_id', homeId)
    .eq('kind', 'hvac')
    .limit(1);
  
  if (systemsError) {
    console.warn(`[getHVACPrediction] Error fetching systems: ${systemsError.message}`);
  }
  
  const hvacSystem = systemsData?.[0];
  const explicitInstallYear = hvacSystem?.install_year || null;
  const installSource = hvacSystem?.install_source || 'unknown';
  
  // IMPORTANT: No fallback to home_systems - log if missing
  if (!hvacSystem) {
    console.warn(`[getHVACPrediction] No HVAC system record found in systems table for home: ${homeId}`);
  } else {
    console.log(`[getHVACPrediction] Found HVAC system: install_year=${explicitInstallYear}, source=${installSource}`);
  }
  
  // 3. Fetch permit history from canonical 'permits' table (NOT habitta_permits)
  const { data: permits, error: permitsError } = await supabase
    .from('permits')
    .select('*')
    .eq('home_id', homeId)
    .order('date_issued', { ascending: false });
  
  if (permitsError) {
    console.warn(`[getHVACPrediction] Error fetching permits: ${permitsError.message}`);
  } else {
    console.log(`[getHVACPrediction] Found ${permits?.length || 0} permits for home`);
  }
  
  // 3.5 Derive HVAC permit signal using CENTRALIZED extractor (SINGLE SOURCE OF TRUTH)
  const permitSignal = deriveHVACPermitSignal(permits || []);
  console.log(`[getHVACPrediction] HVAC permit signal: verified=${permitSignal.verified}, year=${permitSignal.installYear}, source=${permitSignal.installSource}`);
  
  // 4. Check recent maintenance (last 12 months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  
  const { data: recentMaintenance } = await supabase
    .from('habitta_system_events')
    .select('id, event_date, description')
    .eq('home_id', homeId)
    .eq('system_type', 'hvac')
    .eq('event_type', 'maintenance')
    .gte('event_date', twelveMonthsAgo.toISOString().split('T')[0])
    .limit(5);
  
  const hasRecentMaintenance = (recentMaintenance?.length || 0) > 0;
  const maintenanceCount = recentMaintenance?.length || 0;
  
  // 5. Get maintenance history for display
  const { data: historyEvents } = await supabase
    .from('habitta_system_events')
    .select('event_date, description, source')
    .eq('home_id', homeId)
    .eq('system_type', 'hvac')
    .order('event_date', { ascending: false })
    .limit(5);
  
  const history = historyEvents?.map(e => ({
    date: e.event_date,
    description: e.description || 'Maintenance performed',
    source: e.source || 'user'
  }));
  
  // 6. Calculate core survival (existing logic)
  const core = calculateHVACSurvivalCore(
    explicitInstallYear,
    home?.year_built,
    hasRecentMaintenance,
    permits || []
  );
  
  // 7. Calculate failure window using new scoring model
  const currentYear = new Date().getFullYear();
  const computedInstallYear = explicitInstallYear || (currentYear - core.ageYears);
  const installDate = new Date(computedInstallYear, 0, 1); // Jan 1 of install year
  
  // Derive climate stress using centralized function
  const climateStressIndex = deriveClimateStressIndex({
    state: home?.state,
    city: home?.city,
    zip_code: home?.zip_code
  });
  
  // Calculate maintenance score (0-1 based on recent events)
  const maintenanceScore = Math.min(maintenanceCount / 2, 1); // 2+ events = max score
  
  // Calculate feature completeness (what data do we have?)
  let featureCompleteness = 0.25; // Base
  if (explicitInstallYear) featureCompleteness += 0.30;
  if (permits && permits.length > 0) featureCompleteness += 0.20;
  if (maintenanceCount > 0) featureCompleteness += 0.15;
  if (hvacSystem?.confidence) featureCompleteness += 0.10;
  featureCompleteness = Math.min(featureCompleteness, 1);
  
  const installVerified = core.installSource === 'permit_replacement' || core.installSource === 'permit_install';
  
  const failureWindow = scoreHVACFailureWindow({
    installDate,
    climateStressIndex,
    maintenanceScore,
    featureCompleteness,
    installVerified,
    hasUsageSignal: false, // v1: no telemetry
    usageIndex: 0,
    environmentIndex: 0,
    // Pass install source for replacement penalty calculation
    installSource: permitSignal.installSource || core.installSource
  });
  
  console.log(`[getHVACPrediction] Failure window calculated:`, {
    p50_year: new Date(failureWindow.p50_failure_date).getFullYear(),
    years_remaining: failureWindow.years_remaining_p50,
    confidence: failureWindow.confidence_0_1
  });
  
  // 8. Determine if South Florida
  const isSouthFlorida = climateStressIndex >= 0.7;
  const hasLimitedHistory = maintenanceCount < 2;
  
  // 9. Build presentation with lifespan block and permit signal
  return buildHVACPredictionOutput(core, {
    installYear: explicitInstallYear ?? undefined,
    permits: permits || [],
    history,
    lifespan: failureWindow,
    isSouthFlorida,
    hasLimitedHistory,
    permitSignal,  // Pass centralized signal for UI messaging
  });
}

// ============== Main Request Handler ==============

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ========== HYBRID AUTH: Internal secret OR User JWT ==========
    const internalSecret = req.headers.get('x-internal-secret');
    const expectedSecret = Deno.env.get('INTERNAL_ENRICH_SECRET');
    const authHeader = req.headers.get('Authorization');
    
    const isInternal = expectedSecret && internalSecret === expectedSecret;
    const isUserAuth = authHeader?.startsWith('Bearer ');
    
    if (!isInternal && !isUserAuth) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // For internal calls, log the trigger reason
    let body: any = null;
    try {
      body = await req.json();
    } catch (_) {
      // no body provided
    }
    
    if (isInternal && body?.reason) {
      console.log(`[intelligence-engine] Internal trigger: ${body.reason} for home: ${body.home_id || body.property_id}`);
    }

    const url = new URL(req.url);
    let action = url.searchParams.get('action') || undefined;
    let propertyId = url.searchParams.get('property_id') || undefined;
    let entityId = url.searchParams.get('entity_id') || undefined;
    let entityType = url.searchParams.get('entity_type') as 'system' | 'task' | 'prediction' | undefined;

    if (body) {
      action = body.action || action;
      propertyId = body.property_id || body.home_id || propertyId;
      entityId = body.entity_id || entityId;
      entityType = (body.entity_type as any) || entityType;
    }
    
    // For user-authenticated calls, validate ownership
    if (isUserAuth && propertyId) {
      const token = authHeader!.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Verify the home belongs to the user
      console.log(`[intelligence-engine] Verifying ownership: propertyId=${propertyId}, userId=${user.id}`);
      
      const { data: home, error: homeError } = await supabase
        .from('homes')
        .select('id, user_id')
        .eq('id', propertyId)
        .eq('user_id', user.id)
        .single();
      
      if (homeError || !home) {
        console.error(`[intelligence-engine] Home verification failed:`, {
          homeError: homeError?.message,
          homeErrorCode: homeError?.code,
          propertyId,
          userId: user.id,
          homeFound: !!home
        });
        
        // Debug: Check if home exists at all
        const { data: anyHome } = await supabase
          .from('homes')
          .select('id, user_id')
          .eq('id', propertyId)
          .single();
        
        console.log(`[intelligence-engine] Debug - home exists: ${!!anyHome}, actual user_id: ${anyHome?.user_id}`);
        
        return new Response(
          JSON.stringify({ error: 'Home not found or access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!action) throw new Error('Missing action. Use one of: predictions, tasks, budget, explanations');

    console.log(`[intelligence-engine] Action: ${action}, Property: ${propertyId}, Internal: ${isInternal}`);

    let result;

    switch (action) {
      case 'predictions':
        if (!propertyId) throw new Error('property_id parameter required');
        result = await getPredictions(propertyId);
        break;

      case 'tasks':
        if (!propertyId) throw new Error('property_id parameter required');
        result = await getTasks(propertyId);
        break;

      case 'budget':
        if (!propertyId) throw new Error('property_id parameter required');
        result = await getBudget(propertyId);
        break;

      case 'explanations':
        if (!entityId || !entityType) {
          throw new Error('entity_id and entity_type parameters required');
        }
        result = await getExplanations(entityId, entityType);
        break;

      case 'hvac-prediction':
        if (!propertyId) throw new Error('property_id parameter required');
        result = await getHVACPrediction(propertyId);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Intelligence Engine error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
