import { Permit } from './permitAPI';

export interface PermitInsight {
  id: string;
  systemType: string;
  installationDate: string;
  permitType: string;
  description: string;
  valuation?: number;
  contractor?: string;
  maintenanceSchedule: MaintenanceItem[];
  seasonalTips: SeasonalTip[];
  financialInsights: FinancialInsight[];
}

export interface MaintenanceItem {
  task: string;
  frequency: string;
  urgency: 'low' | 'medium' | 'high';
  estimatedCost?: number;
  diyFriendly: boolean;
  season?: string;
}

export interface SeasonalTip {
  season: string;
  tip: string;
  urgency: 'low' | 'medium' | 'high';
  actionRequired: boolean;
}

export interface FinancialInsight {
  type: 'warranty' | 'insurance' | 'tax_credit' | 'roi' | 'energy_savings';
  title: string;
  description: string;
  potentialValue?: number;
  actionRequired: boolean;
  deadline?: string;
}

const SYSTEM_KEYWORDS = {
  pool: ['pool', 'swimming', 'spa', 'chlorine', 'filtration', 'pump'],
  hvac: ['hvac', 'air condition', 'heating', 'cooling', 'heat pump', 'ac unit', 'furnace'],
  hurricane_shutters: ['hurricane', 'shutter', 'storm', 'protection', 'wind'],
  roofing: ['roof', 'shingle', 'tile', 'gutter', 'flashing'],
  electrical: ['electrical', 'electric', 'panel', 'wiring', 'outlet'],
  plumbing: ['plumb', 'water', 'pipe', 'sewer', 'drain'],
  windows: ['window', 'glass', 'pane'],
  driveway: ['driveway', 'pave', 'concrete', 'asphalt'],
  flooring: ['floor', 'tile', 'wood', 'carpet', 'laminate'],
  solar: ['solar', 'photovoltaic', 'pv', 'inverter']
};

const MAINTENANCE_SCHEDULES = {
  pool: [
    {
      task: 'Chemical balance testing',
      frequency: 'Weekly',
      urgency: 'medium' as const,
      estimatedCost: 50,
      diyFriendly: true
    },
    {
      task: 'Filter cleaning/replacement',
      frequency: 'Monthly',
      urgency: 'medium' as const,
      estimatedCost: 30,
      diyFriendly: true
    },
    {
      task: 'Professional equipment inspection',
      frequency: 'Annually',
      urgency: 'medium' as const,
      estimatedCost: 150,
      diyFriendly: false
    },
    {
      task: 'Pool equipment winterization',
      frequency: 'Seasonally',
      urgency: 'high' as const,
      estimatedCost: 200,
      diyFriendly: false,
      season: 'winter'
    }
  ],
  hurricane_shutters: [
    {
      task: 'Shutter operation test',
      frequency: 'Before hurricane season (May)',
      urgency: 'high' as const,
      estimatedCost: 0,
      diyFriendly: true,
      season: 'spring'
    },
    {
      task: 'Hardware lubrication and cleaning',
      frequency: 'Annually',
      urgency: 'medium' as const,
      estimatedCost: 25,
      diyFriendly: true
    },
    {
      task: 'Professional inspection for wear',
      frequency: 'Every 2 years',
      urgency: 'medium' as const,
      estimatedCost: 100,
      diyFriendly: false
    }
  ],
  hvac: [
    {
      task: 'Filter replacement',
      frequency: 'Every 3 months',
      urgency: 'high' as const,
      estimatedCost: 25,
      diyFriendly: true
    },
    {
      task: 'System tune-up and inspection',
      frequency: 'Twice yearly',
      urgency: 'high' as const,
      estimatedCost: 150,
      diyFriendly: false,
      season: 'spring'
    },
    {
      task: 'Duct cleaning',
      frequency: 'Every 3-5 years',
      urgency: 'medium' as const,
      estimatedCost: 400,
      diyFriendly: false
    }
  ],
  driveway: [
    {
      task: 'Pressure washing',
      frequency: 'Annually',
      urgency: 'low' as const,
      estimatedCost: 150,
      diyFriendly: true
    },
    {
      task: 'Sealing and protection',
      frequency: 'Every 2-3 years',
      urgency: 'medium' as const,
      estimatedCost: 300,
      diyFriendly: false
    },
    {
      task: 'Crack inspection and repair',
      frequency: 'Seasonally',
      urgency: 'medium' as const,
      estimatedCost: 200,
      diyFriendly: false
    }
  ]
};

const SEASONAL_TIPS = {
  pool: [
    {
      season: 'spring',
      tip: 'Start up pool equipment, check for winter damage, balance chemicals',
      urgency: 'high' as const,
      actionRequired: true
    },
    {
      season: 'summer',
      tip: 'Monitor chemical levels more frequently due to increased usage and heat',
      urgency: 'medium' as const,
      actionRequired: true
    },
    {
      season: 'fall',
      tip: 'Reduce chemical treatment as usage decreases, prepare for potential storms',
      urgency: 'medium' as const,
      actionRequired: false
    },
    {
      season: 'winter',
      tip: 'Consider winterization in freezing areas, maintain basic filtration in Florida',
      urgency: 'low' as const,
      actionRequired: false
    }
  ],
  hurricane_shutters: [
    {
      season: 'spring',
      tip: 'Test all shutters before hurricane season, check hardware and tracks',
      urgency: 'high' as const,
      actionRequired: true
    },
    {
      season: 'summer',
      tip: 'Keep shutters easily accessible, monitor weather forecasts closely',
      urgency: 'high' as const,
      actionRequired: true
    },
    {
      season: 'fall',
      tip: 'Peak hurricane season - ensure quick deployment capability',
      urgency: 'high' as const,
      actionRequired: true
    },
    {
      season: 'winter',
      tip: 'Post-season maintenance, clean and inspect for next year',
      urgency: 'low' as const,
      actionRequired: false
    }
  ],
  hvac: [
    {
      season: 'spring',
      tip: 'Schedule pre-cooling season tune-up, replace filters, check refrigerant',
      urgency: 'high' as const,
      actionRequired: true
    },
    {
      season: 'summer',
      tip: 'Monitor performance during peak usage, change filters regularly',
      urgency: 'medium' as const,
      actionRequired: true
    },
    {
      season: 'fall',
      tip: 'Prepare for heating season, inspect heat strips or heat pump',
      urgency: 'medium' as const,
      actionRequired: true
    },
    {
      season: 'winter',
      tip: 'Monitor heating efficiency, check for ice on outdoor unit',
      urgency: 'medium' as const,
      actionRequired: false
    }
  ]
};

