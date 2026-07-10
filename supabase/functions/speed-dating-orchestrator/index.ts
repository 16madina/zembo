import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Participant {
  id: string;
  user_id: string;
  gender: string | null;
  looking_for: string | null;
}

// Check if two participants are compatible based on gender preferences
function areCompatible(p1: Participant, p2: Participant): boolean {
  const g1 = p1.gender || "tous";
  const g2 = p2.gender || "tous";
  const lf1 = p1.looking_for || "tous";
  const lf2 = p2.looking_for || "tous";

  // p1 is looking for p2's gender (or tous)
  const p1LikesP2 = lf1 === "tous" || lf1 === g2;
  // p2 is looking for p1's gender (or tous)
  const p2LikesP1 = lf2 === "tous" || lf2 === g1;

  return p1LikesP2 && p2LikesP1;
}

// Smart pairing algorithm that respects gender preferences
function generateSmartPairings(participants: Participant[], totalRounds: number): { round: number; pairs: [string, string][] }[] {
  const n = participants.length;
  if (n < 2) return [];

  const rounds: { round: number; pairs: [string, string][] }[] = [];
  const usedPairs = new Set<string>(); // Track used pairs to avoid repetition

  for (let round = 0; round < totalRounds; round++) {
    const pairs: [string, string][] = [];
    const pairedThisRound = new Set<string>();

    // Shuffle participants for variety each round
    const shuffled = [...participants].sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffled.length; i++) {
      const p1 = shuffled[i];
      if (pairedThisRound.has(p1.user_id)) continue;

      for (let j = i + 1; j < shuffled.length; j++) {
        const p2 = shuffled[j];
        if (pairedThisRound.has(p2.user_id)) continue;

        // Check compatibility
        if (!areCompatible(p1, p2)) continue;

        // Check if this pair was already used in a previous round
        const pairKey = [p1.user_id, p2.user_id].sort().join("-");
        if (usedPairs.has(pairKey)) continue;

        // Valid pair found!
        pairs.push([p1.user_id, p2.user_id]);
        pairedThisRound.add(p1.user_id);
        pairedThisRound.add(p2.user_id);
        usedPairs.add(pairKey);
        break;
      }
    }

    rounds.push({ round: round + 1, pairs });
  }

  return rounds;
}

