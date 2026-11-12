@echo off
title FixMate - Production Server
cd /d "%~dp0"
echo ========================================================
echo                 FixMate Production Server
echo          Offline-First Personal Problem Solver
echo ========================================================
echo.
echo Initializing local SQLite database...
call npx.cmd prisma db push --skip-generate >nul 2>&1

echo.
echo Active Local IPv4: 10.210.244.81
echo   - PC Browser: http://localhost:3000
echo   - Phone:      http://10.210.244.81:3000
echo.
echo Launching your browser at http://localhost:3000...
start http://localhost:3000

echo.
echo Server running in optimized production mode...
echo (Press Ctrl+C to stop)
echo ========================================================
echo.
call npm.cmd start
pause
