// Mechanical Intelligence - Heuristic Enrichment & Risk Scoring Engine

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
  'one hour air': { brand: 'Bryant', confidence: 'medium' },
  'one hour heating': { brand: 'Bryant', confidence: 'medium' },
  'cool today': { brand: 'Trane', confidence: 'medium' },
  'service experts': { brand: 'Lennox', confidence: 'medium' },
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
      });
    } catch (err) {
      if (i < 5) errors.push(`Row ${i + 1}: Parse error - ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }
  
  console.log('Parsed', records.length, 'records from', lines.length - 1, 'data rows');
  
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
  
  if (record.riskLevel === 'critical') {
    return `🚨 URGENT: ${ageText} ${brandText}HVAC system at ${record.address} is in a critical risk zone${climateWarning}. Risk Score: ${record.riskScore}/100. Schedule a professional inspection immediately or perform a DIY diagnostic check now.`;
  }
  
  if (record.riskLevel === 'high') {
    return `⚠️ ATTENTION: ${ageText} ${brandText}HVAC system at ${record.address} shows elevated failure risk${climateWarning}. Risk Score: ${record.riskScore}/100. Consider scheduling preventive maintenance within the next 30 days.`;
  }
  
  if (record.riskLevel === 'medium') {
    return `📋 NOTICE: ${ageText} ${brandText}system at ${record.address} should be monitored. Risk Score: ${record.riskScore}/100. Add to your seasonal maintenance checklist.`;
  }
  
  return `✅ ${ageText} ${brandText}system at ${record.address} appears stable. Risk Score: ${record.riskScore}/100. Continue regular maintenance schedule.`;
}

/**
 * Export high-risk records to CSV
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
    `"${r.riskFactors.join('; ').replace(/"/g, '""')}"`,
    `"${r.contractorName.replace(/"/g, '""')}"`,
    r.issueDate,
    `"${r.workDescription.replace(/"/g, '""')}"`
  ]);
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
