"use client";

import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export default function SignInForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("sending");
    setErrorMsg("");

    const supabase = getSupabaseBrowser();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/account`
      }
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm text-stone-400 font-semibold uppercase tracking-wide">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-2 w-full rounded-md bg-stone-900 border border-stone-700 px-4 py-3 text-stone-100 focus:outline-none focus:border-forge transition"
          />
        </label>
        <button
          type="submit"
          disabled={status === "sending" || status === "sent"}
          className="w-full px-6 py-3 rounded-md bg-forge hover:bg-forge-dim text-stone-50 font-semibold transition disabled:opacity-50"
        >
          {status === "sending" ? "Sending…" : status === "sent" ? "Check your inbox" : "Email me a sign-in link"}
        </button>
      </form>

      {status === "sent" && (
        <p className="mt-4 text-sm text-emerald-400">
          We sent a magic link to <strong>{email}</strong>. Click it to sign in.
        </p>
      )}
      {status === "error" && (
        <p className="mt-4 text-sm text-rose-400">{errorMsg}</p>
      )}
    </div>
  );
}
