export default function DownloadPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      <h1 className="font-display text-4xl text-forge mb-6">Download Wilderena</h1>
      <p className="text-stone-300 mb-8">
        One click, one file, no extraction. The installer auto-detects your Dragonwilds
        install and drops the mod files into the right folder.
      </p>

      <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-semibold text-stone-100">Wilderena Installer</div>
            <div className="text-sm text-stone-500">2 KB · auto-downloads ~291 MB of mod files</div>
          </div>
          <a
            href="/WilderenaInstaller.bat"
            download
            className="px-5 py-2 rounded-md bg-forge hover:bg-forge-dim font-semibold transition whitespace-nowrap"
          >
            Download Installer
          </a>
        </div>
      </div>

      <h2 className="font-display text-2xl text-stone-100 mt-12 mb-4">How it works</h2>
      <ol className="list-decimal list-inside space-y-2 text-stone-300">
        <li>Click <strong>Download Installer</strong> above — you get a tiny <code className="text-forge">WilderenaInstaller.bat</code> file.</li>
        <li>Double-click it. A console window opens and walks you through the install.</li>
        <li>It auto-detects your Dragonwilds folder, downloads the three mod files straight into the correct directory, and reports success.</li>
        <li>Launch RuneScape Dragonwilds (Jagex or Steam launcher) and select the Wilderena server.</li>
      </ol>

      <div className="mt-12 rounded-lg border border-stone-800 bg-stone-950/40 p-6 text-sm text-stone-400">
        <div className="font-semibold text-stone-200 mb-2">Having trouble?</div>
        <ul className="list-disc list-inside space-y-1">
          <li>If Windows SmartScreen warns about the batch file, click <em>More info → Run anyway</em>.</li>
          <li>If auto-detection fails, the installer will prompt you to paste your <code className="text-forge">Content\Paks</code> path manually.</li>
          <li>Close Dragonwilds before running the installer — open game files are locked.</li>
        </ul>
      </div>
    </div>
  );
}
