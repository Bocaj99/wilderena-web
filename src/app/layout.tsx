import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Wilderena — 3v3 CTF for RuneScape Dragonwilds",
  description:
    "Wilderena is a competitive 3v3 Capture the Flag PvP mod for RuneScape Dragonwilds. Join ranked matches, climb the leaderboard, win glory.",
  icons: {
    icon: "/logo-emblem.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
