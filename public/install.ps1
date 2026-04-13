#Requires -Version 5.1

# Wilderena Mod Installer
# Invoked by WilderenaInstaller.bat via:
#   powershell -NoProfile -ExecutionPolicy Bypass -Command "iwr https://wilderena.com/install.ps1 | iex"

$ErrorActionPreference = "Stop"
$ProgressPreference    = "SilentlyContinue"   # massive speedup for large downloads on PS 5.1
try { $Host.UI.RawUI.WindowTitle = "Wilderena Mod Installer" } catch {}

function Write-Banner($msg, $color = "Yellow") {
    Write-Host ""
    Write-Host " ============================================" -ForegroundColor DarkYellow
    Write-Host "    $msg" -ForegroundColor $color
    Write-Host " ============================================" -ForegroundColor DarkYellow
    Write-Host ""
}

function Exit-WithPause($code) {
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit $code
}

Write-Banner "WILDERENA - Client Mod Installer"

# ---------------------------------------------------------------------------
# 1. Locate the RSDragonwilds install
# ---------------------------------------------------------------------------
$candidatePaths = @(
    "C:\Program Files (x86)\Steam\steamapps\common\RSDragonwilds\RSDragonwilds\Content\Paks",
    "C:\Program Files\Steam\steamapps\common\RSDragonwilds\RSDragonwilds\Content\Paks",
    "D:\SteamLibrary\steamapps\common\RSDragonwilds\RSDragonwilds\Content\Paks",
    "E:\SteamLibrary\steamapps\common\RSDragonwilds\RSDragonwilds\Content\Paks",
    "F:\SteamLibrary\steamapps\common\RSDragonwilds\RSDragonwilds\Content\Paks"
)

# Also query Steam's install path from the registry and walk libraryfolders.vdf
try {
    $steamInstall = (Get-ItemProperty -Path "HKLM:\SOFTWARE\WOW6432Node\Valve\Steam" -Name "InstallPath" -ErrorAction SilentlyContinue).InstallPath
    if ($steamInstall) {
        $candidatePaths += Join-Path $steamInstall "steamapps\common\RSDragonwilds\RSDragonwilds\Content\Paks"

        $vdfPath = Join-Path $steamInstall "steamapps\libraryfolders.vdf"
        if (Test-Path $vdfPath) {
            $vdfContent = Get-Content $vdfPath -Raw
            $regex = [regex]'"path"\s*"([^"]+)"'
            foreach ($m in $regex.Matches($vdfContent)) {
                $libPath = $m.Groups[1].Value -replace '\\\\', '\'
                $candidatePaths += Join-Path $libPath "steamapps\common\RSDragonwilds\RSDragonwilds\Content\Paks"
            }
        }
    }
} catch {}

$gameDir = $null
foreach ($path in $candidatePaths | Select-Object -Unique) {
    if (Test-Path $path) {
        $gameDir = $path
        break
    }
}

if (-not $gameDir) {
    Write-Host " [!] Could not find RSDragonwilds automatically." -ForegroundColor Red
    Write-Host ""
    Write-Host " Please enter the path to your game's Content\Paks folder."
    Write-Host " Example: C:\Program Files (x86)\Steam\steamapps\common\RSDragonwilds\RSDragonwilds\Content\Paks"
    Write-Host ""
    $gameDir = Read-Host " Path"
    if (-not (Test-Path $gameDir)) {
        Write-Host ""
        Write-Host " [ERROR] Path not found." -ForegroundColor Red
        Exit-WithPause 1
    }
}

Write-Host " [OK] Found game at:" -ForegroundColor Green
Write-Host "      $gameDir"
Write-Host ""

# ---------------------------------------------------------------------------
# 2. Ensure LogicMods folder exists
# ---------------------------------------------------------------------------
$logicModsDir = Join-Path $gameDir "LogicMods"
if (-not (Test-Path $logicModsDir)) {
    New-Item -ItemType Directory -Path $logicModsDir | Out-Null
    Write-Host " [OK] Created LogicMods folder" -ForegroundColor Green
}

# ---------------------------------------------------------------------------
# 3. Download the three pak files
# ---------------------------------------------------------------------------
$baseUrl = "https://cosbtlthecypogtciwkc.supabase.co/storage/v1/object/public/downloads/latest"
$files = @(
    "CTFScoreboard.pak",
    "CTFScoreboard.utoc",
    "CTFScoreboard.ucas"   # largest — saved for last so a failure is cheap to retry
)

Write-Host " Downloading Wilderena mod files..." -ForegroundColor Cyan
Write-Host " (The .ucas file is ~280 MB — this may take a minute.)"
Write-Host ""

foreach ($file in $files) {
    $url  = "$baseUrl/$file"
    $dest = Join-Path $logicModsDir $file
    Write-Host "   > $file ... " -ForegroundColor White -NoNewline
    try {
        Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
        $sizeMB = [math]::Round((Get-Item $dest).Length / 1MB, 1)
        Write-Host "done ($sizeMB MB)" -ForegroundColor Green
    } catch {
        Write-Host "FAILED" -ForegroundColor Red
        Write-Host "     $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host " Common causes:" -ForegroundColor Yellow
        Write-Host "   - The game is open. Close Dragonwilds and try again."
        Write-Host "   - Network interruption. Check your connection and re-run the installer."
        Exit-WithPause 1
    }
}

# ---------------------------------------------------------------------------
# 4. Done
# ---------------------------------------------------------------------------
Write-Banner "INSTALLATION COMPLETE!" "Green"
Write-Host " Files installed to:"
Write-Host "   $logicModsDir"
Write-Host ""
Write-Host " You can now launch Dragonwilds and join the Wilderena server." -ForegroundColor Cyan
Write-Host " Need help? Join our Discord at https://wilderena.com"
Exit-WithPause 0
