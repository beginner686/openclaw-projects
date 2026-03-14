param(
    [string]$Message
)

Set-Location -Path $PSScriptRoot

if ([string]::IsNullOrWhiteSpace($Message)) {
    $Message = Read-Host "Commit message (leave empty for auto message)"
}

if ([string]::IsNullOrWhiteSpace($Message)) {
    $Message = "chore: quick update $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
}

Write-Host "Using commit message: $Message"
git add -A
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "No staged changes. Nothing to commit."
    exit 0
}

git commit -m $Message
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

git push origin main
exit $LASTEXITCODE
