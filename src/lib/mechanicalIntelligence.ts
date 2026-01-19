// Mechanical Intelligence - Heuristic Enrichment & Risk Scoring Engine

export type PermitSegment = 
  | 'replacement_wave'   // AC CHANGE OUTs from 2016-2018 (8-10 years old, EOL approaching)
  | 'repair_loop'        // Multiple permits on same folio within 3 years
  | 'new_homeowner'      // Permits from late 2024-2025 (preventative care targets)
  | 'standard';          // Everything else

export interface PermitRecord {
  id: string;
  address: string;
  workDescription: string;
  contractorName: string;
  issueDate: string;
  folioNumber: string;
  // Enriched fields
  brand: string | null;
  brandConfidence: 'high' | 'medium' | 'low';
  systemAge: number;
  riskScore: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  riskFactors: string[];
  // New investor-ready fields
  segment: PermitSegment;
  equityAtRisk: number;
  isRepairLoopCandidate?: boolean;
  repairLoopCount?: number;
  // For mapping
  latitude?: number;
  longitude?: number;
}

export interface ParsedCSVRow {
  address: string;
  workDescription: string;
  contractorName: string;
  issueDate: string;
  folioNumber: string;
}

// Contractor to brand mapping (The "Habitta Brain")
const CONTRACTOR_BRAND_MAP: Record<string, { brand: string; confidence: 'high' | 'medium' }> = {
  'ameri temp': { brand: 'Carrier', confidence: 'high' },
  'ameritemp': { brand: 'Carrier', confidence: 'high' },
  'ameri-temp': { brand: 'Carrier', confidence: 'high' },
  'air around the clock': { brand: 'Rheem', confidence: 'high' },
  'air around clock': { brand: 'Rheem', confidence: 'high' },
  // Direct A/C -> Lennox (high-risk coil corrosion target)
  'direct a/c': { brand: 'Lennox', confidence: 'high' },
  'direct ac': { brand: 'Lennox', confidence: 'high' },
  'direct air': { brand: 'Lennox', confidence: 'high' },
  'direct a c': { brand: 'Lennox', confidence: 'high' },
  // Other mappings
  'one hour air': { brand: 'Bryant', confidence: 'medium' },
  'one hour heating': { brand: 'Bryant', confidence: 'medium' },
  'cool today': { brand: 'Trane', confidence: 'medium' },
  'service experts': { brand: 'Lennox', confidence: 'medium' },
  // Additional Florida contractors
  'all year cooling': { brand: 'Goodman', confidence: 'medium' },
  'cousins air': { brand: 'Carrier', confidence: 'medium' },
  'ars rescue rooter': { brand: 'American Standard', confidence: 'medium' },
};

// Brand keywords to search in descriptions
const BRAND_KEYWORDS = [
  'carrier', 'trane', 'lennox', 'rheem', 'york', 'goodman', 
  'bryant', 'american standard', 'ruud', 'daikin', 'mitsubishi',
  'fujitsu', 'lg', 'samsung', 'bosch', 'maytag', 'frigidaire'
];

// High-risk keywords indicating repair vs replacement
const REPAIR_KEYWORDS = ['repair', 'coil', 'compressor', 'leak', 'motor', 'capacitor', 'contactor', 'refrigerant', 'freon'];
const REPLACEMENT_KEYWORDS = ['change out', 'changeout', 'replace', 'new install', 'installation', 'new unit', 'upgrade'];

/**
 * Identify brand from contractor name and work description
 */
