import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-stone-800 bg-stone-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo-emblem.png" alt="" width={36} height={36} />
          <span className="font-display text-xl tracking-wider text-stone-100">Wilderena</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm font-semibold text-stone-300">
          <Link href="/download" className="hover:text-forge transition">Download</Link>
          <Link href="/leaderboard" className="hover:text-forge transition">Leaderboard</Link>
          <Link href="/account" className="hover:text-forge transition">Account</Link>
        </nav>
      </div>
    </header>
  );
}
