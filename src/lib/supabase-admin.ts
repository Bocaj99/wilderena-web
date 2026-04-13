import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only client. Bypasses RLS — never import this from a client component.
let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return client;
}
