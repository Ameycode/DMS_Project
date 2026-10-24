@echo off
set "PATH=C:\Users\yugan\nodejs\node-v20.18.0-win-x64;%PATH%"

echo ====================================================================
echo  VoltSlot - EV Charging Slot & Billing Management System (DBMS)
echo ====================================================================

echo [1/2] Starting Backend API Server (Port 5000)...
start "VoltSlot Backend" cmd /k "set "PATH=C:\Users\yugan\nodejs\node-v20.18.0-win-x64;%%PATH%%" && cd /d "%~dp0backend" && npm start"

timeout /t 3 /nobreak >nul

echo [2/2] Starting React Frontend (Port 3000)...
start "VoltSlot Frontend" cmd /k "set "PATH=C:\Users\yugan\nodejs\node-v20.18.0-win-x64;%%PATH%%" && cd /d "%~dp0frontend" && npm run dev"

echo.
echo ====================================================================
echo  Servers Launched!
echo  - Frontend Web UI:  http://localhost:3000
echo  - Backend REST API: http://localhost:5000
echo ====================================================================
echo.
