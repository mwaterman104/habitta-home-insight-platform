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

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabaseClient.auth.getUser(token)

    if (!user) {
      throw new Error('Not authenticated')
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

    // Regular mode - save to database (existing code)
    // Process and insert permits
    let permitsInserted = 0
    if (permitsItems && permitsItems.length) {
      for (const permit of permitsItems) {
        const permitData = {
          user_id: user.id,
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
          user_id: user.id,
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

    return new Response(
      JSON.stringify({ 
        success: true,
        permitsInserted,
        violationsInserted,
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
