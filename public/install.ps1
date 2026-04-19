#Requires -Version 5.1

# Wilderena Mod Installer
# Invoked by WilderenaInstaller.bat via:
#   powershell -NoProfile -ExecutionPolicy Bypass -Command "iwr https://wilderena.com/install.ps1 | iex"

$ErrorActionPreference = "Stop"
$ProgressPreference    = "SilentlyContinue"
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
# 1. Locate the RSDragonwilds install (look for Binaries\Win64 as the anchor)
# ---------------------------------------------------------------------------
$candidateRoots = @(
    "C:\Program Files (x86)\Steam\steamapps\common\RSDragonwilds\RSDragonwilds",
    "C:\Program Files\Steam\steamapps\common\RSDragonwilds\RSDragonwilds",
    "D:\SteamLibrary\steamapps\common\RSDragonwilds\RSDragonwilds",
    "E:\SteamLibrary\steamapps\common\RSDragonwilds\RSDragonwilds",
    "F:\SteamLibrary\steamapps\common\RSDragonwilds\RSDragonwilds"
)

try {
    $steamInstall = (Get-ItemProperty -Path "HKLM:\SOFTWARE\WOW6432Node\Valve\Steam" -Name "InstallPath" -ErrorAction SilentlyContinue).InstallPath
    if ($steamInstall) {
        $candidateRoots += Join-Path $steamInstall "steamapps\common\RSDragonwilds\RSDragonwilds"

        $vdfPath = Join-Path $steamInstall "steamapps\libraryfolders.vdf"
        if (Test-Path $vdfPath) {
            $vdfContent = Get-Content $vdfPath -Raw
            $regex = [regex]'"path"\s*"([^"]+)"'
            foreach ($m in $regex.Matches($vdfContent)) {
                $libPath = $m.Groups[1].Value -replace '\\\\', '\'
                $candidateRoots += Join-Path $libPath "steamapps\common\RSDragonwilds\RSDragonwilds"
            }
        }
    }
} catch {}

$gameRoot = $null
foreach ($path in $candidateRoots | Select-Object -Unique) {
    $binTest = Join-Path $path "Binaries\Win64"
    if (Test-Path $binTest) {
        $gameRoot = $path
        break
    }
}

if (-not $gameRoot) {
    Write-Host " [!] Could not find RSDragonwilds automatically." -ForegroundColor Red
    Write-Host ""
    Write-Host " Please enter the path to your RSDragonwilds folder."
    Write-Host " Example: C:\Program Files (x86)\Steam\steamapps\common\RSDragonwilds\RSDragonwilds"
    Write-Host ""
    $gameRoot = Read-Host " Path"
    if (-not (Test-Path (Join-Path $gameRoot "Binaries\Win64"))) {
        Write-Host ""
        Write-Host " [ERROR] Path not found or invalid." -ForegroundColor Red
        Exit-WithPause 1
    }
}

$paksDir = Join-Path $gameRoot "Content\Paks"
$binDir  = Join-Path $gameRoot "Binaries\Win64"
$logicModsDir = Join-Path $paksDir "LogicMods"

Write-Host " [OK] Found game at:" -ForegroundColor Green
Write-Host "      $gameRoot"
Write-Host ""

# ---------------------------------------------------------------------------
# 2. Ensure LogicMods folder exists
# ---------------------------------------------------------------------------
if (-not (Test-Path $logicModsDir)) {
    New-Item -ItemType Directory -Path $logicModsDir | Out-Null
    Write-Host " [OK] Created LogicMods folder" -ForegroundColor Green
}

# ---------------------------------------------------------------------------
# 3. Download the PAK files (ModActor Blueprint)
# ---------------------------------------------------------------------------
$supabaseUrl = "https://cosbtlthecypogtciwkc.supabase.co/storage/v1/object/public/downloads/latest"
$githubUrl   = "https://github.com/Bocaj99/wilderena-web/releases/latest/download"

# Small files from Supabase, large .ucas from GitHub Releases
$pakDownloads = @(
    @{ File = "CTFScoreboard.pak";  Url = "$supabaseUrl/CTFScoreboard.pak" },
    @{ File = "CTFScoreboard.utoc"; Url = "$supabaseUrl/CTFScoreboard.utoc" },
    @{ File = "CTFScoreboard.ucas"; Url = "$githubUrl/CTFScoreboard.ucas" }
)

Write-Host " Downloading Wilderena PAK files..." -ForegroundColor Cyan
Write-Host " (The .ucas file is ~280 MB - this may take a minute.)"
Write-Host ""

