#Requires -Version 5.1

# Wilderena Mod Installer (one-click)
# Invoked by WilderenaInstaller.bat via:
#   powershell -NoProfile -ExecutionPolicy Bypass -Command "iwr https://wilderena.com/install.ps1 | iex"
#
# Downloads the single WilderenaModpack.zip from GitHub Releases and installs
# everything needed for the mod to operate, with zero user configuration:
#   - UE4SS + WilderenaClient mod (VFX + class asset preload)
#   - CTFScoreboard LogicMod (.pak/.ucas/.utoc)
#   - Visual C++ 2015-2022 runtime DLLs (bundled locally to prevent mismatches)
#   - Pre-warmed shader pipeline cache (.upipelinecache -> %LOCALAPPDATA%)

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

Write-Banner "WILDERENA - Mod Installer (one-click)"

# TLS 1.2 required by GitHub
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12

# ---------------------------------------------------------------------------
# 1. Check game isn't running (avoids file locks on DLL overwrite)
# ---------------------------------------------------------------------------
$running = Get-Process -Name "RSDragonwilds-Win64-Shipping" -ErrorAction SilentlyContinue
if ($running) {
    Write-Host " [ERROR] RSDragonwilds is currently running." -ForegroundColor Red
    Write-Host "         Close the game completely, then re-run the installer." -ForegroundColor Yellow
    Exit-WithPause 1
}

# ---------------------------------------------------------------------------
# 2. Locate RSDragonwilds install
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
    try {
        # Extract drive letter; skip if drive not mounted (avoids DriveNotFoundException)
        if ($path -match '^([A-Za-z]):') {
            $driveLetter = $Matches[1]
            if (-not (Test-Path "${driveLetter}:\" -ErrorAction SilentlyContinue)) { continue }
        }
        $binPath = Join-Path $path "Binaries\Win64" -ErrorAction SilentlyContinue
        if ($binPath -and (Test-Path $binPath -ErrorAction SilentlyContinue)) {
            $gameRoot = $path
            break
        }
    } catch {
        continue
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
        Write-Host " [ERROR] Path not found or invalid." -ForegroundColor Red
        Exit-WithPause 1
    }
}

Write-Host " [OK] Found game at:" -ForegroundColor Green
Write-Host "      $gameRoot"

# ---------------------------------------------------------------------------
# 3. Download WilderenaModpack.zip (one file, ~290 MB)
# ---------------------------------------------------------------------------
$modpackUrl = "https://github.com/Bocaj99/wilderena-web/releases/download/v1.0.0/WilderenaModpack.zip"
$tmpRoot    = Join-Path $env:TEMP "Wilderena_Install_$(Get-Random -Maximum 999999)"
$modpackZip = Join-Path $tmpRoot "WilderenaModpack.zip"
$extractDir = Join-Path $tmpRoot "extract"
New-Item -ItemType Directory -Path $tmpRoot -Force | Out-Null

Write-Host ""
Write-Host " Downloading mod pack (~290 MB, one-time)..." -ForegroundColor Cyan
Write-Host ""

try {
    $curlExe = Join-Path $env:SystemRoot "System32\curl.exe"
    if (Test-Path $curlExe) {
        & $curlExe -L -o $modpackZip --retry 3 --connect-timeout 30 --max-time 1800 --progress-bar $modpackUrl
        if ($LASTEXITCODE -ne 0) { throw "curl exit code $LASTEXITCODE" }
    } else {
        $wc = New-Object System.Net.WebClient
        $wc.Headers.Add("User-Agent", "WilderenaInstaller/2.0")
        $wc.DownloadFile($modpackUrl, $modpackZip)
        $wc.Dispose()
    }
    if (-not (Test-Path $modpackZip) -or (Get-Item $modpackZip).Length -lt 10MB) {
        throw "Downloaded file is missing or truncated"
    }
    $sizeMB = [math]::Round((Get-Item $modpackZip).Length / 1MB, 1)
    Write-Host " [OK] Downloaded ($sizeMB MB)" -ForegroundColor Green
} catch {
    Write-Host " [ERROR] Download failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "         Check your connection and re-run the installer." -ForegroundColor Yellow
    try { Remove-Item $tmpRoot -Recurse -Force } catch {}
    Exit-WithPause 1
}

# ---------------------------------------------------------------------------
# 4. Extract
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host " Extracting..." -ForegroundColor Cyan
try {
    Expand-Archive -Path $modpackZip -DestinationPath $extractDir -Force
    Write-Host " [OK] Extracted" -ForegroundColor Green
} catch {
    Write-Host " [ERROR] Extraction failed: $($_.Exception.Message)" -ForegroundColor Red
    try { Remove-Item $tmpRoot -Recurse -Force } catch {}
    Exit-WithPause 1
}

# ---------------------------------------------------------------------------
# 5. Install: mirror payload\game\* -> <gameRoot>, payload\appdata\* -> %LOCALAPPDATA%\RSDragonwilds
# ---------------------------------------------------------------------------
$gameSrc    = Join-Path $extractDir "payload\game"
$appdataSrc = Join-Path $extractDir "payload\appdata"
$appdataDst = Join-Path $env:LOCALAPPDATA "RSDragonwilds"

if (-not (Test-Path $gameSrc)) {
    Write-Host " [ERROR] Invalid mod pack: payload\game missing" -ForegroundColor Red
    try { Remove-Item $tmpRoot -Recurse -Force } catch {}
    Exit-WithPause 1
}

Write-Host ""
Write-Host " Installing mod files to game folder..." -ForegroundColor Cyan
try {
    # robocopy returns >=8 on real errors; 0-7 indicates success (some files copied, etc.)
    $rcArgs = @($gameSrc, $gameRoot, "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/NP", "/R:1", "/W:1")
    & robocopy @rcArgs | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "robocopy errorlevel $LASTEXITCODE" }
    Write-Host " [OK] Game files installed" -ForegroundColor Green
} catch {
    Write-Host " [ERROR] Install failed: $($_.Exception.Message)" -ForegroundColor Red
    try { Remove-Item $tmpRoot -Recurse -Force } catch {}
    Exit-WithPause 1
}

