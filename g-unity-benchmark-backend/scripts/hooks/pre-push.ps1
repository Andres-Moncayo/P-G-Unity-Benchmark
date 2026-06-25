# Pre-push hook in PowerShell for Windows
# Prevents direct pushes to main/master branch

$branch = git rev-parse --abbrev-ref HEAD

if ($branch -eq "main" -or $branch -eq "master") {
    Write-Host ""
    Write-Host "===================================================="
    Write-Host "ERROR: No se permite hacer push directo a main/master."
    Write-Host "Por favor, crea una rama y haz un pull request."
    Write-Host "===================================================="
    Write-Host ""
    exit 1
}

exit 0