// Fallback: simple round-robin when smart pairing doesn't work well
function generateRoundRobinPairings(participants: Participant[], totalRounds: number): { round: number; pairs: [string, string][] }[] {
  const n = participants.length;
  if (n < 2) return [];

  const isOdd = n % 2 === 1;
  const userIds = participants.map(p => p.user_id);
  const players = isOdd ? [...userIds, "BYE"] : [...userIds];
  const numPlayers = players.length;
  const rounds: { round: number; pairs: [string, string][] }[] = [];

  for (let round = 0; round < Math.min(totalRounds, numPlayers - 1); round++) {
    const pairs: [string, string][] = [];
    
    for (let i = 0; i < numPlayers / 2; i++) {
      const home = players[i];
      const away = players[numPlayers - 1 - i];
      
      if (home !== "BYE" && away !== "BYE") {
        pairs.push([home, away]);
      }
    }
    
    rounds.push({ round: round + 1, pairs });
    
    const fixed = players[0];
    const rotated = [fixed, players[numPlayers - 1], ...players.slice(1, numPlayers - 1)];
    players.splice(0, players.length, ...rotated);
  }

  return rounds;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle scheduled invocations (CRON) - no body or empty body
    let action = "check_and_start";
    let session_id: string | undefined;

    try {
      const body = await req.json();
      if (body.action) action = body.action;
      if (body.session_id) session_id = body.session_id;
    } catch {
      // No body = scheduled invocation, use default action
      console.log("[speed-dating-orchestrator] Scheduled invocation - checking waiting sessions");
    }

    if (action === "check_and_start") {
      // Find sessions in waiting status with enough participants
      const { data: waitingSessions, error: sessionsError } = await supabase
        .from("speed_dating_sessions")
        .select("id, total_rounds, round_duration_seconds")
        .eq("status", "waiting");

      if (sessionsError) throw sessionsError;

      const results = [];

      for (const session of waitingSessions || []) {
        // Count active participants
        const { count } = await supabase
          .from("speed_dating_participants")
          .select("*", { count: "exact", head: true })
          .eq("session_id", session.id)
          .eq("is_active", true);

        const participantCount = count || 0;
        console.log(`[speed-dating] Session ${session.id}: ${participantCount} participants`);

        // Need at least 4 participants to start
        if (participantCount >= 4) {
          // Start the session
          const result = await startSession(supabase, session.id, session.total_rounds);
          results.push({ session_id: session.id, ...result });
        }
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "start_session" && session_id) {
      // Get session details
      const { data: session, error: sessionError } = await supabase
        .from("speed_dating_sessions")
        .select("id, total_rounds, round_duration_seconds, status")
        .eq("id", session_id)
        .single();

      if (sessionError) throw sessionError;
      if (!session) throw new Error("Session not found");

      if (session.status !== "waiting") {
        return new Response(
          JSON.stringify({ success: false, error: "Session already started" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await startSession(supabase, session_id, session.total_rounds);
      
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "next_round" && session_id) {
      const result = await advanceToNextRound(supabase, session_id);
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "end_voting" && session_id) {
      // Transition to voting phase
      await supabase
        .from("speed_dating_sessions")
        .update({ status: "voting" })
        .eq("id", session_id);

      return new Response(JSON.stringify({ success: true, status: "voting" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "complete_session" && session_id) {
      // Mark session as completed
      await supabase
        .from("speed_dating_sessions")
        .update({ 
          status: "completed",
          ended_at: new Date().toISOString()
        })
        .eq("id", session_id);

      return new Response(JSON.stringify({ success: true, status: "completed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[speed-dating-orchestrator] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function startSession(supabase: any, sessionId: string, totalRounds: number) {
  console.log(`[speed-dating] Starting session ${sessionId}`);

  // Get all active participants with gender preferences
  const { data: participants, error: participantsError } = await supabase
    .from("speed_dating_participants")
    .select("id, user_id, gender, looking_for")
    .eq("session_id", sessionId)
    .eq("is_active", true)
    // Ensure deterministic ordering so pairings are stable across calls
    .order("user_id", { ascending: true });

  if (participantsError) throw participantsError;
  if (!participants || participants.length < 2) {
    throw new Error("Not enough participants");
  }

  console.log(`[speed-dating] Found ${participants.length} participants`);

  // Generate pairings using smart algorithm (respects gender preferences)
  let roundPairings = generateSmartPairings(participants, totalRounds);
  
  // Check if we have enough compatible pairs
  const totalPairs = roundPairings.reduce((sum, r) => sum + r.pairs.length, 0);
  if (totalPairs === 0) {
    // Fallback to round-robin if no compatible pairs found
    console.log("[speed-dating] No compatible pairs, falling back to round-robin");
    roundPairings = generateRoundRobinPairings(participants, totalRounds);
  }
  
  console.log(`[speed-dating] Generated ${roundPairings.length} rounds`);

  // Idempotency: if round 1 already exists, don't create duplicates
  const { count: existingRound1Count, error: existingRound1Error } = await supabase
    .from("speed_dating_rounds")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("round_number", 1);

  if (existingRound1Error) throw existingRound1Error;
  if ((existingRound1Count || 0) > 0) {
    console.log(`[speed-dating] Round 1 already exists for session ${sessionId}, skipping inserts`);

    await supabase
      .from("speed_dating_sessions")
      .update({
        status: "in_progress",
        started_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    return {
      status: "started",
      round: 1,
      pairs_created: 0,
      total_rounds: roundPairings.length,
      already_exists: true,
    };
  }

  // Create round 1
  const firstRound = roundPairings[0];
  if (firstRound) {
    for (const [user1, user2] of firstRound.pairs) {
      const roomName = `speed-dating-${sessionId}-r1-${crypto.randomUUID().slice(0, 8)}`;
      
      await supabase.from("speed_dating_rounds").insert({
        session_id: sessionId,
        round_number: 1,
        user1_id: user1,
        user2_id: user2,
        room_name: roomName,
        started_at: new Date().toISOString(),
      });
    }
  }

  // Update session status to in_progress
  await supabase
    .from("speed_dating_sessions")
    .update({ 
      status: "in_progress",
      started_at: new Date().toISOString()
    })
    .eq("id", sessionId);

  // Store remaining pairings for later rounds (we'll use session metadata or handle in next_round)
  return { 
    status: "started",
    round: 1,
    pairs_created: firstRound?.pairs.length || 0,
    total_rounds: roundPairings.length
  };
}

async function advanceToNextRound(supabase: any, sessionId: string) {
  // Get session info
  const { data: session } = await supabase
    .from("speed_dating_sessions")
    .select("total_rounds")
    .eq("id", sessionId)
    .single();

  if (!session) throw new Error("Session not found");

  // Get current highest round number
  const { data: currentRounds } = await supabase
    .from("speed_dating_rounds")
    .select("round_number")
    .eq("session_id", sessionId)
    .order("round_number", { ascending: false })
    .limit(1);

  const currentRound = currentRounds?.[0]?.round_number || 0;
  const nextRound = currentRound + 1;

  if (nextRound > session.total_rounds) {
    // All rounds completed. Skip voting phase entirely (Flash Live no longer
    // creates matches from votes — users manually send connection requests).
    await supabase
      .from("speed_dating_sessions")
      .update({ status: "completed", ended_at: new Date().toISOString() })
      .eq("id", sessionId);

    return { status: "completed", message: "All rounds completed" };
  }

  // Idempotency: if next round already exists (another client already advanced), don't create duplicates.
  const { count: existingNextRoundCount, error: existingNextRoundError } = await supabase
    .from("speed_dating_rounds")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("round_number", nextRound);

  if (existingNextRoundError) throw existingNextRoundError;
  if ((existingNextRoundCount || 0) > 0) {
    console.log(`[speed-dating] Round ${nextRound} already exists for session ${sessionId}, returning existing state`);
    return {
      status: "round_started",
      round: nextRound,
      pairs_created: 0,
      already_exists: true,
    };
  }

  // End current round
  await supabase
    .from("speed_dating_rounds")
    .update({ ended_at: new Date().toISOString() })
    .eq("session_id", sessionId)
    .eq("round_number", currentRound);

  // Get participants for new pairings with gender preferences
  const { data: participants } = await supabase
    .from("speed_dating_participants")
    .select("id, user_id, gender, looking_for")
    .eq("session_id", sessionId)
    .eq("is_active", true)
    // Ensure deterministic ordering so pairings are stable across calls
    .order("user_id", { ascending: true });

  if (!participants || participants.length < 2) {
    throw new Error("Not enough active participants");
  }

  // Regenerate pairings and get the next round (prefer smart, fallback to round-robin)
  let allPairings = generateSmartPairings(participants, session.total_rounds);
  if (allPairings.reduce((sum, r) => sum + r.pairs.length, 0) === 0) {
    allPairings = generateRoundRobinPairings(participants, session.total_rounds);
  }
  const nextRoundPairings = allPairings[nextRound - 1];

  if (nextRoundPairings) {
    for (const [user1, user2] of nextRoundPairings.pairs) {
      const roomName = `speed-dating-${sessionId}-r${nextRound}-${crypto.randomUUID().slice(0, 8)}`;
      
      await supabase.from("speed_dating_rounds").insert({
        session_id: sessionId,
        round_number: nextRound,
        user1_id: user1,
        user2_id: user2,
        room_name: roomName,
        started_at: new Date().toISOString(),
      });
    }
  }

  return { 
    status: "round_started",
    round: nextRound,
    pairs_created: nextRoundPairings?.pairs.length || 0
  };
}
