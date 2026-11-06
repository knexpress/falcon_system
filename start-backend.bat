@echo off
title Falcon Revive - Backend + Database
cd /d "%~dp0backend"
echo.
echo Starting Falcon Revive API on http://localhost:4000
echo Local database on THIS laptop: backend\data\garage.db
echo Past invoices stay saved here when you close and reopen.
echo Keep this window open.
echo.
npm start
pause
