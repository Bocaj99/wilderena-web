import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Wilderena — 3v3 CTF for RuneScape Dragonwilds",
  description:
    "Wilderena is a competitive 3v3 Capture the Flag PvP mod for RuneScape Dragonwilds. Join ranked matches, climb the leaderboard, win glory.",
  icons: {
    icon: "/main.emblem.wilderena.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const comingSoon = process.env.NEXT_PUBLIC_COMING_SOON !== "false";

  return (
    <html lang="en">
      <body className="font-sans min-h-screen flex flex-col bg-stone-950">
        {!comingSoon && <Header />}
        <main className="flex-1">{children}</main>
        {!comingSoon && <Footer />}
      </body>
    </html>
  );
}
