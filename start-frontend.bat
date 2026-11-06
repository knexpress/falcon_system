@echo off
title Falcon Revive - Frontend
cd /d "%~dp0frontend"
echo.
echo Starting Falcon Revive website on http://localhost:5173
echo Keep this window open.
echo.
npm run dev
pause
