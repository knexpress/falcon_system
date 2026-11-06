@echo off
title Falcon Revive - First Time Setup
cd /d "%~dp0"
echo ============================================
echo  Falcon Revive - ONE TIME SETUP
echo  Frontend + Backend + Database on this PC
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js not found. Install from https://nodejs.org then restart.
  pause
  exit /b 1
)

where python >nul 2>nul
if errorlevel 1 (
  echo ERROR: Python not found. Install from https://www.python.org then restart.
  pause
  exit /b 1
)

echo [1/4] Installing backend packages...
cd /d "%~dp0backend"
call npm install
if errorlevel 1 goto fail

echo [2/4] Creating / seeding SQLite database...
call npm run seed
if errorlevel 1 goto fail

echo [3/4] Installing PDF library...
python -m pip install pypdf

echo [4/4] Installing frontend packages...
cd /d "%~dp0frontend"
call npm install
if errorlevel 1 goto fail

cd /d "%~dp0"
echo.
echo ============================================
echo  SETUP COMPLETE
echo  Next: double-click start-all.bat
echo  Then open Chrome: http://localhost:5173
echo  Full guide: SETUP.html
echo ============================================
pause
exit /b 0

:fail
echo.
echo SETUP FAILED. Open SETUP.html for troubleshooting.
pause
exit /b 1
