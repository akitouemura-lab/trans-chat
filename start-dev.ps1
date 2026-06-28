$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path

function ConvertTo-PowerShellLiteral {
  param([Parameter(Mandatory = $true)][string]$Value)

  return "'" + ($Value -replace "'", "''") + "'"
}

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

function Stop-ProjectProcesses {
  Write-Host "Stopping old project dev servers..."

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

function Warn-OccupiedProjectPort {
  param([int]$Port)

  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue

  foreach ($connection in $connections) {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $($connection.OwningProcess)" -ErrorAction SilentlyContinue

    if ($null -eq $process) {
      continue
    }

    if (Test-ProjectProcess $process) {
      Write-Host "Stopping project process on port $Port (PID $($process.ProcessId))"
      Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
    } else {
      Write-Host "Port $Port is already in use by PID $($process.ProcessId); leaving unrelated process running."
    }
  }
}

function Wait-Docker {
  $dockerDesktop = "C:\Program Files\Docker\Docker\Docker Desktop.exe"

  if (Test-Path $dockerDesktop) {
    Start-Process $dockerDesktop -ErrorAction SilentlyContinue | Out-Null
  }

  Write-Host "Waiting for Docker Desktop..."

  for ($i = 0; $i -lt 60; $i++) {
    docker info *> $null

    if ($LASTEXITCODE -eq 0) {
      Write-Host "Docker is ready."
      return
    }

    Start-Sleep -Seconds 2
  }

  Write-Host "Docker Desktop is not ready. Please start Docker Desktop and run again."
  Read-Host "Press Enter to exit"
  exit 1
}

function Start-DevShell {
  param(
    [Parameter(Mandatory = $true)][string]$Title,
    [Parameter(Mandatory = $true)][string]$WorkingDirectory,
    [Parameter(Mandatory = $true)][string]$Command
  )

  $quotedDirectory = ConvertTo-PowerShellLiteral $WorkingDirectory
  $shellCommand = "Set-Location -LiteralPath $quotedDirectory; $Command"

  Write-Host "Starting $Title..."
  Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy", "Bypass",
    "-Command",
    $shellCommand
  )
}

Wait-Docker
Stop-ProjectProcesses
Warn-OccupiedProjectPort 3000
Warn-OccupiedProjectPort 3001
Warn-OccupiedProjectPort 4000
Warn-OccupiedProjectPort 5000

Write-Host "Starting PostgreSQL..."
Set-Location -LiteralPath $projectRoot
docker compose up -d postgres

$translateDir = Join-Path $projectRoot "translate-service"
$chatServerDir = Join-Path $projectRoot "chat-server"
$frontendDir = Join-Path $projectRoot "frontend"
$pythonExe = Join-Path $translateDir "venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $pythonExe)) {
  $pythonExe = "python"
}

Start-DevShell `
  -Title "translate-service" `
  -WorkingDirectory $translateDir `
  -Command ("& " + (ConvertTo-PowerShellLiteral $pythonExe) + " -m uvicorn app.main:app --reload --port 5000")

Start-Sleep -Seconds 5

Start-DevShell `
  -Title "chat-server" `
  -WorkingDirectory $chatServerDir `
  -Command "pnpm.cmd dev"

Start-Sleep -Seconds 5

Start-DevShell `
  -Title "frontend" `
  -WorkingDirectory $frontendDir `
  -Command "pnpm.cmd dev"

Start-Sleep -Seconds 8

Start-Process "http://localhost:3000"

Write-Host "Done. Open http://localhost:3000"
