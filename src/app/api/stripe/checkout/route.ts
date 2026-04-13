import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

// POST /api/stripe/checkout
// Body: { userId: string }
// Returns: { url: string } — Stripe Checkout Session URL
export async function POST(req: Request) {
  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("id, display_name")
    .eq("id", userId)
    .single();

  if (profileErr || !profile) {
    return NextResponse.json({ error: "profile not found" }, { status: 404 });
  }

  // Reuse existing Stripe customer if we already created one for this user.
  const { data: existingSub } = await supabaseAdmin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  let customerId = existingSub?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: profile.display_name,
      metadata: { user_id: userId }
    });
    customerId = customer.id;
  }

  const origin = req.headers.get("origin") ?? "https://wilderena.com";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: process.env.STRIPE_PRICE_QUARTERLY!, quantity: 1 }],
    subscription_data: {
      trial_period_days: 30,
      metadata: { user_id: userId }
    },
    success_url: `${origin}/account?checkout=success`,
    cancel_url: `${origin}/account?checkout=cancelled`,
    allow_promotion_codes: true
  });

  return NextResponse.json({ url: session.url });
}
