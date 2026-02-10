import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = { 
  "Access-Control-Allow-Origin": "*", 
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" 
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function ymd(d: Date) { return d.toISOString().slice(0,10); }
function addDays(d: Date, n: number) { const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function nextMonthDate(month: number, day=15) { 
  const now=new Date(); 
  const t=new Date(now.getFullYear(), month-1, day); 
  if (t<now) t.setFullYear(now.getFullYear()+1); 
  return t; 
}

// ── Climate Zone Derivation (mirrors src/lib/climateZone.ts) ──

type ClimateZoneType = 'high_heat' | 'coastal' | 'freeze_thaw' | 'moderate';

function deriveClimateZone(state?: string, city?: string, lat?: number | null): ClimateZoneType {
  const location = `${city || ''} ${state || ''}`.toLowerCase();

  if (
    location.includes('miami') || location.includes('fort lauderdale') ||
    location.includes('west palm') || location.includes('tampa') ||
    location.includes('orlando') || location.includes('phoenix') ||
    location.includes('tucson') || location.includes('las vegas') ||
    location.includes('houston') || location.includes('san antonio') ||
    ['florida','fl','az','arizona'].includes((state || '').toLowerCase()) ||
    (lat != null && lat < 28)
  ) return 'high_heat';

  if (
    location.includes('beach') || location.includes('coast') ||
    location.includes('key ') || location.includes('island') ||
    location.includes('santa monica') || location.includes('san diego') ||
    location.includes('malibu')
  ) return 'coastal';

  if (
    location.includes('boston') || location.includes('chicago') ||
    location.includes('minneapolis') || location.includes('denver') ||
    location.includes('detroit') || location.includes('milwaukee') ||
    location.includes('buffalo') || location.includes('cleveland') ||
    location.includes('pittsburgh') || location.includes('new york') ||
    location.includes('nyc') || location.includes('philadelphia') ||
    ['mn','wi','mi','nd','sd','mt','wy','vt','nh','me','ny','pa','nj','ct','ma','ri',
     'oh','il','in','ia','ne','ks','mo','co','id','wa','or','ut','ak',
     'minnesota','wisconsin','michigan'].includes((state || '').toLowerCase()) ||
    (lat != null && lat > 42)
  ) return 'freeze_thaw';

  return 'moderate';
}

// ── Priority & Category Mapping ──

function mapCategory(system = "") { 
  const s = system.toLowerCase();
  if (["hvac","furnace","ac","air","heater"].some(k => s.includes(k))) return "hvac";
  if (["plumb","water","pipe","drain"].some(k => s.includes(k))) return "plumbing";
  if (["elect","panel","breaker","wire","outlet","gfi"].some(k => s.includes(k))) return "electrical";
  if (["appliance","fridge","range","stove","washer","dryer","dishwasher","oven"].some(k => s.includes(k))) return "appliance";
  if (["roof","gutter","siding","exterior","yard","landscape","window","door"].some(k => s.includes(k))) return "exterior";
  return "interior";
}

function mapPriority(urg?: string | null) { 
  const u = (urg || "").toLowerCase(); 
  if (u === "high") return "urgent"; 
  if (u === "med" || u === "medium") return "high"; 
  return "medium"; 
}

// ── Climate-Aware Seasonal Templates ──

interface SeasonalTask {
  month: number;
  title: string;
  category: string;
  system_type: string;
  description: string;
  priority: string;
}

function seasonalTemplates(climateZone: ClimateZoneType): SeasonalTask[] {
  const common: SeasonalTask[] = [
    { month: 4, title: "Test smoke/CO detectors (Spring)", category: "interior", system_type: "safety", description: "Test all smoke and CO detectors. Replace batteries.", priority: "high" },
    { month: 10, title: "Test smoke/CO detectors (Fall)", category: "interior", system_type: "safety", description: "Test all smoke and CO detectors. Replace batteries.", priority: "high" },
  ];

  switch (climateZone) {
    case 'freeze_thaw':
      return [
        // Spring
        { month: 3, title: "HVAC cooling tune-up", category: "hvac", system_type: "hvac", description: "Service AC. Replace filter. Check refrigerant levels before summer.", priority: "medium" },
        { month: 3, title: "Check sump pump", category: "plumbing", system_type: "plumbing", description: "Test sump pump operation before spring thaw and heavy rains.", priority: "high" },
        { month: 4, title: "Foundation crack inspection", category: "exterior", system_type: "foundation", description: "Inspect foundation for new cracks from freeze-thaw cycles.", priority: "medium" },
        { month: 4, title: "Gutter & downspout clean (Spring)", category: "exterior", system_type: "roof", description: "Clear winter debris. Check for ice dam damage.", priority: "medium" },
        { month: 5, title: "Exterior paint & caulk inspection", category: "exterior", system_type: "exterior", description: "Check caulking and paint for freeze damage. Reseal as needed.", priority: "low" },
        // Summer
        { month: 6, title: "Deck & patio inspection", category: "exterior", system_type: "exterior", description: "Check for wood rot, loose boards, and seal surfaces.", priority: "low" },
        // Fall
        { month: 9, title: "Furnace tune-up", category: "hvac", system_type: "hvac", description: "Professional furnace service before heating season.", priority: "high" },
        { month: 10, title: "Roof & flashing inspection", category: "exterior", system_type: "roof", description: "Inspect shingles and flashing before winter.", priority: "high" },
        { month: 10, title: "Gutter clean (leaf season)", category: "exterior", system_type: "roof", description: "Clear gutters before freeze to prevent ice dams.", priority: "medium" },
        // Winter prep
        { month: 11, title: "Winterize exterior plumbing", category: "plumbing", system_type: "plumbing", description: "Shut off hose bibs. Insulate exposed pipes. Drain sprinkler system.", priority: "urgent" },
        { month: 11, title: "Weatherstrip doors & windows", category: "exterior", system_type: "exterior", description: "Replace worn weatherstripping to reduce drafts and heating costs.", priority: "medium" },
        { month: 11, title: "Snow equipment check", category: "exterior", system_type: "exterior", description: "Service snow blower. Stock ice melt and shovels.", priority: "low" },
        ...common,
      ];

    case 'high_heat':
      return [
        // Spring
        { month: 3, title: "AC deep service", category: "hvac", system_type: "hvac", description: "Full AC tune-up. Clean coils, check refrigerant, replace filter. Critical before summer.", priority: "high" },
        { month: 3, title: "Pool pump & equipment service", category: "exterior", system_type: "pool", description: "Service pool pump, check filter, inspect equipment for wear.", priority: "medium" },
        { month: 4, title: "Irrigation system check", category: "exterior", system_type: "exterior", description: "Test irrigation zones. Check for leaks and adjust timers for dry season.", priority: "medium" },
        // Summer
        { month: 6, title: "AC filter replacement (Summer)", category: "hvac", system_type: "hvac", description: "Monthly filter check recommended in high-use months.", priority: "medium" },
        { month: 7, title: "Pest prevention sweep", category: "exterior", system_type: "exterior", description: "Inspect and seal entry points. Check for termites (high humidity risk).", priority: "medium" },
        { month: 7, title: "Water heater inspection", category: "plumbing", system_type: "water_heater", description: "Check anode rod. Flush sediment. Higher temps accelerate wear.", priority: "medium" },
        // Fall (hurricane/storm season)
        { month: 9, title: "Hurricane shutter & storm prep check", category: "exterior", system_type: "exterior", description: "Inspect shutters, secure loose outdoor items, check emergency supplies.", priority: "high" },
        { month: 10, title: "Roof inspection post-storm season", category: "exterior", system_type: "roof", description: "Inspect for storm damage. Check flashings and soft spots.", priority: "high" },
        { month: 10, title: "AC filter replacement (Fall)", category: "hvac", system_type: "hvac", description: "Replace filter after heavy summer use.", priority: "medium" },
        // Winter (mild)
        { month: 12, title: "Exterior paint & seal check", category: "exterior", system_type: "exterior", description: "UV and humidity degrade coatings faster. Inspect and touch up.", priority: "low" },
        ...common,
      ];

    case 'coastal':
      return [
        // Spring
        { month: 3, title: "HVAC coil & condenser clean", category: "hvac", system_type: "hvac", description: "Salt air accelerates corrosion. Deep clean coils and rinse condenser.", priority: "high" },
        { month: 4, title: "Gutter & downspout check", category: "exterior", system_type: "roof", description: "Clear debris. Check for corrosion from salt air.", priority: "medium" },
        { month: 4, title: "Deck & exterior power wash", category: "exterior", system_type: "exterior", description: "Remove salt residue from siding, deck, and outdoor surfaces.", priority: "medium" },
        { month: 5, title: "Window seal inspection", category: "exterior", system_type: "exterior", description: "Salt air degrades seals faster. Check all windows and doors.", priority: "medium" },
        // Summer
        { month: 6, title: "Exterior metal corrosion check", category: "exterior", system_type: "exterior", description: "Inspect railings, fixtures, and hardware for rust. Treat early.", priority: "medium" },
        { month: 7, title: "Salt air HVAC rinse", category: "hvac", system_type: "hvac", description: "Mid-summer rinse of outdoor HVAC components to prevent salt buildup.", priority: "medium" },
        // Fall
        { month: 9, title: "Roof & flashing inspection", category: "exterior", system_type: "roof", description: "Salt air and moisture accelerate flashing deterioration.", priority: "high" },
        { month: 10, title: "Exterior stain & seal", category: "exterior", system_type: "exterior", description: "Reapply protective coatings before winter moisture season.", priority: "medium" },
        // Winter
        { month: 12, title: "Plumbing corrosion check", category: "plumbing", system_type: "plumbing", description: "Inspect exposed pipes and fixtures for salt-related corrosion.", priority: "medium" },
        ...common,
      ];

    case 'moderate':
    default:
      return [
        // Spring
        { month: 3, title: "HVAC cooling tune-up", category: "hvac", system_type: "hvac", description: "Service AC. Replace filter. Standard spring prep.", priority: "medium" },
        { month: 3, title: "Gutter & downspout clean (Spring)", category: "exterior", system_type: "roof", description: "Clear winter debris. Ensure proper drainage.", priority: "medium" },
        { month: 4, title: "Exterior caulk & seal check", category: "exterior", system_type: "exterior", description: "Inspect and reseal windows, doors, and trim.", priority: "low" },
        // Summer
        { month: 6, title: "Irrigation & pool check", category: "exterior", system_type: "exterior", description: "Check for leaks. Adjust timers. Inspect pool equipment.", priority: "low" },
        { month: 7, title: "Pest prevention sweep", category: "exterior", system_type: "exterior", description: "Inspect and seal entry points.", priority: "low" },
        // Fall
        { month: 9, title: "HVAC heating tune-up", category: "hvac", system_type: "hvac", description: "Service furnace or heat pump before heating season.", priority: "medium" },
        { month: 10, title: "Roof & flashing inspection", category: "exterior", system_type: "roof", description: "Inspect shingles, flashings, and penetrations.", priority: "high" },
        { month: 10, title: "Gutter clean (leaf season)", category: "exterior", system_type: "roof", description: "Clear gutters to prevent water damage.", priority: "medium" },
        ...common,
      ];
  }
}

// ── Main Handler ──

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  
  try {
    const internalSecret = req.headers.get('x-internal-secret');
    const expectedSecret = Deno.env.get('INTERNAL_ENRICH_SECRET');
    const isInternalCall = expectedSecret && internalSecret === expectedSecret;

    const { homeId, months = 12, force = false, climateZone: overrideZone } = await req.json().catch(() => ({}));
    if (!homeId) {
      return new Response(JSON.stringify({ error: "homeId required" }), { 
        status: 400, headers: { ...cors, "Content-Type": "application/json" } 
      });
    }

    console.log(`Generating seasonal plan for home ${homeId}, months: ${months}, force: ${force}, internal: ${isInternalCall}`);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    let userId: string | null = null;
    let home: any = null;

    if (isInternalCall) {
      console.log('[seed-maintenance-plan] Internal call validated via secret');
      const { data: homeData } = await admin.from("homes").select("*").eq("id", homeId).maybeSingle();
      if (!homeData) {
        return new Response(JSON.stringify({ error: "Home not found" }), { 
          status: 404, headers: { ...cors, "Content-Type": "application/json" } 
        });
      }
      home = homeData;
      userId = homeData.user_id;
    } else {
      const supaUser = createClient(SUPABASE_URL, ANON_KEY, { 
        global: { headers: { Authorization: req.headers.get("Authorization")! } } 
      });
      const { data: { user } } = await supaUser.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { 
          status: 401, headers: { ...cors, "Content-Type": "application/json" } 
        });
      }
      userId = user.id;
      
      const { data: homeData } = await admin.from("homes").select("*").eq("id", homeId).eq("user_id", user.id).maybeSingle();
      if (!homeData) {
        return new Response(JSON.stringify({ error: "Home not found" }), { 
          status: 404, headers: { ...cors, "Content-Type": "application/json" } 
        });
      }
      home = homeData;
    }

    console.log("Found home:", home.address);

    // Derive climate zone
    const climateZone: ClimateZoneType = overrideZone || deriveClimateZone(home.state, home.city, home.latitude);
    console.log(`Climate zone: ${climateZone} (state: ${home.state}, city: ${home.city})`);

    // Get condition signals and renovation items if property is linked
    let conditionScore: number | null = null; 
    let tlcScore: number | null = null; 
    let renos: any[] = [];
    
    if (home.property_id) {
      console.log("Fetching property data for property_id:", home.property_id);
      
      const { data: sigRows } = await admin
        .from("maintenance_signals")
        .select("signal,value,asof_date")
        .eq("property_id", home.property_id)
        .order("asof_date", { ascending: false });
      
      for (const r of (sigRows || [])) { 
        if (r.signal === "condition_score" && conditionScore == null) conditionScore = r.value ?? null; 
        if (r.signal === "tlc" && tlcScore == null) tlcScore = r.value ?? null; 
      }
      
      const { data: items } = await admin
        .from("renovation_items")
        .select("*")
        .eq("property_id", home.property_id)
        .order("asof_date", { ascending: false });
      
      renos = items || [];
      console.log(`Found ${renos.length} renovation items, condition: ${conditionScore}, tlc: ${tlcScore}`);
    }

    const base = seasonalTemplates(climateZone);
    const now = new Date();
    const candidates: any[] = [];
    const push = (t: any) => candidates.push(t);

    // Add urgent inspection tasks if poor condition detected
    if ((conditionScore != null && conditionScore < 70) || (tlcScore != null && tlcScore > 60)) {
      console.log("Poor condition detected, adding inspection tasks");
      push({ title: "Whole-home inspection", description: "General condition check.", category: "interior", system_type: null, priority: "high", due_date: ymd(addDays(now, 14)) });
      push({ title: "Electrical safety check", description: "Panel/breakers/outlets.", category: "electrical", system_type: "electrical", priority: "high", due_date: ymd(addDays(now, 21)) });
      push({ title: "Plumbing leak check", description: "Fixtures/traps/valves.", category: "plumbing", system_type: "plumbing", priority: "high", due_date: ymd(addDays(now, 21)) });
      push({ title: "Roof & exterior review", description: "Shingles/siding/trim.", category: "exterior", system_type: "roof", priority: "high", due_date: ymd(addDays(now, 21)) });
    }

    // Convert renovation items to tasks
    for (const r of renos) {
      const pr = mapPriority(r.urgency);
      const d = pr === "urgent" ? addDays(now, 7) : pr === "high" ? addDays(now, 14) : addDays(now, 30);
      const cat = mapCategory(r.system);
      push({ 
        title: `${(r.system || "System").toUpperCase()} • ${r.urgency || "maintenance"}`, 
        description: "Auto-created from property enrichment data.", 
        category: cat, 
        system_type: cat === "exterior" ? "roof" : cat,
        priority: pr, 
        due_date: ymd(d), 
        cost: r.est_cost ?? null 
      });
    }

    // Add seasonal templates
    for (const t of base) {
      const due = nextMonthDate(t.month, 15);
      push({ 
        title: t.title, 
        description: t.description, 
        category: t.category, 
        system_type: t.system_type,
        priority: t.priority, 
        due_date: ymd(due) 
      });
    }

    // Filter out existing tasks unless force mode
    const horizonEnd = ymd(addDays(now, Math.max(1, Math.min(24, Number(months))) * 30));
    let existing: any[] = [];
    
    if (!force) {
      const { data: ex } = await admin
        .from("maintenance_tasks")
        .select("title,due_date")
        .eq("home_id", home.id)
        .gte("due_date", ymd(now))
        .lte("due_date", horizonEnd);
      existing = ex || [];
    }
    
    const exists = new Set(existing.map(e => `${e.title.toLowerCase()}|${e.due_date}`));

    const rows = candidates
      .filter(t => force || !exists.has(`${String(t.title).toLowerCase()}|${t.due_date}`))
      .map(t => ({
        home_id: home.id,
        user_id: userId,
        title: t.title,
        description: t.description ?? null,
        category: t.category,
        system_type: t.system_type ?? null,
        priority: t.priority,
        status: "pending",
        due_date: t.due_date,
        cost: t.cost ?? null,
        recurring: false,
        recurrence_interval: null,
      }));

    let inserted = 0;
    if (rows.length) {
      console.log(`Inserting ${rows.length} new tasks (climate zone: ${climateZone})`);
      const { error } = await admin.from("maintenance_tasks").insert(rows);
      if (error) {
        console.error("Error inserting tasks:", error);
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500, headers: { ...cors, "Content-Type": "application/json" } 
        });
      }
      inserted = rows.length;
    }

    console.log(`Plan generation complete: ${inserted} tasks inserted from ${candidates.length} considered (zone: ${climateZone})`);

    return new Response(JSON.stringify({ ok: true, inserted, considered: candidates.length, climateZone }), { 
      headers: { ...cors, "Content-Type": "application/json" } 
    });
  } catch (e) {
    console.error("Error in seed-maintenance-plan:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { 
      status: 500, headers: { ...cors, "Content-Type": "application/json" } 
    });
  }
});
