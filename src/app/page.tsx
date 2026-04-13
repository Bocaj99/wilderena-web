import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 py-24 text-center">
          <Image
            src="/logo-header.png"
            alt="Wilderena"
            width={640}
            height={180}
            priority
            className="mx-auto w-full max-w-xl h-auto drop-shadow-[0_0_30px_rgba(180,83,9,0.35)]"
          />
          <p className="mt-8 text-xl md:text-2xl text-stone-300 font-display tracking-wide">
            3v3 Capture the Flag — forged for RuneScape Dragonwilds
          </p>
          <p className="mt-4 max-w-2xl mx-auto text-stone-400">
            Ranked PvP matches on dedicated servers. Earn glory, climb the leaderboard,
            and prove your clan is the strongest in the wilderness.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/download"
              className="px-6 py-3 rounded-md bg-forge hover:bg-forge-dim text-stone-50 font-semibold transition"
            >
              Download the Mod
            </Link>
            <Link
              href="/leaderboard"
              className="px-6 py-3 rounded-md border border-stone-700 hover:border-forge text-stone-200 font-semibold transition"
            >
              View Leaderboard
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-stone-800 bg-stone-950/60">
        <div className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-3 gap-10">
          <Feature
            title="Competitive 3v3"
            body="Balanced 3v3 CTF with friendly-fire prevention, ranked queues, and seasonal resets."
          />
          <Feature
            title="Live Leaderboard"
            body="Every match result syncs in real time. Track your kills, captures, MVPs, and clan rank."
          />
          <Feature
            title="Dedicated Servers"
            body="Hosted infrastructure with low latency, anti-cheat hooks, and quarterly seasonal play."
          />
        </div>
      </section>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-display text-2xl text-forge mb-3">{title}</h3>
      <p className="text-stone-400">{body}</p>
    </div>
  );
}
