import { TIERS } from "@/lib/ranks";

export default function LeaderboardPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-20">
      <h1 className="font-display text-4xl text-forge mb-2">Leaderboard</h1>
      <p className="text-stone-400 mb-10">
        Live standings synced from the Wilderena server after every match. Quarterly seasons.
      </p>

      {/* TODO: wire to Supabase realtime — placeholder table for now */}
      <div className="rounded-lg border border-stone-800 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-stone-900 text-stone-400 text-sm uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3 text-right">MMR</th>
              <th className="px-4 py-3 text-right">W / L</th>
              <th className="px-4 py-3 text-right">K / D</th>
              <th className="px-4 py-3 text-right">Captures</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800">
            <tr>
              <td className="px-4 py-8 text-center text-stone-500" colSpan={8}>
                No match data yet — leaderboard goes live with the season opener.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-12">
        <h2 className="font-display text-2xl text-stone-100 mb-4">Ranked Tiers</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {TIERS.map((t) => (
            <div
              key={t.id}
              className="rounded-md border border-stone-800 bg-stone-950/60 px-4 py-3"
            >
              <div className={`font-display text-lg ${t.color}`}>{t.name}</div>
              <div className="text-xs text-stone-500">
                {t.min}{t.max === Infinity ? "+" : ` – ${t.max}`} MMR
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-stone-500 mt-4">
          New players start at 1000 MMR (Silver). First 30 matches are placement matches with
          accelerated MMR gains. Team-based Elo — only match outcome counts toward MMR.
        </p>
      </div>
    </div>
  );
}
