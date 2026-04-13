import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/pairing/consume
//
// Called by wilderena.com/account when a signed-in user enters
// the 6-digit code their in-game mod displayed. Links their
// Supabase Auth user to the Dragonwilds licensing_id permanently.
//
// Auth: Supabase session cookie (set by signing in via magic link)
// Body: { code: string }
// Returns: { licensing_id: string }
export async function POST(req: Request) {
  const ssr = getSupabaseServer();
  const { data: { user }, error: authErr } = await ssr.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "must be signed in" }, { status: 401 });
  }

  let body: { code?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "code must be 6 digits" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { data: pairing, error: lookupErr } = await admin
    .from("pairing_codes")
    .select("code, licensing_id, expires_at, used_at")
    .eq("code", code)
    .maybeSingle();

  if (lookupErr) {
    return NextResponse.json({ error: lookupErr.message }, { status: 500 });
  }
  if (!pairing) {
    return NextResponse.json({ error: "invalid code" }, { status: 404 });
  }
  if (pairing.used_at) {
    return NextResponse.json({ error: "code already used" }, { status: 410 });
  }
  if (new Date(pairing.expires_at) < new Date()) {
    return NextResponse.json({ error: "code expired" }, { status: 410 });
  }

  // Block linking if this licensing_id is already bound to someone else.
  const { data: existingLink } = await admin
    .from("licensing_links")
    .select("user_id")
    .eq("licensing_id", pairing.licensing_id)
    .maybeSingle();
  if (existingLink && existingLink.user_id !== user.id) {
    return NextResponse.json(
      { error: "this Dragonwilds account is already linked to another wilderena.com user" },
      { status: 409 }
    );
  }

  // Block linking if THIS user already has a different licensing_id.
  const { data: existingUserLink } = await admin
    .from("licensing_links")
    .select("licensing_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existingUserLink && existingUserLink.licensing_id !== pairing.licensing_id) {
    return NextResponse.json(
      { error: "your account is already linked to a different Dragonwilds licensing ID" },
      { status: 409 }
    );
  }

  // Ensure a profile row exists. Supabase Auth creates auth.users
  // automatically on signup but profiles is our own table.
  const fallbackName =
    (user.user_metadata?.display_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Player";

  const { error: profileErr } = await admin
    .from("profiles")
    .upsert({ id: user.id, display_name: fallbackName }, { onConflict: "id" });
  if (profileErr) {
    return NextResponse.json({ error: `profile: ${profileErr.message}` }, { status: 500 });
  }

  // Create (or no-op) the link row.
  const { error: linkErr } = await admin
    .from("licensing_links")
    .upsert({ user_id: user.id, licensing_id: pairing.licensing_id }, { onConflict: "user_id" });
  if (linkErr) {
    return NextResponse.json({ error: linkErr.message }, { status: 500 });
  }

  // Burn the code.
  await admin
    .from("pairing_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("code", code);

  return NextResponse.json({ licensing_id: pairing.licensing_id });
}