export function identifyBrand(contractorName: string, workDescription: string): { brand: string | null; confidence: 'high' | 'medium' | 'low' } {
  const contractorLower = contractorName.toLowerCase().trim();
  const descLower = workDescription.toLowerCase();
  
  // First check contractor mapping (highest confidence)
  for (const [key, value] of Object.entries(CONTRACTOR_BRAND_MAP)) {
    if (contractorLower.includes(key)) {
      return { brand: value.brand, confidence: value.confidence };
    }
  }
  
  // Then check description for brand keywords
  for (const brand of BRAND_KEYWORDS) {
    if (descLower.includes(brand)) {
      return { 
        brand: brand.charAt(0).toUpperCase() + brand.slice(1), 
        confidence: 'medium' 
      };
    }
  }
  
  // Check contractor name for brand keywords
  for (const brand of BRAND_KEYWORDS) {
    if (contractorLower.includes(brand)) {
      return { 
        brand: brand.charAt(0).toUpperCase() + brand.slice(1), 
        confidence: 'low' 
      };
    }
  }
  
  return { brand: null, confidence: 'low' };
}

/**
 * Calculate system age from issue date
 */
export function calculateSystemAge(issueDate: string): number {
  const date = new Date(issueDate);
  if (isNaN(date.getTime())) return 0;
  
  const today = new Date();
  const years = (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return Math.max(0, Math.round(years * 10) / 10);
}

/**
 * Check if work description indicates repair vs replacement
 */
export function isRepairWork(workDescription: string): boolean {
  const descLower = workDescription.toLowerCase();
  
  // Check for replacement keywords first (negates repair)
  for (const keyword of REPLACEMENT_KEYWORDS) {
    if (descLower.includes(keyword)) {
      return false;
    }
  }
  
  // Check for repair keywords
  for (const keyword of REPAIR_KEYWORDS) {
    if (descLower.includes(keyword)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Classify permit into high-value segment
 */
export function classifyPermitSegment(
  issueDate: string,
  workDescription: string,
  systemAge: number
): PermitSegment {
  const year = new Date(issueDate).getFullYear();
  const descLower = workDescription.toLowerCase();
  
  // "New Homeowner" - Permits from late 2024 or 2025
  // These users need preventative wellness plans
  if (year >= 2024) {
    return 'new_homeowner';
  }
  
  // "Replacement Wave" - AC CHANGE OUTs from 2016-2018
  // In Miami's humidity, these units are 8-10 years old and approaching EOL
  const isChangeOut = descLower.includes('change out') || 
                      descLower.includes('changeout') ||
                      descLower.includes('replace') ||
                      descLower.includes('new install');
  
  if (isChangeOut && year >= 2016 && year <= 2018) {
    return 'replacement_wave';
  }
  
  // Default segment
  return 'standard';
}

/**
 * Calculate Equity at Risk - dollar value of potential home damage
 * if HVAC fails, including secondary damage (mold risk in Miami's humidity)
 */
export function calculateEquityAtRisk(
  systemAge: number,
  riskLevel: 'critical' | 'high' | 'medium' | 'low',
  brand: string | null
): number {
  // Base replacement cost range
  const BASE_REPLACEMENT_MIN = 8000;
  const BASE_REPLACEMENT_MAX = 15000;
  const baseReplacement = (BASE_REPLACEMENT_MIN + BASE_REPLACEMENT_MAX) / 2;
  
  // Miami humidity mold risk multiplier
  const MOLD_MULTIPLIER: Record<string, number> = {
    critical: 3.0, // High risk of secondary water/mold damage
    high: 2.2,
    medium: 1.5,
    low: 1.0,
  };
  
  // Brand-specific risk adjustment
  let brandMultiplier = 1.0;
  if (brand?.toLowerCase() === 'lennox') {
    brandMultiplier = 1.3; // Known coil issues in humid climates
  } else if (brand?.toLowerCase() === 'goodman' && systemAge > 8) {
    brandMultiplier = 1.2;
  }
  
  // Age-based probability of failure
  let ageFactor = 1.0;
  if (systemAge > 12) {
    ageFactor = 1.5;
  } else if (systemAge > 10) {
    ageFactor = 1.3;
  } else if (systemAge > 8) {
    ageFactor = 1.1;
  }
  
  const totalRisk = baseReplacement * MOLD_MULTIPLIER[riskLevel] * brandMultiplier * ageFactor;
  
  // Round to nearest 100
  return Math.round(totalRisk / 100) * 100;
}

/**
 * Calculate failure risk score (0-100)
 */
export function calculateRiskScore(
  systemAge: number, 
  brand: string | null, 
  workDescription: string
): { score: number; factors: string[] } {
  let score = 0;
  const factors: string[] = [];
  
  // +40 points if System Age > 10 years
  if (systemAge > 10) {
    score += 40;
    factors.push(`System is ${systemAge.toFixed(1)} years old (>10 years: +40 pts)`);
  } else if (systemAge > 7) {
    score += 20;
    factors.push(`System is ${systemAge.toFixed(1)} years old (7-10 years: +20 pts)`);
  } else if (systemAge > 5) {
    score += 10;
    factors.push(`System is ${systemAge.toFixed(1)} years old (5-7 years: +10 pts)`);
  }
  
  // +20 points if Brand is "Lennox" (known coil issues in humid climates)
  if (brand?.toLowerCase() === 'lennox') {
    score += 20;
    factors.push('Lennox brand - known coil failure issues in humid climates (+20 pts)');
  }
  
  // Additional brand-specific risks
  if (brand?.toLowerCase() === 'goodman' && systemAge > 8) {
    score += 10;
    factors.push('Goodman units >8 years show higher failure rates (+10 pts)');
  }
  
  // +30 points if repair work vs replacement
  if (isRepairWork(workDescription)) {
    score += 30;
    factors.push('Work indicates repair/component issue rather than full replacement (+30 pts)');
  }
  
  // Additional risk factors from description
  const descLower = workDescription.toLowerCase();
  if (descLower.includes('emergency') || descLower.includes('urgent')) {
    score += 10;
    factors.push('Emergency/urgent work indicated (+10 pts)');
  }
  
  if (descLower.includes('compressor')) {
    score += 15;
    factors.push('Compressor work - major component at risk (+15 pts)');
  }
  
  if (descLower.includes('coil') && descLower.includes('leak')) {
    score += 15;
    factors.push('Coil leak detected - common failure point (+15 pts)');
  }
  
  return { score: Math.min(100, score), factors };
}

/**
 * Determine risk level from score
 */
export function getRiskLevel(score: number): 'critical' | 'high' | 'medium' | 'low' {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

/**
 * Parse CSV row with flexible column mapping
 */
export function parseCsvRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Normalize header for flexible matching
 */
export function normalizeHeader(header: string): string {
  return header.toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Find column mappings from headers - supports Miami-Dade permit format
 */
export function findColumnMappings(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  const normalizedHeaders = headers.map(h => normalizeHeader(h));
  
  const fieldMappings: Record<string, string[]> = {
    // Address fields - Miami-Dade uses ADDRESS and STNDADDR
    address: ['stndaddr', 'address', 'property_address', 'site_address', 'location', 'street_address', 'property_location'],
    // Work description - Miami-Dade uses DESC1 through DESC10
    workDescription: ['desc1', 'desc2', 'desc3', 'work_description', 'description', 'scope', 'work_scope', 'permit_description', 'job_description', 'work'],
    // Contractor - Miami-Dade uses CONTRNAME
    contractorName: ['contrname', 'contractor_name', 'contractor', 'company', 'company_name', 'business_name', 'licensed_contractor'],
    // Issue date - Miami-Dade uses ISSUDATE
    issueDate: ['issudate', 'issue_date', 'issued_date', 'date_issued', 'permit_date', 'date', 'issued'],
    // Folio number - Miami-Dade uses FOLIO
    folioNumber: ['folio', 'geofolio', 'folio_number', 'parcel', 'parcel_number', 'apn', 'property_id', 'folio_no'],
  };
  
  for (const [field, variations] of Object.entries(fieldMappings)) {
    for (const variation of variations) {
      // Exact match first
      let index = normalizedHeaders.findIndex(h => h === variation);
      // Then partial match
      if (index === -1) {
        index = normalizedHeaders.findIndex(h => h.includes(variation) || variation.includes(h));
      }
      if (index !== -1) {
        mapping[field] = index;
        break;
      }
    }
  }
  
  console.log('Column mapping found:', mapping, 'from headers:', normalizedHeaders.slice(0, 15));
  
  return mapping;
}

/**
 * Find all DESC columns (DESC1-DESC10) for Miami-Dade format
 */
function findDescriptionColumns(headers: string[]): number[] {
  const normalizedHeaders = headers.map(h => normalizeHeader(h));
  const descCols: number[] = [];
  
  for (let i = 1; i <= 10; i++) {
    const idx = normalizedHeaders.findIndex(h => h === `desc${i}`);
    if (idx !== -1) descCols.push(idx);
  }
  
  return descCols;
}

/**
 * Detect "Repair Loop" candidates - folios with multiple permits within 3 years
 */
function detectRepairLoops(records: PermitRecord[]): Map<string, number> {
  const folioPermitCounts = new Map<string, { count: number; dates: Date[] }>();
  
  for (const record of records) {
    if (!record.folioNumber) continue;
    
    const existing = folioPermitCounts.get(record.folioNumber);
    const issueDate = new Date(record.issueDate);
    
    if (existing) {
      existing.count++;
      existing.dates.push(issueDate);
    } else {
      folioPermitCounts.set(record.folioNumber, { count: 1, dates: [issueDate] });
    }
  }
  
  // Filter to folios with 2+ permits within 3 years
  const repairLoops = new Map<string, number>();
  
  for (const [folio, data] of folioPermitCounts.entries()) {
    if (data.count >= 2) {
      // Check if any two permits are within 3 years of each other
      const sortedDates = data.dates.sort((a, b) => a.getTime() - b.getTime());
      for (let i = 0; i < sortedDates.length - 1; i++) {
        const yearsDiff = (sortedDates[i + 1].getTime() - sortedDates[i].getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        if (yearsDiff <= 3) {
          repairLoops.set(folio, data.count);
          break;
        }
      }
    }
  }
  
  return repairLoops;
}

/**
 * Parse full CSV and enrich with Habitta Brain
 */
export function parseAndEnrichCSV(csvText: string): { records: PermitRecord[]; errors: string[] } {
  const lines = csvText.trim().split('\n').filter(line => line.trim());
  const errors: string[] = [];
  
  if (lines.length < 2) {
    errors.push('CSV must have at least a header and one data row');
    return { records: [], errors };
  }
  
  const headers = parseCsvRow(lines[0]);
  const mapping = findColumnMappings(headers);
  const descColumns = findDescriptionColumns(headers);
  
  console.log('Headers found:', headers.length, 'DESC columns:', descColumns.length);
  
  // Check required fields - for Miami-Dade, we might have DESC columns instead of workDescription
  const hasWorkDescription = mapping.workDescription !== undefined || descColumns.length > 0;
  const hasAddress = mapping.address !== undefined;
  const hasIssueDate = mapping.issueDate !== undefined;
  
  if (!hasAddress) {
    errors.push(`Missing ADDRESS column. Found headers: ${headers.slice(0, 10).join(', ')}...`);
    return { records: [], errors };
  }
  
  if (!hasIssueDate) {
    errors.push(`Missing ISSUDATE/Issue_Date column. Found headers: ${headers.slice(0, 10).join(', ')}...`);
    return { records: [], errors };
  }
  
  if (!hasWorkDescription) {
    errors.push(`Missing DESC1 or Work_Description column. Found headers: ${headers.slice(0, 10).join(', ')}...`);
    return { records: [], errors };
  }
  
  const records: PermitRecord[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    try {
      const values = parseCsvRow(line);
      
      const address = values[mapping.address] || '';
      
      // Combine all DESC columns for Miami-Dade format, or use single workDescription
      let workDescription = '';
      if (descColumns.length > 0) {
        workDescription = descColumns
          .map(idx => values[idx] || '')
          .filter(v => v.trim())
          .join(' | ');
      } else if (mapping.workDescription !== undefined) {
        workDescription = values[mapping.workDescription] || '';
      }
      
      const contractorName = mapping.contractorName !== undefined ? values[mapping.contractorName] || '' : '';
      const issueDateRaw = values[mapping.issueDate] || '';
      const folioNumber = mapping.folioNumber !== undefined ? values[mapping.folioNumber] || '' : '';
      
      if (!address) {
        if (i < 5) errors.push(`Row ${i + 1}: Missing address`);
        continue;
      }
      
      // Parse date - handle various formats
      let issueDate = issueDateRaw;
      // Miami-Dade might use MM/DD/YYYY or YYYY-MM-DD
      if (issueDateRaw && !issueDateRaw.includes('-')) {
        // Try to parse MM/DD/YYYY format
        const parts = issueDateRaw.split('/');
        if (parts.length === 3) {
          issueDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        }
      }
      
      if (!issueDate) {
        if (i < 5) errors.push(`Row ${i + 1}: Missing issue date`);
        continue;
      }
      
      // Enrich with Habitta Brain
      const brandInfo = identifyBrand(contractorName, workDescription);
      const systemAge = calculateSystemAge(issueDate);
      const riskInfo = calculateRiskScore(systemAge, brandInfo.brand, workDescription);
      const riskLevel = getRiskLevel(riskInfo.score);
      const segment = classifyPermitSegment(issueDate, workDescription, systemAge);
      const equityAtRisk = calculateEquityAtRisk(systemAge, riskLevel, brandInfo.brand);
      
      records.push({
        id: `permit-${i}-${Date.now()}`,
        address,
        workDescription,
        contractorName,
        issueDate,
        folioNumber,
        brand: brandInfo.brand,
        brandConfidence: brandInfo.confidence,
        systemAge,
        riskScore: riskInfo.score,
        riskLevel,
        riskFactors: riskInfo.factors,
        segment,
        equityAtRisk,
      });
    } catch (err) {
      if (i < 5) errors.push(`Row ${i + 1}: Parse error - ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }
  
  // Post-process: Detect repair loops
  const repairLoops = detectRepairLoops(records);
  
  for (const record of records) {
    if (repairLoops.has(record.folioNumber)) {
      record.isRepairLoopCandidate = true;
      record.repairLoopCount = repairLoops.get(record.folioNumber);
      // Override segment to repair_loop if applicable
      if (record.segment === 'standard') {
        record.segment = 'repair_loop';
      }
    }
  }
  
  console.log('Parsed', records.length, 'records from', lines.length - 1, 'data rows');
  console.log('Repair loop candidates:', repairLoops.size);
  
  return { records, errors };
}

/**
 * Generate ChatDIY alert message for a permit record
 */
export function generateChatDIYAlert(record: PermitRecord): string {
  const ageText = record.systemAge > 0 ? `${record.systemAge.toFixed(0)}-year-old` : 'Your';
  const brandText = record.brand ? `${record.brand} ` : '';
  const climateWarning = record.brand?.toLowerCase() === 'lennox' 
    ? ' due to known coil issues in Miami\'s humid climate'
    : '';
  
  const equityWarning = record.equityAtRisk > 20000 
    ? ` Estimated equity at risk: $${record.equityAtRisk.toLocaleString()}.`
    : '';
  
  if (record.riskLevel === 'critical') {
    return `🚨 URGENT: ${ageText} ${brandText}HVAC system at ${record.address} is in a critical risk zone${climateWarning}. Risk Score: ${record.riskScore}/100.${equityWarning} Schedule a professional inspection immediately or perform a DIY diagnostic check now.`;
  }
  
  if (record.riskLevel === 'high') {
    return `⚠️ ATTENTION: ${ageText} ${brandText}HVAC system at ${record.address} shows elevated failure risk${climateWarning}. Risk Score: ${record.riskScore}/100.${equityWarning} Consider scheduling preventive maintenance within the next 30 days.`;
  }
  
  if (record.riskLevel === 'medium') {
    return `📋 NOTICE: ${ageText} ${brandText}system at ${record.address} should be monitored. Risk Score: ${record.riskScore}/100. Add to your seasonal maintenance checklist.`;
  }
  
  return `✅ ${ageText} ${brandText}system at ${record.address} appears stable. Risk Score: ${record.riskScore}/100. Continue regular maintenance schedule.`;
}

/**
 * Calculate brand market share from records
 */
export function calculateBrandMarketShare(records: PermitRecord[]): {
  brandCounts: Record<string, number>;
  totalWithBrand: number;
  totalRecords: number;
  dataMoatStrength: number;
} {
  const brandCounts: Record<string, number> = {};
  let totalWithBrand = 0;
  
  for (const record of records) {
    const brand = record.brand || 'Unknown';
    brandCounts[brand] = (brandCounts[brand] || 0) + 1;
    if (record.brand) totalWithBrand++;
  }
  
  const dataMoatStrength = records.length > 0 
    ? Math.round((totalWithBrand / records.length) * 100) 
    : 0;
  
  return {
    brandCounts,
    totalWithBrand,
    totalRecords: records.length,
    dataMoatStrength,
  };
}

/**
 * Calculate segment statistics
 */
export function calculateSegmentStats(records: PermitRecord[]): {
  replacementWave: number;
  repairLoop: number;
  newHomeowner: number;
  standard: number;
  totalEquityAtRisk: number;
} {
  const stats = {
    replacementWave: 0,
    repairLoop: 0,
    newHomeowner: 0,
    standard: 0,
    totalEquityAtRisk: 0,
  };
  
  for (const record of records) {
    stats.totalEquityAtRisk += record.equityAtRisk;
    
    switch (record.segment) {
      case 'replacement_wave':
        stats.replacementWave++;
        break;
      case 'repair_loop':
        stats.repairLoop++;
        break;
      case 'new_homeowner':
        stats.newHomeowner++;
        break;
      default:
        stats.standard++;
    }
  }
  
  return stats;
}

/**
 * Export high-risk records to CSV with new investor-ready fields
 */
export function exportHighRiskCSV(records: PermitRecord[], threshold: number = 60): string {
  const highRisk = records.filter(r => r.riskScore >= threshold);
  
  const headers = [
    'Address',
    'Folio Number',
    'Brand',
    'Brand Confidence',
    'System Age (Years)',
    'Risk Score',
    'Risk Level',
    'Segment',
    'Equity at Risk ($)',
    'Repair Loop',
    'Risk Factors',
    'Contractor',
    'Issue Date',
    'Work Description'
  ];
  
  const rows = highRisk.map(r => [
    `"${r.address.replace(/"/g, '""')}"`,
    `"${r.folioNumber.replace(/"/g, '""')}"`,
    r.brand || 'Unknown',
    r.brandConfidence,
    r.systemAge.toFixed(1),
    r.riskScore.toString(),
    r.riskLevel.toUpperCase(),
    r.segment,
    r.equityAtRisk.toString(),
    r.isRepairLoopCandidate ? `Yes (${r.repairLoopCount} permits)` : 'No',
    `"${r.riskFactors.join('; ').replace(/"/g, '""')}"`,
    `"${r.contractorName.replace(/"/g, '""')}"`,
    r.issueDate,
    `"${r.workDescription.replace(/"/g, '""')}"`
  ]);
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