foreach ($dl in $pakDownloads) {
    $dest = Join-Path $logicModsDir $dl.File
    Write-Host "   > $($dl.File) ... " -ForegroundColor White -NoNewline
    try {
        # Use HttpClient with streaming for large files (handles redirects + no timeout)
        $handler = New-Object System.Net.Http.HttpClientHandler
        $handler.AllowAutoRedirect = $true
        $handler.MaxAutomaticRedirections = 10
        $http = New-Object System.Net.Http.HttpClient($handler)
        $http.Timeout = [TimeSpan]::FromMinutes(15)
        $http.DefaultRequestHeaders.Add("User-Agent", "WilderenaInstaller/1.0")
        $response = $http.GetAsync($dl.Url, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead).Result
        $response.EnsureSuccessStatusCode() | Out-Null
        $stream = $response.Content.ReadAsStreamAsync().Result
        $fs = [System.IO.File]::Create($dest)
        $buffer = New-Object byte[] (8192 * 16)
        $totalRead = 0
        $totalSize = $response.Content.Headers.ContentLength
        while (($read = $stream.Read($buffer, 0, $buffer.Length)) -gt 0) {
            $fs.Write($buffer, 0, $read)
            $totalRead += $read
            if ($totalSize -and $totalSize -gt 0) {
                $pct = [math]::Round(($totalRead / $totalSize) * 100, 0)
                Write-Host "`r   > $($dl.File) ... $pct% ($([math]::Round($totalRead/1MB,1)) MB)    " -NoNewline
            }
        }
        $fs.Close()
        $stream.Close()
        $http.Dispose()
        $sizeMB = [math]::Round((Get-Item $dest).Length / 1MB, 1)
        Write-Host "`r   > $($dl.File) ... done ($sizeMB MB)                    " -ForegroundColor Green
    } catch {
        Write-Host "FAILED" -ForegroundColor Red
        Write-Host "     $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host " Retry tip: re-run the installer. It will re-download only failed files."
        Write-Host " If the issue persists, check your internet connection."
        Exit-WithPause 1
    }
}

# ---------------------------------------------------------------------------
# 4. Download + extract WilderenaClient.zip (UE4SS + client VFX mod)
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host " Downloading Wilderena client VFX mod..." -ForegroundColor Cyan

$clientZip = Join-Path $env:TEMP "WilderenaClient.zip"
$clientUrl = "$supabaseUrl/WilderenaClient.zip"

Write-Host "   > WilderenaClient.zip ... " -ForegroundColor White -NoNewline
try {
    $wc = New-Object System.Net.WebClient
    $wc.Headers.Add("User-Agent", "WilderenaInstaller/1.0")
    $wc.DownloadFile($clientUrl, $clientZip)
    $wc.Dispose()
    $sizeMB = [math]::Round((Get-Item $clientZip).Length / 1MB, 1)
    Write-Host "done ($sizeMB MB)" -ForegroundColor Green
} catch {
    Write-Host "FAILED" -ForegroundColor Red
    Write-Host "     $($_.Exception.Message)" -ForegroundColor Red
    Exit-WithPause 1
}

Write-Host "   > Extracting to Binaries\Win64 ... " -ForegroundColor White -NoNewline
try {
    # Extract over existing files (upsert semantics)
    Expand-Archive -Path $clientZip -DestinationPath $binDir -Force
    Write-Host "done" -ForegroundColor Green
} catch {
    Write-Host "FAILED" -ForegroundColor Red
    Write-Host "     $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host " Common causes:" -ForegroundColor Yellow
    Write-Host "   - The game is open. Close Dragonwilds and try again."
    Write-Host "   - UE4SS DLL is locked by a previous process."
    Exit-WithPause 1
}

# Clean up temp zip
try { Remove-Item $clientZip -Force } catch {}

# ---------------------------------------------------------------------------
# 5. Done
# ---------------------------------------------------------------------------
Write-Banner "INSTALLATION COMPLETE!" "Green"
Write-Host " PAK files installed to:"
Write-Host "   $logicModsDir"
Write-Host ""
Write-Host " UE4SS + WilderenaClient installed to:"
Write-Host "   $binDir"
Write-Host ""
Write-Host " You can now launch Dragonwilds and join the Wilderena server." -ForegroundColor Cyan
Write-Host " Need help? Join our Discord at https://wilderena.com"
Exit-WithPause 0
