import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { computeMatchDeltas, STARTING_MMR } from "@/lib/ranks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/ingest/match
//
// Called by the UE4SS Lua mod on the Bisect game server when a
// 3v3 CTF match finishes. We:
//   1. Resolve the current season
//   2. Fetch each player's current MMR + matches_played
//   3. Compute team-Elo deltas via computeMatchDeltas()
//   4. Insert one matches row and 6 match_players rows
//   5. The match_players_after_insert trigger updates player_stats
//
// Auth: Authorization: Bearer ${INGEST_SHARED_SECRET}

interface IngestPlayer {
  licensing_id: string;
  display_name: string;
  class: "archer" | "assassin" | "guardian" | "berserker" | "fire_mage" | "air_mage";
  team: 0 | 1;
  kills: number;
  deaths: number;
  assists: number;
  captures: number;
  flag_returns: number;
  damage_dealt: number;
  is_mvp: boolean;
}

interface IngestPayload {
  map: string;
  started_at: string;
  ended_at: string;
  red_score: number;
  blue_score: number;
  winner_team: 0 | 1 | null;
  players: IngestPlayer[];
}

const VALID_CLASSES = new Set([
  "archer", "assassin", "guardian", "berserker", "fire_mage", "air_mage"
]);

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.INGEST_SHARED_SECRET}`;
  if (!auth || auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: IngestPayload;
  try {
    payload = (await req.json()) as IngestPayload;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // Shape validation — fail loudly so a broken Lua payload doesn't poison the leaderboard.
  if (!Array.isArray(payload.players) || payload.players.length === 0) {
    return NextResponse.json({ error: "players required" }, { status: 400 });
  }
  for (const p of payload.players) {
    if (typeof p.licensing_id !== "string" || !p.licensing_id) {
      return NextResponse.json({ error: "player licensing_id required" }, { status: 400 });
    }
    if (!VALID_CLASSES.has(p.class)) {
      return NextResponse.json({ error: `invalid class: ${p.class}` }, { status: 400 });
    }
    if (p.team !== 0 && p.team !== 1) {
      return NextResponse.json({ error: "team must be 0 or 1" }, { status: 400 });
    }
  }

  const supabase = getSupabaseAdmin();

  // Resolve current season
  const { data: season, error: seasonErr } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .maybeSingle();
  if (seasonErr || !season) {
    return NextResponse.json({ error: "no current season" }, { status: 500 });
  }

  // Fetch existing MMR + matches_played for all players in this match
  const ids = payload.players.map((p) => p.licensing_id);
  const { data: existingStats } = await supabase
    .from("player_stats")
    .select("licensing_id, mmr, matches")
    .eq("season_id", season.id)
    .in("licensing_id", ids);

  const statsByLicensingId = new Map<string, { mmr: number; matches: number }>();
  for (const row of existingStats ?? []) {
    statsByLicensingId.set(row.licensing_id, { mmr: row.mmr, matches: row.matches });
  }
  const lookup = (lid: string) => statsByLicensingId.get(lid) ?? { mmr: STARTING_MMR, matches: 0 };

  // Compute team Elo deltas
  const red  = payload.players.filter((p) => p.team === 0).map((p) => ({
    licensing_id: p.licensing_id, mmr: lookup(p.licensing_id).mmr, matches_played: lookup(p.licensing_id).matches
  }));
  const blue = payload.players.filter((p) => p.team === 1).map((p) => ({
    licensing_id: p.licensing_id, mmr: lookup(p.licensing_id).mmr, matches_played: lookup(p.licensing_id).matches
  }));
  const deltas = computeMatchDeltas({ red, blue, winnerTeam: payload.winner_team });

  // Insert match row
  const { data: match, error: matchErr } = await supabase
    .from("matches")
    .insert({
      season_id: season.id,
      map: payload.map,
      started_at: payload.started_at,
      ended_at: payload.ended_at,
      red_score: payload.red_score,
      blue_score: payload.blue_score,
      winner_team: payload.winner_team
    })
    .select("id")
    .single();
  if (matchErr || !match) {
    return NextResponse.json({ error: matchErr?.message ?? "match insert failed" }, { status: 500 });
  }

  // Insert all match_players in one shot — trigger fires per row to update player_stats
  const playerRows = payload.players.map((p) => {
    const result =
      payload.winner_team === null ? 0 : payload.winner_team === p.team ? 1 : -1;
    const before = lookup(p.licensing_id).mmr;
    return {
      match_id: match.id,
      licensing_id: p.licensing_id,
      display_name: p.display_name,
      class: p.class,
      team: p.team,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      captures: p.captures,
      flag_returns: p.flag_returns,
      damage_dealt: p.damage_dealt,
      is_mvp: p.is_mvp,
      result,
      mmr_before: before,
      mmr_delta: deltas[p.licensing_id] ?? 0
    };
  });

  const { error: playersErr } = await supabase.from("match_players").insert(playerRows);
  if (playersErr) {
    return NextResponse.json({ error: playersErr.message }, { status: 500 });
  }

  return NextResponse.json({
    match_id: match.id,
    deltas
  });
}
