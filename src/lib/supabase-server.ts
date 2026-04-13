import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

// Server-side Supabase client that reads the auth session from
// the request's cookies. Use this from route handlers and server
// components when you need to know "who is the signed-in user?".
//
// For unauthenticated server work (Stripe webhooks, ingest from
// the game server), use getSupabaseAdmin() instead.
export function getSupabaseServer(): SupabaseClient {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // route handlers can't always set cookies (e.g. during streaming) — ignore
          }
        },
        remove(name: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // see above
          }
        }
      }
    }
  );
}
