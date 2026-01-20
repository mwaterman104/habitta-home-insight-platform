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

const FREEZING_STATES = new Set([
  "AK","ME","VT","NH","MA","RI","CT","NY","PA","NJ","MI","WI","MN","ND","SD",
  "MT","WY","CO","UT","ID","WA","OR","IL","IN","OH","IA","NE","KS","MO"
]);

function mapCategory(system="") { 
  const s=system.toLowerCase();
  if (["hvac","furnace","ac","air","heater"].some(k=>s.includes(k))) return "hvac";
  if (["plumb","water","pipe","drain"].some(k=>s.includes(k))) return "plumbing";
  if (["elect","panel","breaker","wire","outlet","gfi"].some(k=>s.includes(k))) return "electrical";
  if (["appliance","fridge","range","stove","washer","dryer","dishwasher","oven"].some(k=>s.includes(k))) return "appliance";
  if (["roof","gutter","siding","exterior","yard","landscape","window","door"].some(k=>s.includes(k))) return "exterior";
  return "interior";
}

function mapPriority(urg?: string|null) { 
  const u=(urg||"").toLowerCase(); 
  if(u==="high")return "urgent"; 
  if(u==="med"||u==="medium")return "high"; 
  return "medium"; 
}

function seasonalTemplates(isCold: boolean) {
  return [
    { month:3,  title:"HVAC cooling tune-up",       category:"hvac",      description:"Service AC; replace filter.", priority:"medium" },
    { month:3,  title:"Gutter & downspout clean",   category:"exterior",  description:"Clear debris; ensure drainage.", priority:"medium" },
    { month:4,  title:"Exterior caulk & seal",       category:"exterior",  description:"Windows/doors/trim.", priority:"low" },
    { month:6,  title:"Irrigation/pool check",       category:"exterior",  description:"Leaks, timers, pressure.", priority:"low" },
    { month:7,  title:"Pest prevention sweep",       category:"exterior",  description:"Inspect and seal entry points.", priority:"low" },
    { month:9,  title:"HVAC heating tune-up",        category:"hvac",      description:"Service furnace/heat pump.", priority:"medium" },
    { month:10, title:"Roof & flashing inspection",  category:"exterior",  description:"Shingles, penetrations.", priority:"high" },
    { month:10, title:"Gutter clean (leaf season)",  category:"exterior",  description:"Prevent clogs/ice dams.", priority:"medium" },
    ...(isCold ? [
      { month:11, title:"Winterize exterior plumbing", category:"plumbing", description:"Insulate pipes; shut hose bibs.", priority:"urgent" },
      { month:11, title:"Weatherstrip doors/windows",  category:"exterior", description:"Reduce drafts.", priority:"low" },
    ] : []),
    { month:4,  title:"Test smoke/CO detectors (Spring)", category:"interior", description:"Test/replace batteries.", priority:"high" },
    { month:10, title:"Test smoke/CO detectors (Fall)",   category:"interior", description:"Test/replace batteries.", priority:"high" },
  ];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  
  try {
    // Check for internal secret (for chained calls from enrichment pipeline)
    const internalSecret = req.headers.get('x-internal-secret');
    const expectedSecret = Deno.env.get('INTERNAL_ENRICH_SECRET');
    const isInternalCall = expectedSecret && internalSecret === expectedSecret;

    const { homeId, months=12, force=false } = await req.json().catch(()=>({}));
    if (!homeId) {
      return new Response(JSON.stringify({ error:"homeId required" }), { 
        status:400, 
        headers:{...cors,"Content-Type":"application/json"} 
      });
    }

    console.log(`Generating seasonal plan for home ${homeId}, months: ${months}, force: ${force}, internal: ${isInternalCall}`);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    let userId: string | null = null;
    let home: any = null;

    if (isInternalCall) {
      // Internal call - get home and user_id directly
      console.log('[seed-maintenance-plan] Internal call validated via secret');
      const { data: homeData } = await admin
        .from("homes")
        .select("*")
        .eq("id", homeId)
        .maybeSingle();
      
      if (!homeData) {
        return new Response(JSON.stringify({ error:"Home not found" }), { 
          status:404, 
          headers:{...cors,"Content-Type":"application/json"} 
        });
      }
      home = homeData;
      userId = homeData.user_id;
    } else {
      // User call - validate JWT
      const supaUser = createClient(SUPABASE_URL, ANON_KEY, { 
        global:{ headers:{ Authorization: req.headers.get("Authorization")! } } 
      });
      const { data:{ user } } = await supaUser.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error:"Unauthorized" }), { 
          status:401, 
          headers:{...cors,"Content-Type":"application/json"} 
        });
      }
      userId = user.id;
      
      // Get home details - must belong to user
      const { data: homeData } = await admin
        .from("homes")
        .select("*")
        .eq("id", homeId)
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (!homeData) {
        return new Response(JSON.stringify({ error:"Home not found" }), { 
          status:404, 
          headers:{...cors,"Content-Type":"application/json"} 
        });
      }
      home = homeData;
    }

    console.log("Found home:", home.address);

    // Get condition signals and renovation items if property is linked
    let conditionScore: number | null = null; 
    let tlcScore: number | null = null; 
    let renos:any[] = [];
    
    if (home.property_id) {
      console.log("Fetching property data for property_id:", home.property_id);
      
      // Get latest signals
      const { data: sigRows } = await admin
        .from("maintenance_signals")
        .select("signal,value,asof_date")
        .eq("property_id", home.property_id)
        .order("asof_date", { ascending:false });
      
      for (const r of (sigRows||[])) { 
        if (r.signal === "condition_score" && conditionScore==null) conditionScore = r.value ?? null; 
        if (r.signal === "tlc" && tlcScore==null) tlcScore = r.value ?? null; 
      }
      
      // Get renovation items
      const { data: items } = await admin
        .from("renovation_items")
        .select("*")
        .eq("property_id", home.property_id)
        .order("asof_date", { ascending:false });
      
      renos = items || [];
      console.log(`Found ${renos.length} renovation items, condition: ${conditionScore}, tlc: ${tlcScore}`);
    }

    const isCold = FREEZING_STATES.has((home.state||"").toUpperCase());
    const base = seasonalTemplates(isCold);

    const now = new Date();
    const candidates:any[] = [];
    const push = (t:any)=>candidates.push(t);

    // Add urgent inspection tasks if poor condition detected
    if ((conditionScore!=null && conditionScore<70) || (tlcScore!=null && tlcScore>60)) {
      console.log("Poor condition detected, adding inspection tasks");
      push({ title:"Whole-home inspection", description:"General condition check.", category:"interior", priority:"high", due_date: ymd(addDays(now,14)) });
      push({ title:"Electrical safety check", description:"Panel/breakers/outlets.", category:"electrical", priority:"high", due_date: ymd(addDays(now,21)) });
      push({ title:"Plumbing leak check", description:"Fixtures/traps/valves.", category:"plumbing", priority:"high", due_date: ymd(addDays(now,21)) });
      push({ title:"Roof & exterior review", description:"Shingles/siding/trim.", category:"exterior", priority:"high", due_date: ymd(addDays(now,21)) });
    }

    // Convert renovation items to tasks
    for (const r of renos) {
      const pr = mapPriority(r.urgency);
      const d  = pr === "urgent" ? addDays(now,7) : pr === "high" ? addDays(now,14) : addDays(now,30);
      push({ 
        title:`${(r.system||"System").toUpperCase()} • ${r.urgency || "maintenance"}`, 
        description:"Auto-created from Homesage item.", 
        category: mapCategory(r.system), 
        priority: pr, 
        due_date: ymd(d), 
        cost: r.est_cost ?? null 
      });
    }

    // Add seasonal templates
    for (const t of base) {
      const due = nextMonthDate(t.month, 15);
      push({ 
        title:t.title, 
        description:t.description, 
        category:t.category, 
        priority:t.priority, 
        due_date: ymd(due) 
      });
    }

    // Filter out existing tasks unless force mode
    const horizonEnd = ymd(addDays(now, Math.max(1, Math.min(24, Number(months))) * 30));
    let existing:any[] = [];
    
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
        priority: t.priority,
        status: "pending",
        due_date: t.due_date,
        cost: t.cost ?? null,
        recurring: false,
        recurrence_interval: null,
      }));

    let inserted = 0;
    if (rows.length) {
      console.log(`Inserting ${rows.length} new tasks`);
      const { error } = await admin.from("maintenance_tasks").insert(rows);
      if (error) {
        console.error("Error inserting tasks:", error);
        return new Response(JSON.stringify({ error: error.message }), { 
          status:500, 
          headers:{...cors,"Content-Type":"application/json"} 
        });
      }
      inserted = rows.length;
    }

    console.log(`Plan generation complete: ${inserted} tasks inserted from ${candidates.length} considered`);

    return new Response(JSON.stringify({ ok:true, inserted, considered:candidates.length }), { 
      headers:{...cors,"Content-Type":"application/json"} 
    });
  } catch (e) {
    console.error("Error in seed-maintenance-plan:", e);
    return new Response(JSON.stringify({ error:(e as Error).message }), { 
      status:500, 
      headers:{...cors,"Content-Type":"application/json"} 
    });
  }
});