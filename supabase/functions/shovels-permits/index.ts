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

    // Fetch permits from Shovels.ai API
    const permitsResponse = await fetch(`https://api.shovels.ai/v1/permits?address=${encodeURIComponent(address)}`, {
      headers: {
        'Authorization': `Bearer ${shovelsApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!permitsResponse.ok) {
      throw new Error(`Shovels API error: ${permitsResponse.status}`)
    }

    const permitsData = await permitsResponse.json()
    console.log('Received permits data:', permitsData?.permits?.length || 0, 'permits')

    // Fetch violations from Shovels.ai API
    const violationsResponse = await fetch(`https://api.shovels.ai/v1/violations?address=${encodeURIComponent(address)}`, {
      headers: {
        'Authorization': `Bearer ${shovelsApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    const violationsData = violationsResponse.ok ? await violationsResponse.json() : { violations: [] }
    console.log('Received violations data:', violationsData?.violations?.length || 0, 'violations')

    // Process and insert permits
    let permitsInserted = 0
    if (permitsData?.permits) {
      for (const permit of permitsData.permits) {
        const permitData = {
          user_id: user.id,
          home_id: homeId,
          permit_number: permit.permit_number,
          permit_type: permit.permit_type,
          work_class: permit.work_class,
          description: permit.description,
          status: permit.status,
          date_issued: permit.date_issued ? new Date(permit.date_issued).toISOString().split('T')[0] : null,
          date_finaled: permit.date_finaled ? new Date(permit.date_finaled).toISOString().split('T')[0] : null,
          valuation: permit.valuation ? parseFloat(permit.valuation) : null,
          contractor_name: permit.contractor_name,
          contractor_license: permit.contractor_license,
          jurisdiction: permit.jurisdiction,
          source_url: permit.source_url,
          source: 'shovels',
          is_energy_related: isEnergyRelated(permit),
          system_tags: extractSystemTags(permit),
          hash: generateHash(permit),
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
