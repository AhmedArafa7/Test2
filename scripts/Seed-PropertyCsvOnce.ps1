param(
    [string]$Url = "http://127.0.0.1:5095"
)

$ErrorActionPreference = "Stop"

if (-not $env:ConnectionStrings__DefaultConnection) {
    throw "ConnectionStrings__DefaultConnection must be set before running this script."
}

if (-not $env:JwtSettings__Secret) {
    throw "JwtSettings__Secret must be set before running this script."
}

if (-not $env:AdminSettings__DefaultPassword) {
    throw "AdminSettings__DefaultPassword must be set before running this script."
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$logDirectory = Join-Path $projectRoot "runtime-logs"
$stdoutLog = Join-Path $logDirectory "manual-csv-seed.out.log"
$stderrLog = Join-Path $logDirectory "manual-csv-seed.err.log"

New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
Remove-Item $stdoutLog, $stderrLog -ErrorAction SilentlyContinue

$env:StartupInitialization__Enabled = "true"
$env:StartupInitialization__SeedPropertyCsvOnStartup = "true"

$process = Start-Process dotnet `
    -ArgumentList "run --project src\Baytology.Api\Baytology.Api.csproj --no-build --urls $Url" `
    -WorkingDirectory $projectRoot `
    -PassThru `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog

try {
    for ($attempt = 0; $attempt -lt 300; $attempt++) {
        Start-Sleep -Seconds 1

        $combinedLog = @()
        if (Test-Path $stdoutLog) {
            $combinedLog += Get-Content $stdoutLog -ErrorAction SilentlyContinue
        }

        if (Test-Path $stderrLog) {
            $combinedLog += Get-Content $stderrLog -ErrorAction SilentlyContinue
        }

        if ($combinedLog -match "Property CSV synchronization finished\." -or
            $combinedLog -match "Property CSV seeding is disabled for this environment\.") {
            break
        }

        if ($process.HasExited) {
            break
        }
    }
}
finally {
    if (-not $process.HasExited) {
        Stop-Process -Id $process.Id -Force
        $process.WaitForExit()
    }

    $env:StartupInitialization__SeedPropertyCsvOnStartup = "false"
}

Write-Output "Manual property CSV seed run completed. Review logs:"
Write-Output "  $stdoutLog"
Write-Output "  $stderrLog"
