import { getSupabaseServer } from "@/lib/supabase-server";
import SignInForm from "./SignInForm";
import LinkedAccount from "./LinkedAccount";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  let licensingId: string | null = null;
  let displayName: string | null = null;

  if (user) {
    const { data: link } = await supabase
      .from("licensing_links")
      .select("licensing_id")
      .eq("user_id", user.id)
      .maybeSingle();
    licensingId = link?.licensing_id ?? null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();
    displayName = profile?.display_name ?? null;
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      <h1 className="font-display text-4xl text-forge mb-6">Account</h1>

      {!user && (
        <>
          <p className="text-stone-300 mb-8">
            Sign in to link your Dragonwilds licensing ID, manage your subscription,
            and view your stats.
          </p>
          <SignInForm />
        </>
      )}

      {user && (
        <LinkedAccount
          email={user.email ?? ""}
          displayName={displayName}
          licensingId={licensingId}
        />
      )}
    </div>
  );
}
