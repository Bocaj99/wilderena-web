import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/pairing/create
//
// Called by the UE4SS Lua mod on the Bisect game server when a
// player requests a pairing code in-game (e.g. via chat command).
// The mod then displays the returned code on the player's HUD so
// they can type it on wilderena.com to link their web account.
//
// Auth: Authorization: Bearer ${INGEST_SHARED_SECRET}
// Body: { licensing_id: string }
// Returns: { code: string, expires_at: string }
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.INGEST_SHARED_SECRET}`;
  if (!auth || auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { licensing_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const licensingId = body.licensing_id;
  if (typeof licensingId !== "string" || licensingId.length === 0) {
    return NextResponse.json({ error: "licensing_id required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Invalidate any previous unused codes for this licensing_id —
  // a player should only have one active pairing code at a time.
  await supabase
    .from("pairing_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("licensing_id", licensingId)
    .is("used_at", null);

  // Generate a fresh 6-digit code, retrying on the (vanishingly
  // rare) chance of collision with an existing active code.
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  let code = "";
  for (let attempt = 0; attempt < 10; attempt++) {
    code = Math.floor(Math.random() * 1_000_000).toString().padStart(6, "0");
    const { error } = await supabase.from("pairing_codes").insert({
      code,
      licensing_id: licensingId,
      expires_at: expiresAt
    });
    if (!error) {
      return NextResponse.json({ code, expires_at: expiresAt });
    }
    // 23505 = unique_violation; anything else is a real error
    if (error.code !== "23505") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "could not allocate code, try again" }, { status: 503 });
}
