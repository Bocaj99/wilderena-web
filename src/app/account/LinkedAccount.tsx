"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

interface Props {
  email: string;
  displayName: string | null;
  licensingId: string | null;
}

export default function LinkedAccount({ email, displayName, licensingId }: Props) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "linking" | "linked" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSignOut() {
    await getSupabaseBrowser().auth.signOut();
    router.refresh();
  }

  async function handleLink(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setStatus("error");
      setErrorMsg("Code must be 6 digits");
      return;
    }
    setStatus("linking");
    setErrorMsg("");

    const res = await fetch("/api/pairing/consume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });

    if (res.ok) {
      setStatus("linked");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({ error: "request failed" }));
      setStatus("error");
      setErrorMsg(data.error ?? "could not link");
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-stone-500 uppercase tracking-wide">Signed in as</div>
            <div className="text-lg text-stone-100 font-semibold">{displayName ?? email}</div>
            <div className="text-sm text-stone-500">{email}</div>
          </div>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 rounded-md border border-stone-700 hover:border-forge text-stone-300 text-sm font-semibold transition"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-6">
        <h2 className="font-display text-2xl text-stone-100 mb-2">Dragonwilds Account</h2>

        {licensingId ? (
          <div>
            <div className="text-xs text-stone-500 uppercase tracking-wide mb-1">Linked licensing ID</div>
            <div className="font-mono text-forge text-lg">{licensingId}</div>
            <p className="text-sm text-stone-500 mt-3">
              Your in-game character is linked. Match results will sync to the leaderboard automatically.
            </p>
          </div>
        ) : (
          <>
            <p className="text-stone-400 mb-4">
              Type <code className="text-forge">/pair</code> in-game on the Wilderena server to get a 6-digit
              code, then enter it below to link this web account to your Dragonwilds character.
            </p>
            <form onSubmit={handleLink} className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full rounded-md bg-stone-900 border border-stone-700 px-4 py-3 text-stone-100 text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:border-forge transition"
              />
              <button
                type="submit"
                disabled={status === "linking"}
                className="w-full px-6 py-3 rounded-md bg-forge hover:bg-forge-dim text-stone-50 font-semibold transition disabled:opacity-50"
              >
                {status === "linking" ? "Linking…" : "Link Dragonwilds Account"}
              </button>
              {status === "error" && <p className="text-sm text-rose-400">{errorMsg}</p>}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
