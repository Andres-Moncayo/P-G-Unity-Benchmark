# Ejecuta análisis de seguridad locales (sin Docker).
# Informes en: ..\reports\
# Requisitos: venv activado, Java 17+, Node/npm en PATH para frontend.

$ErrorActionPreference = "Stop"
$BackendRoot = Split-Path $PSScriptRoot -Parent
$FrontendRoot = Join-Path (Split-Path $BackendRoot -Parent) "g-unity-benchmark-Frontend"
$Reports = Join-Path $BackendRoot "reports"
$DcBat = Join-Path $BackendRoot "tools\dependency-check\bin\dependency-check.bat"

New-Item -ItemType Directory -Force -Path $Reports | Out-Null

Write-Host "=== pip-audit (dependencias Python) ===" -ForegroundColor Cyan
& "$BackendRoot\venv\Scripts\pip-audit.exe" -r "$BackendRoot\requirements.txt" `
    | Tee-Object -FilePath "$Reports\pip-audit.txt"

Write-Host "`n=== bandit (SAST Python) ===" -ForegroundColor Cyan
& "$BackendRoot\venv\Scripts\bandit.exe" -r "$BackendRoot\app" "$BackendRoot\core" "$BackendRoot\main.py" `
    -f txt -o "$Reports\bandit-report.txt"
& "$BackendRoot\venv\Scripts\bandit.exe" -r "$BackendRoot\app" "$BackendRoot\core" "$BackendRoot\main.py" `
    -f json -o "$Reports\bandit-report.json"

if (Test-Path $DcBat) {
    Write-Host "`n=== OWASP Dependency-Check (backend) ===" -ForegroundColor Cyan
    Write-Host "La primera ejecución descarga la base NVD (puede tardar 30-60+ min sin API key)." -ForegroundColor Yellow
    $owaspBackend = Join-Path $Reports "owasp-backend"
    & $DcBat --project "g-unity-benchmark-backend" `
        --scan "$BackendRoot\requirements.txt" `
        --format HTML --format JSON `
        --out $owaspBackend
    Write-Host "Informe: $owaspBackend\dependency-check-report.html"
}

if (Test-Path "$FrontendRoot\package.json") {
    Write-Host "`n=== npm audit (frontend) ===" -ForegroundColor Cyan
    Push-Location $FrontendRoot
    npm audit --json 2>$null | Out-File "$Reports\npm-audit-frontend.json" -Encoding utf8
    npm audit 2>&1 | Tee-Object -FilePath "$Reports\npm-audit-frontend.txt"
    Pop-Location

    if (Test-Path $DcBat) {
        Write-Host "`n=== OWASP Dependency-Check (frontend) ===" -ForegroundColor Cyan
        $lock = Join-Path $FrontendRoot "package-lock.json"
        if (Test-Path $lock) {
            $owaspFront = Join-Path $Reports "owasp-frontend"
            & $DcBat --project "g-unity-benchmark-frontend" `
                --scan $lock `
                --format HTML --format JSON `
                --out $owaspFront
            Write-Host "Informe: $owaspFront\dependency-check-report.html"
        }
    }
}

Write-Host "`n=== SonarQube / SonarCloud ===" -ForegroundColor Cyan
if (Get-Command sonar-scanner -ErrorAction SilentlyContinue) {
  Write-Host "Backend:  cd $BackendRoot; sonar-scanner (con SONAR_TOKEN y sonar.organization en sonar-project.properties o -D)"
  Write-Host "Frontend: cd $FrontendRoot; sonar-scanner"
} else {
  Write-Host "sonar-scanner no está en PATH. Instálalo o usa la extensión SonarLint en el IDE." -ForegroundColor Yellow
  Write-Host "SonarCloud: https://sonarcloud.io — cuenta gratis, token en User > Security"
}

Write-Host "`nListo. Revisa la carpeta: $Reports" -ForegroundColor Green
