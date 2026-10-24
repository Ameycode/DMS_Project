$env:PATH = "C:\Users\yugan\nodejs\node-v20.18.0-win-x64;$env:PATH"

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host " VoltSlot - EV Charging Slot & Billing Management System (DBMS)" -ForegroundColor Green
Write-Host "====================================================================" -ForegroundColor Cyan

Write-Host "`n[1/2] Starting Backend API Server (Port 5000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PATH = 'C:\Users\yugan\nodejs\node-v20.18.0-win-x64;' + `$env:PATH; Set-Location '$PSScriptRoot\backend'; npm start"

Start-Sleep -Seconds 3

Write-Host "[2/2] Starting React Frontend (Port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PATH = 'C:\Users\yugan\nodejs\node-v20.18.0-win-x64;' + `$env:PATH; Set-Location '$PSScriptRoot\frontend'; npm run dev"

Write-Host "`n====================================================================" -ForegroundColor Cyan
Write-Host " Servers Launched!" -ForegroundColor Green
Write-Host " - Frontend Web UI:  http://localhost:3000" -ForegroundColor White
Write-Host " - Backend REST API: http://localhost:5000" -ForegroundColor White
Write-Host "====================================================================" -ForegroundColor Cyan
