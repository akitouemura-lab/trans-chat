$ErrorActionPreference = "SilentlyContinue"

function Stop-Port {
  param([int]$Port)

  Write-Host "Stopping port $Port..."

  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue

  foreach ($connection in $connections) {
    $targetPid = $connection.OwningProcess

    if ($targetPid -ne 0) {
      Write-Host "Killing PID $targetPid on port $Port"
      Stop-Process -Id $targetPid -Force -ErrorAction SilentlyContinue
    }
  }
}

function Stop-ProjectProcesses {
  Write-Host "Stopping project processes..."

  Get-CimInstance Win32_Process |
    Where-Object {
      $_.CommandLine -like "*D:\trans-chat\translate-service*" -or
      $_.CommandLine -like "*uvicorn app.main:app*" -or
      $_.CommandLine -like "*D:\trans-chat\chat-server*" -or
      $_.CommandLine -like "*tsx watch src/index.ts*" -or
      $_.CommandLine -like "*D:\trans-chat\frontend*" -or
      $_.CommandLine -like "*next dev*"
    } |
    ForEach-Object {
      Write-Host "Killing PID $($_.ProcessId)"
      Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "Stopping dev servers..."

Stop-Port 3000
Stop-Port 3001
Stop-Port 4000
Stop-Port 5000

Stop-ProjectProcesses

Write-Host "Stopping PostgreSQL..."
Set-Location "D:\trans-chat"
docker compose down

Write-Host "Done. Dev servers stopped."