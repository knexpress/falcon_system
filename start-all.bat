@echo off
title Falcon Revive - Start All
cd /d "%~dp0"
echo Starting backend and frontend on this laptop...
start "Falcon Backend" "%~dp0start-backend.bat"
timeout /t 2 /nobreak >nul
start "Falcon Frontend" "%~dp0start-frontend.bat"
echo.
echo Both windows opened.
echo Open Chrome: http://localhost:5173
echo Setup guide: SETUP.html
echo.
pause
