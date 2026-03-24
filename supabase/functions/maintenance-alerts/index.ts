import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    // Auth: accept JWT or internal secret
    const internalSecret = req.headers.get("x-internal-secret");
    const expectedSecret = Deno.env.get("INTERNAL_ENRICH_SECRET");
    const isInternal = expectedSecret && internalSecret === expectedSecret;

    let userId: string | null = null;

    if (isInternal) {
      const body = await req.json().catch(() => ({}));
      userId = body.userId;
    } else {
      const supaUser = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: req.headers.get("Authorization")! } },
      });
      const { data: { user } } = await supaUser.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      userId = user.id;
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { homeId, daysAhead = 7 } = await req.json().catch(() => ({}));

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + daysAhead);

    // Query upcoming and overdue tasks
    let query = admin
      .from("maintenance_tasks")
      .select("id, title, due_date, priority, status, category, system_type, cost")
      .eq("user_id", userId)
      .neq("status", "completed")
      .order("due_date", { ascending: true });

    if (homeId) {
      query = query.eq("home_id", homeId);
    }

    const { data: tasks, error } = await query;
    if (error) throw error;

    const allTasks = tasks || [];
    const overdue = allTasks.filter(t => new Date(t.due_date) < now);
    const upcoming = allTasks.filter(t => {
      const d = new Date(t.due_date);
      return d >= now && d <= futureDate;
    });

    // Group by system type
    const bySystem: Record<string, typeof allTasks> = {};
    for (const t of [...overdue, ...upcoming]) {
      const key = t.system_type || "general";
      if (!bySystem[key]) bySystem[key] = [];
      bySystem[key].push(t);
    }

    // Build alert summary
    const highPriorityCount = [...overdue, ...upcoming].filter(t => 
      t.priority === "high" || t.priority === "urgent"
    ).length;

    const totalCost = [...overdue, ...upcoming].reduce((sum, t) => sum + (t.cost || 0), 0);

    // Build chat message
    let chatMessage = "";
    if (overdue.length > 0 || upcoming.length > 0) {
      const parts: string[] = [];
      if (overdue.length > 0) {
        parts.push(`${overdue.length} overdue task${overdue.length > 1 ? "s" : ""}`);
      }
      if (upcoming.length > 0) {
        parts.push(`${upcoming.length} task${upcoming.length > 1 ? "s" : ""} due in the next ${daysAhead} days`);
      }
      chatMessage = `You have ${parts.join(" and ")}. `;
      
      if (highPriorityCount > 0) {
        chatMessage += `${highPriorityCount} ${highPriorityCount > 1 ? "are" : "is"} high priority. `;
      }

      // Mention top system
      const topSystem = Object.entries(bySystem)
        .sort((a, b) => b[1].length - a[1].length)[0];
      if (topSystem && topSystem[0] !== "general") {
        chatMessage += `Most are related to your ${topSystem[0].replace("_", " ")}.`;
      }
    }

    return new Response(JSON.stringify({
      overdue: overdue.length,
      upcoming: upcoming.length,
      highPriority: highPriorityCount,
      estimatedCost: totalCost,
      bySystem,
      tasks: [...overdue, ...upcoming],
      chatMessage: chatMessage || null,
    }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error in maintenance-alerts:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
