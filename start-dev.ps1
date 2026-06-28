$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path

function ConvertTo-PowerShellLiteral {
  param([Parameter(Mandatory = $true)][string]$Value)

  return "'" + ($Value -replace "'", "''") + "'"
}

function Get-LanHost {
  if ($env:LAN_HOST) {
    return $env:LAN_HOST
  }

  $privateAddress = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.IPAddress -notlike "127.*" -and
      $_.IPAddress -notlike "169.254.*" -and
      (
        $_.IPAddress -like "10.*" -or
        $_.IPAddress -like "192.168.*" -or
        $_.IPAddress -match "^172\.(1[6-9]|2[0-9]|3[0-1])\."
      ) -and
      $_.InterfaceAlias -notlike "*Loopback*" -and
      $_.InterfaceAlias -notlike "*vEthernet*" -and
      $_.InterfaceAlias -notlike "*Docker*" -and
      $_.InterfaceAlias -notlike "*WSL*"
    } |
    Sort-Object InterfaceMetric |
    Select-Object -First 1

  if ($privateAddress) {
    return $privateAddress.IPAddress
  }

  return "localhost"
}

function New-EnvCommand {
  param(
    [Parameter(Mandatory = $true)][hashtable]$Environment,
    [Parameter(Mandatory = $true)][string]$Command
  )

  $assignments = foreach ($key in $Environment.Keys) {
    '$env:' + $key + '=' + (ConvertTo-PowerShellLiteral ([string]$Environment[$key]))
  }

  return (($assignments + $Command) -join "; ")
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
$lanHost = Get-LanHost
$chatServerUrl = if ($env:NEXT_PUBLIC_CHAT_SERVER_URL) {
  $env:NEXT_PUBLIC_CHAT_SERVER_URL
} elseif ($lanHost -ne "localhost") {
  "http://" + $lanHost + ":4000"
} else {
  "http://localhost:4000"
}
$clientOrigin = if ($env:CLIENT_ORIGIN) {
  $env:CLIENT_ORIGIN
} elseif ($lanHost -ne "localhost") {
  "http://localhost:3000,http://127.0.0.1:3000,http://" + $lanHost + ":3000"
} else {
  "http://localhost:3000,http://127.0.0.1:3000"
}

if (-not (Test-Path -LiteralPath $pythonExe)) {
  $pythonExe = "python"
}

Write-Host "Frontend URL on this PC: http://localhost:3000"
if ($lanHost -ne "localhost") {
  Write-Host "Frontend URL on the same LAN: http://$lanHost`:3000"
}
Write-Host "Chat server URL used by frontend: $chatServerUrl"

Start-DevShell `
  -Title "translate-service" `
  -WorkingDirectory $translateDir `
  -Command ("& " + (ConvertTo-PowerShellLiteral $pythonExe) + " -m uvicorn app.main:app --reload --port 5000")

Start-Sleep -Seconds 5

Start-DevShell `
  -Title "chat-server" `
  -WorkingDirectory $chatServerDir `
  -Command (New-EnvCommand @{
    LAN_HOST = $lanHost
    CLIENT_ORIGIN = $clientOrigin
  } "pnpm.cmd dev")

Start-Sleep -Seconds 5

Start-DevShell `
  -Title "frontend" `
  -WorkingDirectory $frontendDir `
  -Command (New-EnvCommand @{
    NEXT_PUBLIC_CHAT_SERVER_URL = $chatServerUrl
  } "pnpm.cmd dev --hostname 0.0.0.0")

Start-Sleep -Seconds 8

Start-Process "http://localhost:3000"

Write-Host "Done. Open http://localhost:3000"
if ($lanHost -ne "localhost") {
  Write-Host "From another device on the same LAN, open http://$lanHost`:3000"
}
