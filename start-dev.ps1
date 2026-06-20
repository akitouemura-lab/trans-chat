$ErrorActionPreference = "Stop"

$projectRoot = "D:\trans-chat"

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

function Stop-Port {
  param([int]$Port)

  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue

  foreach ($connection in $connections) {
    $processId = $connection.OwningProcess

    if ($processId -ne 0) {
      Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
  }
}

Wait-Docker

Write-Host "Stopping old dev servers..."
Stop-Port 3000
Stop-Port 3001
Stop-Port 4000
Stop-Port 5000

Write-Host "Starting PostgreSQL..."
Set-Location $projectRoot
docker compose up -d postgres

Write-Host "Starting translate-service..."
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy", "Bypass",
  "-Command",
  'cd "D:\trans-chat\translate-service"; .\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 5000'
)

Start-Sleep -Seconds 5

Write-Host "Starting chat-server..."
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy", "Bypass",
  "-Command",
  'cd "D:\trans-chat\chat-server"; pnpm.cmd dev'
)

Start-Sleep -Seconds 5

Write-Host "Starting frontend..."
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy", "Bypass",
  "-Command",
  'cd "D:\trans-chat\frontend"; pnpm.cmd dev'
)

Start-Sleep -Seconds 8

Start-Process "http://localhost:3000"

Write-Host "Done. Open http://localhost:3000"