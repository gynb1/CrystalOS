param(
  [int]$Port = 8080
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $root

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
  Write-Host "Python was not found. Install Python or open index.html directly."
  exit 1
}

Write-Host "CrystalOS demo: http://localhost:$Port"
Write-Host "Press Ctrl+C to stop."
python -m http.server $Port
