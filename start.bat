@echo off
title Order Block Detector Launcher
color 0A

echo ========================================================
echo   STARTING ORDER BLOCK DETECTOR PLATFORM
echo ========================================================
echo.

echo [1/2] Launching Backend Server on port 5000...
start "Order Block Server" cmd /k "cd /d %~dp0server && npm install && npm run build && npm start"

timeout /t 3 /nobreak >nul

echo [2/2] Launching Frontend Client on port 5173...
start "Order Block Client" cmd /k "cd /d %~dp0client && npm install && npm run dev"

echo.
echo ========================================================
echo   ORDER BLOCK DETECTOR IS RUNNING!
echo ========================================================
echo   - Web & Mobile UI: http://localhost:5173
echo   - Backend REST API: http://localhost:5000/api
echo ========================================================
echo.
pause
