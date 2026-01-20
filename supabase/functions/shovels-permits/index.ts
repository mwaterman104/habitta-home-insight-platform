import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ShovelsPermit {
  permit_number?: string;
  permit_type?: string;
  work_class?: string;
  description?: string;
  status?: string;
  date_issued?: string;
  date_finaled?: string;
  valuation?: number;
  contractor_name?: string;
  contractor_license?: string;
  jurisdiction?: string;
  source_url?: string;
  // ... other fields from Shovels API
}

interface ShovelsViolation {
  violation_number?: string;
  violation_type?: string;
  description?: string;
  status?: string;
  severity?: string;
  date_reported?: string;
  date_resolved?: string;
  jurisdiction?: string;
  source_url?: string;
  // ... other fields from Shovels API
}

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
      // For validation mode, we don't need authentication
      // But for database operations, we'll need to handle this differently
    } else if (isInternalCall) {
      console.log('[shovels-permits] Internal call validated via secret')
    }

    const { address, homeId } = await req.json()
    console.log('Syncing permits for address:', address, 'homeId:', homeId)

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
      console.log('Shovels address search items:', addrJson?.items?.length || 0, 'geo_id:', geoId)
    } else {
      console.log(`Shovels address search returned ${addrSearchResp.status}`)
    }

    // Default date range required by V2 permits search
    const to = new Date()
    const from = new Date()
    from.setFullYear(to.getFullYear() - 20) // last 20 years
    const permit_from = from.toISOString().split('T')[0]
    const permit_to = to.toISOString().split('T')[0]

    // Fetch permits from Shovels V2 API using geo_id and date range
    let permitsItems: any[] = []
    if (geoId) {
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
      if (permitsResponse.ok) {
        const permitsJson = await permitsResponse.json()
        permitsItems = permitsJson?.items || []
        console.log('Received Shovels permits items:', permitsItems.length)
      } else {
        console.log(`Shovels permits search returned ${permitsResponse.status}`)
      }
    } else {
      console.log('No geo_id found for address; skipping permits search')
    }

    // Violations endpoint not available in V2 docs; leaving empty for now
    const violationsData = { violations: [] as any[] }

    // If no homeId provided (validation mode), just return the data without saving
    if (!homeId) {
      console.log('Validation mode - returning data without saving to database')
      
      // Process permits for return data (map V2 items to unified shape)
      const processedPermits = (permitsItems || []).map((p: any) => {
        const compat = { description: p.description || '', permit_type: p.type || '', work_class: null } as ShovelsPermit;
        return {
          permit_number: p.number || null,
          permit_type: p.type || null,
          work_class: null,
          description: p.description || null,
          status: p.status || null,
          date_issued: p.issue_date ? new Date(p.issue_date).toISOString().split('T')[0] : null,
          date_finaled: p.final_date ? new Date(p.final_date).toISOString().split('T')[0] : null,
          valuation: p.job_value != null ? Number(p.job_value) : null,
          contractor_name: null,
          contractor_license: null,
          jurisdiction: p.jurisdiction || null,
          source_url: p.source_url || null,
          source: 'shovels',
          is_energy_related: isEnergyRelated(compat),
          system_tags: extractSystemTags(compat),
          raw: p
        };
      });

      return new Response(
        JSON.stringify({ 
          success: true,
          permits: processedPermits,
          violations: violationsData?.violations || [],
          message: `Retrieved ${processedPermits.length} permits and ${violationsData?.violations?.length || 0} violations (validation mode)`
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
          permits: [],
          violations: [],
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
    if (permitsItems && permitsItems.length) {
      for (const permit of permitsItems) {
        const permitData = {
          user_id: effectiveUserId,
          home_id: homeId,
          permit_number: permit.number || null,
          permit_type: permit.type || null,
          work_class: null,
          description: permit.description || null,
          status: permit.status || null,
          date_issued: permit.issue_date ? new Date(permit.issue_date).toISOString().split('T')[0] : null,
          date_finaled: permit.final_date ? new Date(permit.final_date).toISOString().split('T')[0] : null,
          valuation: permit.job_value != null ? Number(permit.job_value) : null,
          contractor_name: null,
          contractor_license: null,
          jurisdiction: permit.jurisdiction || null,
          source_url: permit.source_url || null,
          source: 'shovels',
          is_energy_related: isEnergyRelated(permit),
          system_tags: extractSystemTags(permit),
          hash: generateHash({ number: permit.number, issue_date: permit.issue_date, jurisdiction: permit.jurisdiction }),
          raw: permit
        }

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
    }

    // Process and insert violations
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

    // ========== PHASE 3: Permit-to-System Enrichment ==========
    // Update systems table when HVAC replacement permits are found
    if (homeId && permitsInserted > 0 && permitsItems && permitsItems.length > 0) {
      const hvacReplacementKeywords = ['replace', 'change out', 'upgrade', 'new unit', 'changeout', 'change-out'];
      
      const hvacPermits = permitsItems.filter((p: any) => {
        const desc = (p.description || '').toLowerCase();
        const permitType = (p.type || '').toLowerCase();
        
        const isHVAC = desc.includes('hvac') || desc.includes('air condition') || 
                       desc.includes('a/c') || desc.includes('ac unit') ||
                       desc.includes('heat pump') || desc.includes('condenser') ||
                       permitType.includes('mechanical');
        const isReplacement = hvacReplacementKeywords.some(kw => desc.includes(kw));
        return isHVAC && isReplacement && p.issue_date;
      });

      if (hvacPermits.length > 0) {
        // Sort by date, get most recent
        hvacPermits.sort((a: any, b: any) => 
          new Date(b.issue_date!).getTime() - new Date(a.issue_date!).getTime()
        );
        const latestPermit = hvacPermits[0];
        const permitYear = new Date(latestPermit.issue_date!).getFullYear();

        console.log(`[shovels-permits] Found HVAC replacement permit from ${permitYear}`);

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
              install_year: permitYear,
              install_source: 'permit',
              confidence: 0.85,
              status: 'VERIFIED',
            });
          
          if (!insertError) {
            console.log('[shovels-permits] Created HVAC system from permit, year:', permitYear);
          } else {
            console.error('[shovels-permits] Error creating system:', insertError);
          }
        } else {
          // System exists - apply override hierarchy
          // Permit > Inferred, but User > Permit only if user input is NEWER
          let shouldUpdate = false;
          const existingSource = existingSystem.install_source || 'inferred';
          
          if (existingSource === 'inferred' || existingSource === 'unknown') {
            // Permit overrides inferred
            shouldUpdate = true;
            console.log('[shovels-permits] Permit overrides inferred source');
          } else if (existingSource === 'user' && existingSystem.install_year) {
            // User input only wins if it's NEWER than permit date
            if (existingSystem.install_year < permitYear) {
              shouldUpdate = true;
              console.log('[shovels-permits] Permit is more recent than user input, overriding');
            } else {
              console.log('[shovels-permits] User input is more recent, keeping user data');
            }
          }

          if (shouldUpdate) {
            const { error: updateError } = await supabaseClient
              .from('systems')
              .update({
                install_year: permitYear,
                install_source: 'permit',
                confidence: 0.85,
                status: 'VERIFIED',
              })
              .eq('id', existingSystem.id);
            
            if (!updateError) {
              console.log('[shovels-permits] Updated HVAC system from permit, year:', permitYear);
            } else {
              console.error('[shovels-permits] Error updating system:', updateError);
            }
          }
        }
      }
    }

    // Extract HVAC enrichment signal for downstream consumers
    let hvac_permit_found = false;
    let hvac_install_year: number | null = null;
    let hvac_permit_confidence = 0;

    // Check if we found and processed any HVAC replacement permits
    if (permitsItems && permitsItems.length > 0) {
      const hvacReplacementKeywords = ['replace', 'change out', 'upgrade', 'new unit', 'changeout', 'change-out', 'install'];
      
      const hvacPermits = permitsItems.filter((p: any) => {
        const desc = (p.description || '').toLowerCase();
        const permitType = (p.type || '').toLowerCase();
        
        const isHVAC = desc.includes('hvac') || desc.includes('air condition') || 
                       desc.includes('a/c') || desc.includes('ac unit') ||
                       desc.includes('heat pump') || desc.includes('condenser') ||
                       permitType.includes('mechanical');
        const isReplacement = hvacReplacementKeywords.some(kw => desc.includes(kw));
        return isHVAC && isReplacement && p.issue_date;
      });

      if (hvacPermits.length > 0) {
        // Sort by date, get most recent
        hvacPermits.sort((a: any, b: any) => 
          new Date(b.issue_date!).getTime() - new Date(a.issue_date!).getTime()
        );
        hvac_permit_found = true;
        hvac_install_year = new Date(hvacPermits[0].issue_date!).getFullYear();
        hvac_permit_confidence = 0.85;
        console.log(`[shovels-permits] HVAC signal: found=${hvac_permit_found}, year=${hvac_install_year}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        permitsInserted,
        violationsInserted,
        hvac_permit_found,
        hvac_install_year,
        hvac_permit_confidence,
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

// Helper functions
function isEnergyRelated(permit: ShovelsPermit): boolean {
  const energyKeywords = [
    'solar', 'hvac', 'heat pump', 'insulation', 'window', 'door', 
    'electrical', 'energy', 'efficient', 'panel', 'battery'
  ]
  
  const text = `${permit.description || ''} ${permit.permit_type || ''} ${permit.work_class || ''}`.toLowerCase()
  return energyKeywords.some(keyword => text.includes(keyword))
}

function extractSystemTags(permit: ShovelsPermit): string[] {
  const tags: string[] = []
  const text = `${permit.description || ''} ${permit.permit_type || ''} ${permit.work_class || ''}`.toLowerCase()
  
  const systemMap = {
    'hvac': ['hvac', 'heat', 'air', 'furnace', 'ac'],
    'electrical': ['electrical', 'electric', 'panel', 'wiring'],
    'plumbing': ['plumb', 'water', 'sewer', 'pipe'],
    'roofing': ['roof', 'shingle', 'gutter'],
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
