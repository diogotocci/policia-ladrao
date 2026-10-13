# Builds the Android package (Trusted Web Activity) for Google Play with Bubblewrap (V3 delivery 4).
# Run from the repo root, with a version code larger than the last one sent to Play (the first is 1):
#   powershell -ExecutionPolicy Bypass -File .\scripts\android-build.ps1 -VersionCode 1
# First run: Bubblewrap offers to install JDK 17 and the Android SDK (answer Yes and accept the license), and this
# script creates the upload key in android\upload-key.keystore (choose a strong password and keep it safe).
param([int]$VersionCode = 0)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
function Fail($msg) { Write-Host "STOPPED: $msg" -ForegroundColor Red; exit 1 }
if ($VersionCode -le 0) { Fail "pass -VersionCode N (a whole number larger than the last one uploaded to Play; the first upload is 1)." }

$bw = @('--yes', '@bubblewrap/cli@1.27.0')
$work = 'android\build'
$out = 'android\out'
New-Item -ItemType Directory -Force $work, $out | Out-Null

# 1. JDK 17 and Android SDK (Bubblewrap installs them the first time and keeps the paths in ~\.bubblewrap\config.json)
$config = Join-Path $HOME '.bubblewrap\config.json'
if (-not (Test-Path $config)) {
  Write-Host "First time: Bubblewrap will install JDK 17 and the Android SDK. Answer Yes and accept the Android SDK license." -ForegroundColor Yellow
  & npx.cmd @bw doctor
}
if (-not (Test-Path $config)) { Fail "Bubblewrap is not set up (no $config). Run: npx @bubblewrap/cli@1.27.0 doctor" }
$cfg = Get-Content $config -Raw | ConvertFrom-Json
$keytool = Join-Path $cfg.jdkPath 'bin\keytool.exe'
if (-not (Test-Path $keytool)) { Fail "keytool not found at $keytool" }

# 2. Upload key (Play re-signs the app with its own app signing key; this one only proves the upload is yours)
$ks = 'android\upload-key.keystore'
if (-not (Test-Path $ks)) {
  Write-Host "Creating the upload key. Choose a password of letters and numbers only (at least 6; Bubblewrap breaks on symbols like quotes, % or &) and SAVE IT: it is needed for every upload." -ForegroundColor Yellow
  & $keytool -genkeypair -v -keystore $ks -alias upload -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Diogo Tocci, O=Policia Ladrao, C=BR"
  if ($LASTEXITCODE -ne 0) { Fail 'keytool could not create the upload key.' }
}

# 3. Project from android\twa-manifest.json, with this version
# -Encoding UTF8: the files have no BOM, and Windows PowerShell would read the accents of the app name wrong
$version = (Get-Content package.json -Raw -Encoding UTF8 | ConvertFrom-Json).version
$m = Get-Content android\twa-manifest.json -Raw -Encoding UTF8 | ConvertFrom-Json
$m.appVersionCode = $VersionCode
$m.appVersion = $version
$m.signingKey.path = (Resolve-Path $ks).Path
[IO.File]::WriteAllText((Join-Path (Resolve-Path $work) 'twa-manifest.json'), ($m | ConvertTo-Json -Depth 10), (New-Object Text.UTF8Encoding $false))

Push-Location $work
try {
  & npx.cmd @bw update --skipVersionUpgrade --manifest twa-manifest.json
  if ($LASTEXITCODE -ne 0) { Fail 'bubblewrap update failed.' }
  # Google Play: new apps must target Android 16 (API 36) from 31/08/2026
  $gradle = Get-Content 'app\build.gradle' -Raw
  $target = if ($gradle -match 'targetSdkVersion (\d+)') { [int]$Matches[1] } else { 0 }
  if ($target -lt 36) { Fail "the generated project does not target API 36 (found: $target)." }

  $pass = Read-Host 'Upload key password' -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($pass)
  try {
    $env:BUBBLEWRAP_KEYSTORE_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    $env:BUBBLEWRAP_KEY_PASSWORD = $env:BUBBLEWRAP_KEYSTORE_PASSWORD
    & npx.cmd @bw build --skipPwaValidation --manifest twa-manifest.json
    $built = $LASTEXITCODE
  } finally {
    Remove-Item Env:BUBBLEWRAP_KEYSTORE_PASSWORD, Env:BUBBLEWRAP_KEY_PASSWORD -ErrorAction SilentlyContinue
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
  if ($built -ne 0) { Fail 'bubblewrap build failed (a wrong password is the usual cause).' }
} finally {
  Pop-Location
}

$aab = Join-Path $out "policia-ladrao-$version-$VersionCode.aab"
$apk = Join-Path $out "policia-ladrao-$version-$VersionCode.apk"
Copy-Item (Join-Path $work 'app-release-bundle.aab') $aab -Force
Copy-Item (Join-Path $work 'app-release-signed.apk') $apk -Force

Write-Host ''
Write-Host "SUCCESS" -ForegroundColor Green
Write-Host "  For Play (upload this one): $aab"
Write-Host "  For a phone by cable (adb install): $apk"
Write-Host '  Upload key SHA-256 (for ANDROID_SHA256_FINGERPRINTS, next to the one Play shows in App integrity):'
Write-Host '  (keytool asks the password once more)'
try {
  $ErrorActionPreference = 'Continue'
  $list = & $keytool -list -v -keystore $ks -alias upload
  $list | Select-String 'SHA256:' | ForEach-Object { Write-Host "  $($_.Line.Trim())" }
} catch {
  Write-Host '  Could not read it; run: keytool -list -v -keystore android\upload-key.keystore -alias upload'
}
