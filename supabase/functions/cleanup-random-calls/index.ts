import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000).toISOString();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString();

    const results: Record<string, number> = {};

    // 1. Close sessions stuck in 'deciding' status for more than 5 minutes
    const { data: decidingSessions, error: decidingError } = await supabase
      .from("random_call_sessions")
      .update({ status: "completed" })
      .eq("status", "deciding")
      .lt("created_at", fiveMinutesAgo)
      .select();

    if (decidingError) {
      console.error("Error cleaning deciding sessions:", decidingError);
    } else {
      results.deciding_sessions_closed = decidingSessions?.length || 0;
    }

    // 2. Close active sessions that are expired (ends_at < now)
    const { data: expiredSessions, error: expiredError } = await supabase
      .from("random_call_sessions")
      .update({ status: "completed" })
      .eq("status", "active")
      .lt("ends_at", now.toISOString())
      .select();

    if (expiredError) {
      console.error("Error cleaning expired sessions:", expiredError);
    } else {
      results.expired_sessions_closed = expiredSessions?.length || 0;
    }

    // 3. Close orphaned active sessions (no room_name or very old)
    const { data: orphanedSessions, error: orphanedError } = await supabase
      .from("random_call_sessions")
      .update({ status: "completed" })
      .eq("status", "active")
      .lt("created_at", tenMinutesAgo)
      .select();

    if (orphanedError) {
      console.error("Error cleaning orphaned sessions:", orphanedError);
    } else {
      results.orphaned_sessions_closed = orphanedSessions?.length || 0;
    }

    // 4. Remove stale queue entries (last_heartbeat > 2 minutes ago)
    const { data: staleQueue, error: queueError } = await supabase
      .from("random_call_queue")
      .delete()
      .lt("last_heartbeat", twoMinutesAgo)
      .select();

    if (queueError) {
      console.error("Error cleaning stale queue:", queueError);
    } else {
      results.stale_queue_entries_removed = staleQueue?.length || 0;
    }

    // 5. Clean up queue entries that are matched but have no corresponding active session
    const { data: matchedQueue } = await supabase
      .from("random_call_queue")
      .select("id, room_name")
      .eq("status", "matched")
      .not("room_name", "is", null);

    if (matchedQueue && matchedQueue.length > 0) {
      let orphanedMatched = 0;
      for (const entry of matchedQueue) {
        // Check if session exists and is active
        const { data: session } = await supabase
          .from("random_call_sessions")
          .select("id")
          .eq("room_name", entry.room_name)
          .eq("status", "active")
          .maybeSingle();

        if (!session) {
          // No active session for this matched entry - remove it
          await supabase.from("random_call_queue").delete().eq("id", entry.id);
          orphanedMatched++;
        }
      }
      results.orphaned_matched_queue_removed = orphanedMatched;
    }

    const totalCleaned = Object.values(results).reduce((a, b) => a + b, 0);

    console.log("[cleanup-random-calls]", "Cleanup completed", results);

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: now.toISOString(),
        cleaned: totalCleaned,
        details: results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[cleanup-random-calls]", "Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
