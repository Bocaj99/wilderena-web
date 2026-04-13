export default function LeaderboardPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-20">
      <h1 className="font-display text-4xl text-forge mb-2">Leaderboard</h1>
      <p className="text-stone-400 mb-10">
        Live standings synced from the Wilderena server after every match.
      </p>

      {/* TODO: wire to Supabase realtime — placeholder table for now */}
      <div className="rounded-lg border border-stone-800 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-stone-900 text-stone-400 text-sm uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">Wins</th>
              <th className="px-4 py-3">K/D</th>
              <th className="px-4 py-3">Captures</th>
              <th className="px-4 py-3">MMR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800">
            <tr>
              <td className="px-4 py-8 text-center text-stone-500" colSpan={6}>
                No match data yet — leaderboard goes live with the season opener.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
