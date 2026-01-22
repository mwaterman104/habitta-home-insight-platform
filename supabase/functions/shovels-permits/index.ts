import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { deriveHVACPermitSignal } from '../_shared/permitSignal.ts'
import { 
  normalizeShovelsPermit, 
  normalizeMiamiDadePermit, 
  toPermitDbRecord,
  type NormalizedPermit,
  type PermitSource 
} from '../_shared/permitNormalizers.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Miami-Dade ArcGIS API endpoint
const MIAMI_DADE_API = 'https://services.arcgis.com/8Pc9XBTAsYuxx9Ny/arcgis/rest/services/BuildingPermit_gdb/FeatureServer/0/query';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check for internal secret (for chained calls from enrichment pipeline)
    const internalSecret = req.headers.get('x-internal-secret');
    const expectedSecret = Deno.env.get('INTERNAL_ENRICH_SECRET');
    const isInternalCall = expectedSecret && internalSecret === expectedSecret;

    // Handle authentication - support both internal calls and user calls
    let user = null
    const authHeader = req.headers.get('Authorization')
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user: authUser } } = await supabaseClient.auth.getUser(token)
      user = authUser
    }

    // For internal function calls with valid secret, we proceed without user
    if (!user && !isInternalCall) {
      console.log('No authenticated user and no internal secret - this might be a validation call')
    } else if (isInternalCall) {
      console.log('[shovels-permits] Internal call validated via secret')
    }

    const { address, homeId, folio: requestFolio, source: requestedSource } = await req.json()
    console.log('Syncing permits for address:', address, 'homeId:', homeId, 'folio:', requestFolio, 'source:', requestedSource)

    // Fetch folio from homes table if homeId provided but no folio in request
    let folio = requestFolio;
    if (!folio && homeId) {
      const { data: homeData } = await supabaseClient
        .from('homes')
        .select('folio')
        .eq('id', homeId)
        .single();
      
      if (homeData?.folio) {
        folio = homeData.folio;
        console.log(`[shovels-permits] Found stored folio from homes table: ${folio}`);
      }
    }

    // Determine which source(s) to query
    // Priority: explicit source > folio detection > default to shovels
    let sources: PermitSource[] = ['shovels'];
    
    if (requestedSource === 'miami_dade' || folio) {
      sources = ['miami_dade'];
    } else if (requestedSource === 'both') {
      sources = ['shovels', 'miami_dade'];
    }
    
    // For Florida addresses, prefer Miami-Dade when available
    const isMiamiDade = address?.toLowerCase().includes('miami') || 
                        address?.toLowerCase().includes('fl 33') ||
                        folio;
    if (isMiamiDade && !requestedSource) {
      sources = ['miami_dade', 'shovels']; // Try Miami-Dade first
    }

    let normalizedPermits: NormalizedPermit[] = [];

    // ========== MIAMI-DADE SOURCE ==========
    if (sources.includes('miami_dade')) {
      try {
        const miamiPermits = await fetchMiamiDadePermits(address, folio);
        normalizedPermits.push(...miamiPermits);
        console.log(`[miami-dade] Retrieved ${miamiPermits.length} permits`);
      } catch (err) {
        console.error('[miami-dade] Error fetching permits:', err);
        // Continue to try other sources
      }
    }

    // ========== SHOVELS SOURCE ==========
    if (sources.includes('shovels')) {
      try {
        const shovelsPermits = await fetchShovelsPermits(address);
        normalizedPermits.push(...shovelsPermits);
        console.log(`[shovels] Retrieved ${shovelsPermits.length} permits`);
      } catch (err) {
        console.error('[shovels] Error fetching permits:', err);
      }
    }

    // Deduplicate by permit number (prefer more complete records)
    normalizedPermits = deduplicatePermits(normalizedPermits);
    console.log(`Total normalized permits after dedup: ${normalizedPermits.length}`);

    // Violations endpoint not available; leaving empty for now
    const violationsData = { violations: [] as any[] }

    // If no homeId provided (validation mode), just return the data without saving
    if (!homeId) {
      console.log('Validation mode - returning data without saving to database')
      
      return new Response(
        JSON.stringify({ 
          success: true,
          permits: normalizedPermits,
          violations: violationsData?.violations || [],
          sources_queried: sources,
          message: `Retrieved ${normalizedPermits.length} permits (validation mode)`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    // Regular mode - save to database
    // For internal calls, get user_id from the home record
    let effectiveUserId = user?.id;
    
    if (!effectiveUserId && isInternalCall && homeId) {
      console.log('[shovels-permits] Internal call - fetching user_id from home record');
      const { data: homeData } = await supabaseClient
        .from('homes')
        .select('user_id')
        .eq('id', homeId)
        .single();
      effectiveUserId = homeData?.user_id;
      console.log('[shovels-permits] Got user_id from home:', effectiveUserId);
    }
    
    if (!effectiveUserId) {
      console.log('No user found - skipping database operations, returning data only')
      return new Response(
        JSON.stringify({ 
          success: true,
          permits: normalizedPermits,
          violations: [],
          sources_queried: sources,
          message: 'No user authentication - data retrieved but not saved'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    // Process and insert permits
    let permitsInserted = 0
    for (const permit of normalizedPermits) {
      const isEnergy = isEnergyRelated(permit);
      const tags = extractSystemTags(permit);
      const hash = generateHash({ 
        number: permit.permit_number, 
        issue_date: permit.date_issued, 
        jurisdiction: permit.jurisdiction,
        source: permit.source 
      });

      const permitData = toPermitDbRecord(permit, effectiveUserId, homeId, isEnergy, tags, hash);

      // Use upsert to avoid duplicates
      const { error } = await supabaseClient
        .from('permits')
        .upsert(permitData, { 
          onConflict: 'hash',
          ignoreDuplicates: true 
        })

      if (!error) {
        permitsInserted++
      } else {
        console.error('Error inserting permit:', error)
      }
    }

    // Process and insert violations (placeholder)
    let violationsInserted = 0
    if (violationsData?.violations) {
      for (const violation of violationsData.violations) {
        const violationData = {
          user_id: effectiveUserId,
          home_id: homeId,
          violation_number: violation.violation_number,
          violation_type: violation.violation_type,
          description: violation.description,
          status: violation.status,
          severity: violation.severity || 'medium',
          date_reported: violation.date_reported ? new Date(violation.date_reported).toISOString().split('T')[0] : null,
          date_resolved: violation.date_resolved ? new Date(violation.date_resolved).toISOString().split('T')[0] : null,
          jurisdiction: violation.jurisdiction,
          source_url: violation.source_url,
          source: 'shovels',
          hash: generateHash(violation),
          raw: violation
        }

        const { error } = await supabaseClient
          .from('code_violations')
          .upsert(violationData, { 
            onConflict: 'hash',
            ignoreDuplicates: true 
          })

        if (!error) {
          violationsInserted++
        } else {
          console.error('Error inserting violation:', error)
        }
      }
    }

    console.log(`Successfully synced ${permitsInserted} permits and ${violationsInserted} violations`)

    // ========== PERMIT SIGNAL EXTRACTION (Centralized) ==========
    // Use centralized permit signal extractor - SINGLE SOURCE OF TRUTH
    // IMPORTANT: This function is source-agnostic. It only sees NormalizedPermit[].
    const permitSignal = deriveHVACPermitSignal(normalizedPermits);
    
    console.log(`[permits] HVAC signal: verified=${permitSignal.verified}, year=${permitSignal.installYear}, source=${permitSignal.installSource}`);

    // Update systems table when HVAC permit found
    if (homeId && permitsInserted > 0 && permitSignal.verified && permitSignal.installYear) {
      console.log(`[permits] Found HVAC permit from ${permitSignal.installYear}, source: ${permitSignal.installSource}`);

      // Check existing system to apply override hierarchy
      const { data: existingSystem } = await supabaseClient
        .from('systems')
        .select('id, install_year, install_source')
        .eq('home_id', homeId)
        .eq('kind', 'hvac')
        .single();

      if (!existingSystem) {
        // No system record exists - create one from permit
        const { error: insertError } = await supabaseClient
          .from('systems')
          .insert({
            home_id: homeId,
            user_id: effectiveUserId,
            kind: 'hvac',
            install_year: permitSignal.installYear,
            install_source: 'permit',
            confidence: 0.85,
            status: 'VERIFIED',
          });
        
        if (!insertError) {
          console.log('[permits] Created HVAC system from permit, year:', permitSignal.installYear);
        } else {
          console.error('[permits] Error creating system:', insertError);
        }
      } else {
        // System exists - apply override hierarchy
        // Permit > Inferred, but User > Permit only if user input is NEWER
        let shouldUpdate = false;
        const existingSource = existingSystem.install_source || 'inferred';
        
        if (existingSource === 'inferred' || existingSource === 'unknown') {
          // Permit overrides inferred
          shouldUpdate = true;
          console.log('[permits] Permit overrides inferred source');
        } else if (existingSource === 'user' && existingSystem.install_year) {
          // User input only wins if it's NEWER than permit date
          if (existingSystem.install_year < permitSignal.installYear) {
            shouldUpdate = true;
            console.log('[permits] Permit is more recent than user input, overriding');
          } else {
            console.log('[permits] User input is more recent, keeping user data');
          }
        }

        if (shouldUpdate) {
          const { error: updateError } = await supabaseClient
            .from('systems')
            .update({
              install_year: permitSignal.installYear,
              install_source: 'permit',
              confidence: 0.85,
              status: 'VERIFIED',
            })
            .eq('id', existingSystem.id);
          
          if (!updateError) {
            console.log('[permits] Updated HVAC system from permit, year:', permitSignal.installYear);
          } else {
            console.error('[permits] Error updating system:', updateError);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        permitsInserted,
        violationsInserted,
        sources_queried: sources,
        // Return normalized signal fields for downstream consumers
        hvac_permit_found: permitSignal.verified,
        hvac_install_year: permitSignal.installYear,
        hvac_permit_confidence: permitSignal.verified ? 0.85 : 0,
        hvac_install_source: permitSignal.installSource,
        message: `Synced ${permitsInserted} permits and ${violationsInserted} violations`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error syncing permits:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

// ========== SOURCE FETCHERS ==========

/**
 * Normalize folio to digits only for reliable matching
 */
function normalizeFolioForQuery(folio: string): string {
  return folio.replace(/[^0-9]/g, '');
}

/**
 * Fetch permits from Miami-Dade ArcGIS API
 * Uses folio-first strategy - FOLIO field stores raw digits without dashes
 */
async function fetchMiamiDadePermits(address?: string, folio?: string): Promise<NormalizedPermit[]> {
  let whereClause = '1=1';
  let searchStrategy = 'none';
  
  if (folio) {
    // Normalize folio to digits only - Miami-Dade stores FOLIO as raw digits
    const normalizedFolio = normalizeFolioForQuery(folio);
    whereClause = `FOLIO='${normalizedFolio}'`;
    searchStrategy = 'folio-exact';
    console.log(`[miami-dade] Folio search: ${normalizedFolio}`);
  } else if (address) {
    // Miami-Dade uses abbreviated address format: "3082 NW 64 ST" not "NORTHWEST 64TH STREET"
    const normalizedAddr = normalizeMiamiDadeAddress(address);
    
    if (normalizedAddr) {
      whereClause = `ADDRESS LIKE '${normalizedAddr}%'`;
      searchStrategy = 'address-prefix';
    } else {
      // Fallback: extract just the street number for broader matching
      const streetNumMatch = address.match(/^(\d+)/);
      if (streetNumMatch) {
        whereClause = `ADDRESS LIKE '${streetNumMatch[1]}%'`;
        searchStrategy = 'address-number';
      }
    }
    console.log(`[miami-dade] Address fallback: ${normalizedAddr || 'number-only'}`);
  }

  console.log(`[miami-dade] Search strategy: ${searchStrategy}, where: ${whereClause}`);

  // Build query with reasonable limits
  const params = new URLSearchParams({
    where: whereClause,
    outFields: '*',
    outSR: '4326',
    f: 'json',
    resultRecordCount: '100',
    orderByFields: 'ISSUDATE DESC'
  });

  const response = await fetch(`${MIAMI_DADE_API}?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error(`Miami-Dade API returned ${response.status}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`Miami-Dade API error: ${data.error.message}`);
  }

  let features = data.features || [];
  console.log(`[miami-dade] Query: ${whereClause}, Results: ${features.length}`);

  // SUFFIX FALLBACK: If exact folio match returns 0 results, try LIKE with suffix pattern
  if (features.length === 0 && folio && searchStrategy === 'folio-exact') {
    const normalizedFolio = normalizeFolioForQuery(folio);
    // Try LIKE pattern with last 4 digits of folio (the property-specific portion)
    const suffix = normalizedFolio.slice(-4);
    const fallbackWhere = `FOLIO LIKE '%-${suffix}'`;
    console.log(`[miami-dade] Retrying with folio suffix pattern: %-${suffix}`);
    
    const fallbackParams = new URLSearchParams({
      where: fallbackWhere,
      outFields: '*',
      outSR: '4326',
      f: 'json',
      resultRecordCount: '100',
      orderByFields: 'ISSUDATE DESC'
    });

    const fallbackResponse = await fetch(`${MIAMI_DADE_API}?${fallbackParams.toString()}`);
    if (fallbackResponse.ok) {
      const fallbackData = await fallbackResponse.json();
      if (!fallbackData.error) {
        features = fallbackData.features || [];
        console.log(`[miami-dade] Suffix fallback results: ${features.length}`);
      }
    }
  }

  return features.map((f: any) => normalizeMiamiDadePermit(f.attributes || f));
}

/**
 * Normalize address to Miami-Dade format:
 * - "3082 Northwest 64th Street" -> "3082 NW 64 ST"
 * - Uses standard abbreviations: NW, NE, SW, SE, ST, AVE, CT, DR, etc.
 */
function normalizeMiamiDadeAddress(address: string): string | null {
  // Remove everything after comma (city, state, zip)
  const streetPart = address.split(',')[0].trim().toUpperCase();
  
  // Extract: street number + direction + street name/number + suffix
  const match = streetPart.match(/^(\d+)\s+(NORTHWEST|NORTHEAST|SOUTHWEST|SOUTHEAST|NW|NE|SW|SE|N|S|E|W)?\s*(.+)$/i);
  
  if (!match) return null;
  
  const streetNum = match[1];
  let direction = (match[2] || '').toUpperCase();
  let streetName = match[3].toUpperCase();
  
  // Normalize direction abbreviations
  const directionMap: Record<string, string> = {
    'NORTHWEST': 'NW',
    'NORTHEAST': 'NE', 
    'SOUTHWEST': 'SW',
    'SOUTHEAST': 'SE',
    'NORTH': 'N',
    'SOUTH': 'S',
    'EAST': 'E',
    'WEST': 'W'
  };
  direction = directionMap[direction] || direction;
  
  // Normalize street suffixes
  const suffixMap: Record<string, string> = {
    'STREET': 'ST',
    'AVENUE': 'AVE',
    'COURT': 'CT',
    'DRIVE': 'DR',
    'BOULEVARD': 'BLVD',
    'LANE': 'LN',
    'PLACE': 'PL',
    'ROAD': 'RD',
    'TERRACE': 'TER',
    'WAY': 'WAY',
    'CIRCLE': 'CIR'
  };
  
  for (const [full, abbrev] of Object.entries(suffixMap)) {
    streetName = streetName.replace(new RegExp(`\\b${full}\\b`, 'g'), abbrev);
  }
  
  // Remove ordinal suffixes: 64TH -> 64, 1ST -> 1, 2ND -> 2, 3RD -> 3
  streetName = streetName.replace(/(\d+)(ST|ND|RD|TH)\b/g, '$1');
  
  // Clean up extra spaces
  streetName = streetName.replace(/\s+/g, ' ').trim();
  
  // Build the normalized address
  const parts = [streetNum];
  if (direction) parts.push(direction);
  parts.push(streetName);
  
  return parts.join(' ').replace(/'/g, "''"); // Escape for SQL
}

/**
 * Fetch permits from Shovels V2 API
 */
async function fetchShovelsPermits(address: string): Promise<NormalizedPermit[]> {
  const shovelsApiKey = Deno.env.get('SHOVELS_API_KEY')
  if (!shovelsApiKey) {
    throw new Error('Shovels API key not configured')
  }

  // Resolve address to geo_id via Shovels V2 Addresses API
  const addrSearchResp = await fetch(`https://api.shovels.ai/v2/addresses/search?q=${encodeURIComponent(address)}`, {
    headers: {
      'X-API-Key': shovelsApiKey,
      'Content-Type': 'application/json'
    }
  })

  let geoId: string | null = null
  if (addrSearchResp.ok) {
    const addrJson = await addrSearchResp.json()
    geoId = addrJson?.items?.[0]?.geo_id || null
    console.log('[shovels] Address search items:', addrJson?.items?.length || 0, 'geo_id:', geoId)
  } else {
    console.log(`[shovels] Address search returned ${addrSearchResp.status}`)
    return [];
  }

  if (!geoId) {
    console.log('[shovels] No geo_id found for address; skipping permits search')
    return [];
  }

  // Default date range - last 20 years
  const to = new Date()
  const from = new Date()
  from.setFullYear(to.getFullYear() - 20)
  const permit_from = from.toISOString().split('T')[0]
  const permit_to = to.toISOString().split('T')[0]

  const params = new URLSearchParams({
    geo_id: geoId,
    permit_from,
    permit_to,
    size: '100'
  })
  
  const permitsResponse = await fetch(`https://api.shovels.ai/v2/permits/search?${params.toString()}`, {
    headers: {
      'X-API-Key': shovelsApiKey,
      'Content-Type': 'application/json'
    }
  })
  
  if (!permitsResponse.ok) {
    console.log(`[shovels] Permits search returned ${permitsResponse.status}`)
    return [];
  }

  const permitsJson = await permitsResponse.json()
  const permitsItems = permitsJson?.items || []
  console.log('[shovels] Received permits items:', permitsItems.length)

  return permitsItems.map((p: any) => normalizeShovelsPermit(p));
}

// ========== HELPER FUNCTIONS ==========

/**
 * Deduplicate permits by permit number, preferring records with more data
 */
function deduplicatePermits(permits: NormalizedPermit[]): NormalizedPermit[] {
  const seen = new Map<string, NormalizedPermit>();
  
  for (const permit of permits) {
    const key = permit.permit_number || `${permit.date_issued}-${permit.description?.slice(0, 50)}`;
    
    if (!seen.has(key)) {
      seen.set(key, permit);
    } else {
      // Prefer record with more complete data
      const existing = seen.get(key)!;
      const existingScore = countFields(existing);
      const newScore = countFields(permit);
      
      if (newScore > existingScore) {
        seen.set(key, permit);
      }
    }
  }
  
  return Array.from(seen.values());
}

function countFields(permit: NormalizedPermit): number {
  return Object.values(permit).filter(v => v != null && v !== '').length;
}

function isEnergyRelated(permit: NormalizedPermit): boolean {
  const energyKeywords = [
    'solar', 'hvac', 'heat pump', 'insulation', 'window', 'door', 
    'electrical', 'energy', 'efficient', 'panel', 'battery'
  ]
  
  const text = `${permit.description || ''} ${permit.permit_type || ''} ${permit.work_class || ''}`.toLowerCase()
  return energyKeywords.some(keyword => text.includes(keyword))
}

function extractSystemTags(permit: NormalizedPermit): string[] {
  const tags: string[] = []
  const text = `${permit.description || ''} ${permit.permit_type || ''} ${permit.work_class || ''}`.toLowerCase()
  
  const systemMap: Record<string, string[]> = {
    'hvac': ['hvac', 'heat', 'air', 'furnace', 'ac', 'mechanical', 'a/c', 'condenser'],
    'electrical': ['electrical', 'electric', 'panel', 'wiring'],
    'plumbing': ['plumb', 'water', 'sewer', 'pipe'],
    'roofing': ['roof', 'shingle', 'gutter', 're-roof'],
    'solar': ['solar', 'photovoltaic', 'pv'],
    'windows': ['window', 'glass'],
    'insulation': ['insulation', 'insulate']
  }
  
  for (const [system, keywords] of Object.entries(systemMap)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      tags.push(system)
    }
  }
  
  return tags
}

function generateHash(data: any): string {
  // Simple hash function for deduplication
  const str = JSON.stringify(data)
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash.toString()
}