export const analyzePermits = (permits: Permit[]): PermitInsight[] => {
  const insights: PermitInsight[] = [];
  
  permits.forEach(permit => {
    const systemType = identifySystemType(permit);
    if (systemType) {
      const insight = createPermitInsight(permit, systemType);
      insights.push(insight);
    }
  });
  
  return insights.sort((a, b) => new Date(b.installationDate).getTime() - new Date(a.installationDate).getTime());
};

const identifySystemType = (permit: Permit): string | null => {
  const searchText = `${permit.permit_type || ''} ${permit.description || ''} ${permit.work_class || ''}`.toLowerCase();
  
  for (const [systemType, keywords] of Object.entries(SYSTEM_KEYWORDS)) {
    if (keywords.some(keyword => searchText.includes(keyword))) {
      return systemType;
    }
  }
  
  return null;
};

const createPermitInsight = (permit: Permit, systemType: string): PermitInsight => {
  const installationDate = permit.date_finaled || permit.date_issued || new Date().toISOString();
  const installYear = new Date(installationDate).getFullYear();
  const currentYear = new Date().getFullYear();
  const systemAge = currentYear - installYear;
  
  return {
    id: permit.id,
    systemType,
    installationDate,
    permitType: permit.permit_type || 'Unknown',
    description: permit.description || '',
    valuation: permit.valuation,
    contractor: permit.contractor_name,
    maintenanceSchedule: MAINTENANCE_SCHEDULES[systemType as keyof typeof MAINTENANCE_SCHEDULES] || [],
    seasonalTips: SEASONAL_TIPS[systemType as keyof typeof SEASONAL_TIPS] || [],
    financialInsights: generateFinancialInsights(systemType, systemAge, permit.valuation)
  };
};

const generateFinancialInsights = (systemType: string, systemAge: number, valuation?: number): FinancialInsight[] => {
  const insights: FinancialInsight[] = [];
  
  // Warranty insights for new systems
  if (systemAge <= 2) {
    if (systemType === 'hvac') {
      insights.push({
        type: 'warranty',
        title: 'HVAC Warranty Period',
        description: `Your ${systemAge}-year-old HVAC system is likely still under warranty. Schedule professional maintenance to keep warranty valid.`,
        actionRequired: true,
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 90 days
      });
    }
    
    if (systemType === 'pool') {
      insights.push({
        type: 'warranty',
        title: 'Pool Equipment Warranty',
        description: 'New pool equipment typically has 1-3 year warranties. Keep maintenance records for warranty claims.',
        actionRequired: false
      });
    }
  }
  
  // Insurance discounts
  if (systemType === 'hurricane_shutters') {
    insights.push({
      type: 'insurance',
      title: 'Hurricane Shutter Insurance Discount',
      description: 'Your hurricane shutters may qualify for homeowners insurance discounts. Contact your insurer to apply.',
      potentialValue: 200,
      actionRequired: true
    });
  }
  
  // Energy efficiency insights
  if (systemType === 'hvac' && systemAge <= 1) {
    insights.push({
      type: 'energy_savings',
      title: 'New HVAC Efficiency Tracking',
      description: 'Monitor energy bills to track savings from your new HVAC system. Expected 20-40% reduction in cooling costs.',
      potentialValue: 800,
      actionRequired: false
    });
  }
  
  // Investment protection
  if (valuation && valuation > 10000) {
    insights.push({
      type: 'roi',
      title: 'Investment Protection',
      description: `Protect your $${valuation.toLocaleString()} investment with proper maintenance. Regular care can extend lifespan by 30-50%.`,
      potentialValue: valuation * 0.3,
      actionRequired: true
    });
  }
  
  return insights;
};

export const getSeasonalRecommendations = (insights: PermitInsight[], currentSeason: string) => {
  const seasonalRecs: Array<{
    system: string;
    tip: string;
    urgency: 'low' | 'medium' | 'high';
    actionRequired: boolean;
    installationYear: number;
  }> = [];
  
  insights.forEach(insight => {
    const seasonalTips = insight.seasonalTips.filter(tip => tip.season === currentSeason);
    const installYear = new Date(insight.installationDate).getFullYear();
    
    seasonalTips.forEach(tip => {
      seasonalRecs.push({
        system: insight.systemType,
        tip: tip.tip,
        urgency: tip.urgency,
        actionRequired: tip.actionRequired,
        installationYear: installYear
      });
    });
  });
  
  return seasonalRecs.sort((a, b) => {
    // Prioritize by urgency, then by newer systems
    if (a.urgency !== b.urgency) {
      const urgencyOrder = { high: 3, medium: 2, low: 1 };
      return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
    }
    return b.installationYear - a.installationYear;
  });
};

export const getCurrentSeason = (): string => {
  const month = new Date().getMonth() + 1; // 1-12
  
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
};