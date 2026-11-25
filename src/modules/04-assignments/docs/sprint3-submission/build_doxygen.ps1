# Run from the C3L repository root, after syncing and verifying the final main branch.
$ErrorActionPreference = 'Stop'
if ((git branch --show-current).Trim() -ne 'main') { throw 'Switch to main first.' }
if (-not (Get-Command doxygen -ErrorAction SilentlyContinue)) {
    throw 'Doxygen is not installed. Install it (for example with winget install --id DimitriVanHeesch.Doxygen -e) and reopen the terminal.'
}
$cfg = Join-Path $PSScriptRoot 'Doxyfile.sprint3'
if (-not (Test-Path $cfg)) { throw 'Doxyfile.sprint3 must be alongside this script.' }
doxygen $cfg
if ($LASTEXITCODE -ne 0) { throw 'Doxygen failed.' }
$html = Join-Path (Get-Location).Path 'docs/doxygen-m04-sprint3/html'
if (-not (Test-Path (Join-Path $html 'index.html'))) { throw "Missing Doxygen index.html at $html" }
$zip = Join-Path (Get-Location).Path 'Group8_M04_Sprint3_Doxygen_HTML.zip'
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $html '*') -DestinationPath $zip -CompressionLevel Optimal
Write-Host "Created: $zip"
Write-Host 'Check that the archive includes index.html and generated class/file pages before submitting.'
