param(
  [int]$Port = 8787
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$tokenFile = Join-Path $root ".token"

if (-not $env:CRYSTALSEEK_TOKEN -and (Test-Path -LiteralPath $tokenFile)) {
  $env:CRYSTALSEEK_TOKEN = (Get-Content -LiteralPath $tokenFile -Raw).Trim()
}

$env:PORT = "$Port"
if (-not $env:CRYSTALSEEK_API) {
  $env:CRYSTALSEEK_API = "https://crystalseek.cn"
}

Write-Host "Starting CrystalSeek proxy on http://127.0.0.1:$Port"
python (Join-Path $root "server.py")
