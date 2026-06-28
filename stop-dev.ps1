$ErrorActionPreference = "SilentlyContinue"

$projectRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path

function Test-ProjectProcess {
  param([Parameter(Mandatory = $true)]$Process)

  $rootPattern = "*" + $projectRoot + "*"

  if ($Process.CommandLine -like $rootPattern) {
    return $true
  }

  if ($Process.ExecutablePath -like $rootPattern) {
    return $true
  }

  $parentId = $Process.ParentProcessId
  for ($i = 0; $i -lt 6 -and $parentId; $i++) {
    $parent = Get-CimInstance Win32_Process -Filter "ProcessId = $parentId" -ErrorAction SilentlyContinue

    if ($null -eq $parent) {
      return $false
    }

    if ($parent.CommandLine -like $rootPattern -or $parent.ExecutablePath -like $rootPattern) {
      return $true
    }

    $parentId = $parent.ParentProcessId
  }

  return $false
}

function Stop-ProjectPort {
  param([int]$Port)

  Write-Host "Checking port $Port..."

  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue

  foreach ($connection in $connections) {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $($connection.OwningProcess)" -ErrorAction SilentlyContinue

    if ($null -eq $process) {
      continue
    }

    if (Test-ProjectProcess $process) {
      Write-Host "Stopping PID $($process.ProcessId) on port $Port"
      Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
    } else {
      Write-Host "Leaving unrelated PID $($process.ProcessId) on port $Port running."
    }
  }
}

function Stop-ProjectProcesses {
  Write-Host "Stopping project processes..."

  Get-CimInstance Win32_Process |
    Where-Object { Test-ProjectProcess $_ } |
    Where-Object {
      $_.CommandLine -like "*uvicorn app.main:app*" -or
      $_.CommandLine -like "*tsx watch src/index.ts*" -or
      $_.CommandLine -like "*next dev*" -or
      $_.CommandLine -like "*pnpm.cmd dev*" -or
      $_.CommandLine -like "*pnpm dev*"
    } |
    ForEach-Object {
      Write-Host "Stopping PID $($_.ProcessId)"
      Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "Stopping dev servers..."

Stop-ProjectPort 3000
Stop-ProjectPort 3001
Stop-ProjectPort 4000
Stop-ProjectPort 5000

Stop-ProjectProcesses

Write-Host "Stopping Docker Compose services..."
Set-Location -LiteralPath $projectRoot
docker compose down

Write-Host "Done. Dev servers stopped."
