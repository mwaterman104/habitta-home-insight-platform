 /**
  * Appliance & Minor Repair Configuration
  * 
  * Separate from capital systems (SYSTEM_CONFIGS) to prevent over-escalation.
  * These items have simple cost ranges, DIY eligibility, and calm tones.
  * 
  * @version v1
  */
 
 export type IssueTier = 'small_appliance' | 'medium_system' | 'capital_system';
 
export type SmallApplianceType = 
  | 'garbage_disposal' 
  | 'faucet' 
  | 'toilet'
  | 'toilet_flapper'
  | 'gfci_outlet'
  | 'doorbell'
  | 'smoke_detector'
  | 'microwave';
 
export type MediumSystemType = 
  | 'sump_pump'
  | 'garage_door_opener'
  | 'dishwasher_repair'
  | 'water_softener'
  | 'whole_house_fan'
  | 'washing_machine'
  | 'dryer'
  | 'refrigerator'
  | 'oven_range';
 
 export type ApplianceType = SmallApplianceType | MediumSystemType;
 
 export interface ApplianceConfig {
   tier: IssueTier;
   displayName: string;
   costRange: { min: number; max: number };
   typicalLifespan: number;
   diyEligible: boolean;
   keywords: string[];
   /** Trade type for professional referral (optional) */
   tradeType?: string;
 }
 
 /**
  * Tier 1: Small Appliance / Minor Mechanical
  * Cost: $50-$500, often DIY-capable, no lifecycle anxiety
  */
 export const SMALL_APPLIANCE_CONFIGS: Record<SmallApplianceType, ApplianceConfig> = {
   garbage_disposal: {
     tier: 'small_appliance',
     displayName: 'Garbage Disposal',
     costRange: { min: 150, max: 400 },
     typicalLifespan: 12,
     diyEligible: true,
     keywords: ['disposal', 'garbage disposal', 'kitchen disposal', 'insinkerator', 'garbage disposer'],
     tradeType: 'plumber',
   },
   faucet: {
     tier: 'small_appliance',
     displayName: 'Faucet',
     costRange: { min: 100, max: 350 },
     typicalLifespan: 20,
     diyEligible: true,
     keywords: ['faucet', 'tap', 'sink faucet', 'kitchen faucet', 'bathroom faucet', 'leaky faucet'],
     tradeType: 'plumber',
   },
   toilet: {
     tier: 'small_appliance',
     displayName: 'Toilet',
     costRange: { min: 150, max: 500 },
     typicalLifespan: 25,
     diyEligible: true,
     keywords: ['toilet', 'commode', 'running toilet', 'toilet replacement'],
     tradeType: 'plumber',
   },
   toilet_flapper: {
     tier: 'small_appliance',
     displayName: 'Toilet Flapper/Fill Valve',
     costRange: { min: 15, max: 75 },
     typicalLifespan: 5,
     diyEligible: true,
     keywords: ['flapper', 'fill valve', 'toilet running', 'toilet leak', 'toilet internals'],
     tradeType: 'plumber',
   },
   gfci_outlet: {
     tier: 'small_appliance',
     displayName: 'GFCI Outlet',
     costRange: { min: 75, max: 200 },
     typicalLifespan: 15,
     diyEligible: false, // Electrical work - recommend pro
     keywords: ['gfci', 'outlet', 'electrical outlet', 'gfci outlet', 'tripped outlet', 'bathroom outlet', 'kitchen outlet'],
     tradeType: 'electrician',
   },
   doorbell: {
     tier: 'small_appliance',
     displayName: 'Doorbell',
     costRange: { min: 50, max: 200 },
     typicalLifespan: 15,
     diyEligible: true,
     keywords: ['doorbell', 'door bell', 'chime', 'ring doorbell'],
     tradeType: 'electrician',
   },
  smoke_detector: {
    tier: 'small_appliance',
    displayName: 'Smoke Detector',
    costRange: { min: 25, max: 100 },
    typicalLifespan: 10,
    diyEligible: true,
    keywords: ['smoke detector', 'smoke alarm', 'fire alarm', 'carbon monoxide detector', 'co detector'],
  },
  microwave: {
    tier: 'small_appliance',
    displayName: 'Microwave',
    costRange: { min: 100, max: 400 },
    typicalLifespan: 10,
    diyEligible: true,
    keywords: ['microwave', 'over-the-range microwave', 'countertop microwave', 'built-in microwave'],
  },
};
 
 /**
  * Tier 2: Medium System / Trade Repair
  * Cost: $300-$3,000, DIY possible for some, safety considerations
  */
 export const MEDIUM_SYSTEM_CONFIGS: Record<MediumSystemType, ApplianceConfig> = {
   sump_pump: {
     tier: 'medium_system',
     displayName: 'Sump Pump',
     costRange: { min: 300, max: 1200 },
     typicalLifespan: 10,
     diyEligible: true,
     keywords: ['sump pump', 'sump', 'basement pump', 'flood pump'],
     tradeType: 'plumber',
   },
   garage_door_opener: {
     tier: 'medium_system',
     displayName: 'Garage Door Opener',
     costRange: { min: 250, max: 700 },
     typicalLifespan: 15,
     diyEligible: true,
     keywords: ['garage door', 'garage opener', 'garage motor', 'garage door opener'],
   },
   dishwasher_repair: {
     tier: 'medium_system',
     displayName: 'Dishwasher Repair',
     costRange: { min: 150, max: 500 },
     typicalLifespan: 12,
     diyEligible: false,
     keywords: ['dishwasher repair', 'dishwasher not draining', 'dishwasher leak', 'dishwasher broken'],
     tradeType: 'appliance repair',
   },
   water_softener: {
     tier: 'medium_system',
     displayName: 'Water Softener',
     costRange: { min: 500, max: 2500 },
     typicalLifespan: 15,
     diyEligible: false,
     keywords: ['water softener', 'soft water', 'hard water', 'water conditioning'],
     tradeType: 'plumber',
   },
  whole_house_fan: {
    tier: 'medium_system',
    displayName: 'Whole House Fan',
    costRange: { min: 400, max: 1500 },
    typicalLifespan: 15,
    diyEligible: false,
    keywords: ['whole house fan', 'attic fan', 'house fan'],
    tradeType: 'electrician',
  },
  washing_machine: {
    tier: 'medium_system',
    displayName: 'Washing Machine',
    costRange: { min: 400, max: 1200 },
    typicalLifespan: 12,
    diyEligible: false,
    keywords: ['washer', 'washing machine', 'laundry machine', 'clothes washer', 'front load washer', 'top load washer'],
    tradeType: 'appliance repair',
  },
  dryer: {
    tier: 'medium_system',
    displayName: 'Dryer',
    costRange: { min: 350, max: 1000 },
    typicalLifespan: 13,
    diyEligible: false,
    keywords: ['dryer', 'clothes dryer', 'tumble dryer', 'gas dryer', 'electric dryer'],
    tradeType: 'appliance repair',
  },
  refrigerator: {
    tier: 'medium_system',
    displayName: 'Refrigerator',
    costRange: { min: 500, max: 2500 },
    typicalLifespan: 15,
    diyEligible: false,
    keywords: ['refrigerator', 'fridge', 'freezer', 'french door fridge', 'side by side fridge'],
    tradeType: 'appliance repair',
  },
  oven_range: {
    tier: 'medium_system',
    displayName: 'Oven/Range',
    costRange: { min: 400, max: 2000 },
    typicalLifespan: 15,
    diyEligible: false,
    keywords: ['oven', 'range', 'stove', 'cooktop', 'gas range', 'electric range', 'induction cooktop'],
    tradeType: 'appliance repair',
  },
};
 
 /**
  * Combined appliance configs for lookup
  */
 export const APPLIANCE_CONFIGS: Record<ApplianceType, ApplianceConfig> = {
   ...SMALL_APPLIANCE_CONFIGS,
   ...MEDIUM_SYSTEM_CONFIGS,
 };
 
 /**
  * Get appliance config by type
  * Returns null if not found (fail-closed)
  */
 export function getApplianceConfig(applianceType: string): ApplianceConfig | null {
   const normalized = applianceType.toLowerCase().replace(/[^a-z_]/g, '_').replace(/_+/g, '_');
   return APPLIANCE_CONFIGS[normalized as ApplianceType] || null;
 }
 
 /**
  * Search appliance configs by keyword
  * Used for fuzzy matching user input
  */
 export function findApplianceByKeyword(input: string): { type: ApplianceType; config: ApplianceConfig } | null {
   const normalized = input.toLowerCase().trim();
   
   for (const [type, config] of Object.entries(APPLIANCE_CONFIGS)) {
     // Check exact match first
     if (type === normalized.replace(/\s+/g, '_')) {
       return { type: type as ApplianceType, config };
     }
     
     // Check keywords
     if (config.keywords.some(kw => normalized.includes(kw) || kw.includes(normalized))) {
       return { type: type as ApplianceType, config };
     }
   }
   
   return null;
 }