export default function DownloadPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      <h1 className="font-display text-4xl text-forge mb-6">Download Wilderena</h1>
      <p className="text-stone-300 mb-8">
        Install the mod, then connect to the official server to start playing ranked 3v3 CTF.
      </p>

      <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-stone-100">Wilderena Mod (Windows)</div>
            <div className="text-sm text-stone-500">~291 MB &middot; install.bat included</div>
          </div>
          {/* TODO: replace with signed Supabase Storage URL */}
          <a
            href="#"
            className="px-5 py-2 rounded-md bg-forge hover:bg-forge-dim font-semibold transition"
          >
            Download .zip
          </a>
        </div>
      </div>

      <h2 className="font-display text-2xl text-stone-100 mt-12 mb-4">Install Steps</h2>
      <ol className="list-decimal list-inside space-y-2 text-stone-300">
        <li>Extract the zip anywhere.</li>
        <li>Run <code className="text-forge">install.bat</code> — it copies the .pak files into your Dragonwilds install.</li>
        <li>Launch RuneScape Dragonwilds (Jagex or Steam).</li>
        <li>Select the Wilderena server from the in-game browser.</li>
      </ol>
    </div>
  );
}
