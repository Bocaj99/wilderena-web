export default function AccountPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      <h1 className="font-display text-4xl text-forge mb-6">Account</h1>
      <p className="text-stone-300 mb-8">
        Link your Dragonwilds licensing ID, manage your subscription, and view your stats.
      </p>

      {/* TODO: auth flow + Stripe portal link */}
      <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-6">
        <p className="text-stone-500 italic">Sign-in coming soon.</p>
      </div>
    </div>
  );
}
