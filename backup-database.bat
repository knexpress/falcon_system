@echo off
title Falcon Revive - Backup Database
cd /d "%~dp0"

set "DB=%~dp0backend\data\garage.db"
set "OUT=%~dp0backups"

if not exist "%DB%" (
  echo No database found yet at:
  echo   %DB%
  echo Start the backend once so the database is created, then try again.
  pause
  exit /b 1
)

if not exist "%OUT%" mkdir "%OUT%"

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm-ss"') do set STAMP=%%i
set "DEST=%OUT%\garage-backup-%STAMP%.db"

copy /Y "%DB%" "%DEST%" >nul
if errorlevel 1 (
  echo Backup FAILED.
  pause
  exit /b 1
)

echo.
echo Database backed up successfully.
echo From: %DB%
echo To:   %DEST%
echo.
echo This file contains all invoices and past work from this laptop.
echo.
pause
