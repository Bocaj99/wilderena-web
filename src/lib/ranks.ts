// Ranked tier + Elo computation for Wilderena 3v3 CTF.
//
// Used by:
//   * Leaderboard UI — render tier badges next to each player
//   * Ingest Edge Function — compute mmr_delta before inserting match_players
//
// Starting MMR = 1000. Bronze floor. Grandmaster has no ceiling.

export const STARTING_MMR = 1000;
export const PLACEMENT_MATCH_COUNT = 30;
export const K_PLACEMENT = 32;
export const K_RANKED = 16;

export type TierId =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "master"
  | "grandmaster";

export interface Tier {
  id: TierId;
  name: string;
  min: number;
  max: number;
  color: string; // tailwind text color class
}

export const TIERS: readonly Tier[] = [
  { id: "bronze",      name: "Bronze",      min: 0,    max: 999,      color: "text-amber-700" },
  { id: "silver",      name: "Silver",      min: 1000, max: 1199,     color: "text-stone-300" },
  { id: "gold",        name: "Gold",        min: 1200, max: 1399,     color: "text-yellow-400" },
  { id: "platinum",    name: "Platinum",    min: 1400, max: 1599,     color: "text-cyan-300" },
  { id: "diamond",     name: "Diamond",     min: 1600, max: 1799,     color: "text-sky-400" },
  { id: "master",      name: "Master",      min: 1800, max: 1999,     color: "text-fuchsia-400" },
  { id: "grandmaster", name: "Grandmaster", min: 2000, max: Infinity, color: "text-rose-500" }
] as const;

export function tierForMmr(mmr: number): Tier {
  for (const t of TIERS) {
    if (mmr >= t.min && mmr <= t.max) return t;
  }
  return TIERS[0];
}

/**
 * Standard team-based Elo for a 3v3 CTF result.
 *
 * expected = 1 / (1 + 10^((R_opp - R_self) / 400))
 * delta    = K * (actual - expected)
 *
 * actual: 1.0 win, 0.5 draw, 0.0 loss
 * K:      32 during placements (matches < 30), 16 thereafter
 *
 * The same delta is applied to every player on the team. Per-player
 * performance modifiers (KDA, captures, MVP) are intentionally NOT
 * folded into MMR — only match outcome counts. Performance still
 * shows up in leaderboard sort tiebreakers.
 */
export function computeMmrDelta(params: {
  selfTeamAvgMmr: number;
  opponentTeamAvgMmr: number;
  result: 1 | 0 | -1;
  matchesPlayed: number;
}): number {
  const { selfTeamAvgMmr, opponentTeamAvgMmr, result, matchesPlayed } = params;
  const expected = 1 / (1 + Math.pow(10, (opponentTeamAvgMmr - selfTeamAvgMmr) / 400));
  const actual = result === 1 ? 1 : result === 0 ? 0.5 : 0;
  const k = matchesPlayed < PLACEMENT_MATCH_COUNT ? K_PLACEMENT : K_RANKED;
  return Math.round(k * (actual - expected));
}

/**
 * Compute mmr_delta for every player in a finished match.
 * Returns a map of licensing_id -> delta.
 */
export function computeMatchDeltas(input: {
  red:  Array<{ licensing_id: string; mmr: number; matches_played: number }>;
  blue: Array<{ licensing_id: string; mmr: number; matches_played: number }>;
  winnerTeam: 0 | 1 | null; // 0 = red, 1 = blue, null = draw
}): Record<string, number> {
  const { red, blue, winnerTeam } = input;
  const redAvg  = red.reduce((s, p)  => s + p.mmr, 0) / red.length;
  const blueAvg = blue.reduce((s, p) => s + p.mmr, 0) / blue.length;

  const result = (team: 0 | 1): 1 | 0 | -1 =>
    winnerTeam === null ? 0 : winnerTeam === team ? 1 : -1;

  const out: Record<string, number> = {};
  for (const p of red) {
    out[p.licensing_id] = computeMmrDelta({
      selfTeamAvgMmr: redAvg,
      opponentTeamAvgMmr: blueAvg,
      result: result(0),
      matchesPlayed: p.matches_played
    });
  }
  for (const p of blue) {
    out[p.licensing_id] = computeMmrDelta({
      selfTeamAvgMmr: blueAvg,
      opponentTeamAvgMmr: redAvg,
      result: result(1),
      matchesPlayed: p.matches_played
    });
  }
  return out;
}