if (Test-Path $appdataSrc) {
    Write-Host ""
    Write-Host " Pre-seeding shader cache..." -ForegroundColor Cyan
    try {
        if (-not (Test-Path $appdataDst)) { New-Item -ItemType Directory -Path $appdataDst -Force | Out-Null }
        $rcArgs = @($appdataSrc, $appdataDst, "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/NP", "/R:1", "/W:1")
        & robocopy @rcArgs | Out-Null
        if ($LASTEXITCODE -ge 8) {
            Write-Host " [WARN] Shader cache copy failed (non-fatal; game will compile fresh)" -ForegroundColor Yellow
        } else {
            Write-Host " [OK] Shader pipeline cache installed" -ForegroundColor Green
        }
    } catch {
        Write-Host " [WARN] Shader cache copy failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# ---------------------------------------------------------------------------
# 6. Cleanup
# ---------------------------------------------------------------------------
try { Remove-Item $tmpRoot -Recurse -Force } catch {}

# ---------------------------------------------------------------------------
# 7. Done
# ---------------------------------------------------------------------------
Write-Banner "INSTALLATION COMPLETE!" "Green"
Write-Host " Installed:" -ForegroundColor White
Write-Host "   - UE4SS + WilderenaClient mod (class asset preload enabled)"
Write-Host "   - CTFScoreboard LogicMod"
Write-Host "   - Visual C++ 2015-2022 runtime (bundled locally)"
Write-Host "   - Shader pipeline cache pre-seeded"
Write-Host ""
Write-Host " Launch Dragonwilds normally and join the Wilderena server." -ForegroundColor Cyan
Write-Host " Need help? https://wilderena.com"
Exit-WithPause 0
